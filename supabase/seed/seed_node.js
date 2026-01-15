const fs = require('fs')
const path = require('path')

function loadEnv() {
  const p = path.resolve(__dirname, '../../.env.local')
  if (!fs.existsSync(p)) return {}
  const lines = fs.readFileSync(p, 'utf8').split(/\n/)
    .map(l=>l.trim())
    .filter(l=>l && !l.startsWith('#'))
  const out = {}
  for(const l of lines){
    const idx = l.indexOf('=')
    if (idx>0){
      const k = l.slice(0,idx).trim()
      const v = l.slice(idx+1).trim()
      out[k]=v
    }
  }
  return out
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

console.log('Loaded env:', { url: SUPABASE_URL ? 'SET' : 'MISSING', key: SUPABASE_KEY ? 'SET (length=' + SUPABASE_KEY.length + ')' : 'MISSING' })

if (!SUPABASE_URL || !SUPABASE_KEY){
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error('Expected .env.local at:', path.resolve(__dirname, '../../.env.local'))
  process.exit(1)
}

const rest = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1'

async function request(path, opts={}){
  const url = rest + path
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  }
  console.log('Request:', url, 'Headers apikey length:', headers.apikey ? headers.apikey.length : 'MISSING')
  
  const fetchOpts = {
    method: opts.method || 'GET',
    headers: headers
  }
  if (opts.body) {
    fetchOpts.body = opts.body
  }
  
  const res = await fetch(url, fetchOpts)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch(e) { json = text }
  if (!res.ok) {
    const err = new Error('HTTP '+res.status+' '+res.statusText+' - '+text)
    err.status = res.status
    err.body = json
    throw err
  }
  return json
}

async function getOne(table, q){
  const qs = Object.keys(q).map(k=>`${encodeURIComponent(k)}=eq.${encodeURIComponent(q[k])}`).join('&')
  const rows = await request(`/${table}?${qs}&select=*`)
  return rows && rows[0]
}

async function insert(table, obj){
  const res = await request(`/${table}`, { method:'POST', body: JSON.stringify(obj), headers: {'Prefer':'return=representation'} })
  return Array.isArray(res) ? res[0] : res
}

async function update(table, q, obj){
  const qs = Object.keys(q).map(k=>`${encodeURIComponent(k)}=eq.${encodeURIComponent(q[k])}`).join('&')
  const res = await request(`/${table}?${qs}`, { method:'PATCH', body: JSON.stringify(obj), headers: {'Prefer':'return=representation'} })
  return res
}

async function seed(){
  console.log('Starting seed...')

  const main = [
    'Oats','Milk','Banana','Eggs','Bread','Chicken breast','Beef','Salmon','Rice','Pasta','Potatoes','Carrot','Onion','Garlic','Tomato','Cucumber','Lettuce','Bell pepper','Mushrooms','Broccoli','Yogurt','Cheese','Butter',
    'Shrimp','Tofu','Ground beef','Bacon','Sausage','Tuna','Spinach','Avocado','Beans','Chickpeas','Lentils','Corn','Zucchini','Eggplant','Cauliflower','Green beans','Peas','Apple','Strawberries','Blueberries','Mango','Pineapple','Nuts','Almonds','Peanut butter','Cream','Flour','Sugar','Chocolate chips','Feta cheese','Mozzarella','Parmesan','Cheddar cheese','Couscous','Quinoa','Noodles','Pork','Chicken thighs','Turkey','Ham','White fish','Cottage cheese','Sour cream'
  ]
  const sauce = ['Olive oil','Tomato paste','Soy sauce','Chicken broth','Lemon juice','Honey','Balsamic vinegar','Worcestershire sauce','Hot sauce','Mustard','Mayonnaise','Ketchup','BBQ sauce','Pesto','Coconut milk','Fish sauce','Sesame oil','Maple syrup','Teriyaki sauce','Ranch dressing']
  const spice = ['Salt','Black pepper','Paprika','Oregano','Basil','Bay leaf','Curry powder','Cinnamon','Cumin','Chili powder','Garlic powder','Onion powder','Thyme','Rosemary','Ginger','Turmeric','Red pepper flakes','Dill','Parsley','Coriander','Nutmeg','Vanilla extract']

  const multi = { 'Olive oil': ['sauce','main'], 'Garlic': ['main','spice'], 'Ginger': ['main','spice'], 'Parsley': ['main','spice'] }

  // upsert ingredients
  for (const n of main){
    const existing = await getOne('ingredients', { name: n }).catch(()=>null)
    if (existing) continue
    await insert('ingredients', { name: n, tags: ['main'] })
    console.log('Inserted ingredient', n)
  }
  for (const n of sauce){
    const existing = await getOne('ingredients', { name: n }).catch(()=>null)
    if (existing) continue
    await insert('ingredients', { name: n, tags: ['sauce'] })
    console.log('Inserted ingredient', n)
  }
  for (const n of spice){
    const existing = await getOne('ingredients', { name: n }).catch(()=>null)
    if (existing) continue
    await insert('ingredients', { name: n, tags: ['spice'] })
    console.log('Inserted ingredient', n)
  }
  for (const k of Object.keys(multi)){
    const existing = await getOne('ingredients', { name: k }).catch(()=>null)
    if (existing) {
      await update('ingredients', { id: existing.id }, { tags: multi[k] })
      continue
    }
    await insert('ingredients', { name: k, tags: multi[k] })
    console.log('Inserted multi-tag', k)
  }

  // recipes and recipe_ingredients
  const recipes = [
    { title: 'Oatmeal with Banana', image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400', parts: [ ['main','Oats',120], ['main','Milk',400], ['main','Banana',200], ['sauce','Honey',20], ['spice','Cinnamon',2], ['spice','Salt',1] ] },
    { title: 'Scrambled Eggs on Toast', image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400', parts: [ ['main','Eggs',240], ['main','Bread',120], ['sauce','Butter',20], ['spice','Salt',2], ['spice','Black pepper',1] ] },
    { title: 'Chicken Rice Bowl', image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', parts: [ ['main','Chicken breast',300], ['main','Rice',160], ['main','Carrot',120], ['main','Onion',80], ['sauce','Soy sauce',30], ['sauce','Olive oil',20], ['spice','Salt',3], ['spice','Black pepper',1], ['spice','Paprika',2] ] },
    { title: 'Beef Stew', image_url: 'https://images.unsplash.com/photo-1625937289178-a3b98cd8e85f?w=400', parts: [ ['main','Beef',350], ['main','Potatoes',400], ['main','Carrot',150], ['main','Onion',100], ['main','Garlic',10], ['sauce','Tomato paste',40], ['sauce','Chicken broth',500], ['sauce','Olive oil',20], ['spice','Salt',4], ['spice','Black pepper',2], ['spice','Bay leaf',1], ['spice','Paprika',2] ] },
    { title: 'Salmon Lemon Pasta', image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', parts: [ ['main','Pasta',180], ['main','Salmon',250], ['main','Garlic',8], ['main','Tomato',150], ['sauce','Lemon juice',25], ['sauce','Olive oil',20], ['spice','Salt',3], ['spice','Black pepper',1], ['spice','Oregano',2], ['spice','Basil',2] ] },
    
    // Breakfast/Snack options (15-30 min)
    { title: 'Greek Yogurt Bowl', image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', parts: [ ['main','Yogurt',300], ['main','Banana',150], ['main','Strawberries',100], ['main','Nuts',30], ['sauce','Honey',15] ] },
    { title: 'Avocado Toast', image_url: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400', parts: [ ['main','Bread',120], ['main','Avocado',150], ['main','Eggs',120], ['sauce','Olive oil',10], ['spice','Salt',2], ['spice','Black pepper',1], ['spice','Red pepper flakes',1] ] },
    { title: 'Pancakes', image_url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400', parts: [ ['main','Flour',200], ['main','Milk',250], ['main','Eggs',120], ['main','Sugar',30], ['sauce','Butter',20], ['sauce','Maple syrup',40], ['spice','Cinnamon',2], ['spice','Vanilla extract',5] ] },
    { title: 'Cheese Omelette', image_url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400', parts: [ ['main','Eggs',180], ['main','Cheese',80], ['main','Mushrooms',80], ['sauce','Butter',15], ['spice','Salt',2], ['spice','Black pepper',1], ['spice','Parsley',5] ] },
    { title: 'Peanut Butter Banana Smoothie', image_url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400', parts: [ ['main','Banana',200], ['main','Milk',300], ['main','Peanut butter',40], ['main','Yogurt',100], ['sauce','Honey',20], ['spice','Cinnamon',1] ] },
    
    // Lunch/Dinner options (20-45 min)
    { title: 'Chicken Stir-Fry', image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', parts: [ ['main','Chicken breast',300], ['main','Bell pepper',150], ['main','Broccoli',150], ['main','Onion',80], ['main','Garlic',10], ['sauce','Soy sauce',40], ['sauce','Sesame oil',10], ['sauce','Honey',15], ['spice','Ginger',8], ['spice','Black pepper',1] ] },
    { title: 'Spaghetti Bolognese', image_url: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400', parts: [ ['main','Pasta',200], ['main','Ground beef',300], ['main','Tomato',200], ['main','Onion',80], ['main','Garlic',10], ['sauce','Tomato paste',30], ['sauce','Olive oil',20], ['spice','Salt',3], ['spice','Oregano',2], ['spice','Basil',2] ] },
    { title: 'Shrimp Tacos', image_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400', parts: [ ['main','Shrimp',300], ['main','Lettuce',100], ['main','Tomato',100], ['main','Avocado',120], ['main','Cheese',60], ['sauce','Lime juice',20], ['sauce','Sour cream',40], ['spice','Cumin',2], ['spice','Chili powder',2], ['spice','Salt',2] ] },
    { title: 'Caesar Salad with Chicken', image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', parts: [ ['main','Chicken breast',250], ['main','Lettuce',200], ['main','Bread',80], ['main','Parmesan',50], ['sauce','Olive oil',20], ['sauce','Lemon juice',15], ['sauce','Mayonnaise',30], ['spice','Garlic powder',2], ['spice','Salt',2], ['spice','Black pepper',1] ] },
    { title: 'Fried Rice', image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', parts: [ ['main','Rice',200], ['main','Eggs',120], ['main','Peas',80], ['main','Carrot',80], ['main','Onion',60], ['sauce','Soy sauce',30], ['sauce','Sesame oil',10], ['spice','Garlic',8], ['spice','Ginger',5], ['spice','Black pepper',1] ] },
    { title: 'Baked Salmon with Veggies', image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', parts: [ ['main','Salmon',280], ['main','Broccoli',150], ['main','Cauliflower',150], ['sauce','Olive oil',20], ['sauce','Lemon juice',20], ['spice','Salt',3], ['spice','Black pepper',2], ['spice','Dill',3], ['spice','Garlic powder',2] ] },
    { title: 'Chicken Quesadilla', image_url: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400', parts: [ ['main','Chicken breast',200], ['main','Cheese',120], ['main','Bell pepper',100], ['main','Onion',60], ['sauce','Sour cream',40], ['sauce','Olive oil',15], ['spice','Cumin',2], ['spice','Paprika',2], ['spice','Salt',2] ] },
    { title: 'Thai Curry', image_url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', parts: [ ['main','Chicken thighs',300], ['main','Bell pepper',120], ['main','Onion',80], ['main','Broccoli',100], ['sauce','Coconut milk',250], ['sauce','Fish sauce',20], ['spice','Curry powder',15], ['spice','Garlic',10], ['spice','Ginger',8], ['spice','Basil',5] ] },
    { title: 'Beef Tacos', image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400', parts: [ ['main','Ground beef',300], ['main','Lettuce',100], ['main','Tomato',100], ['main','Cheese',80], ['main','Avocado',100], ['sauce','Sour cream',40], ['spice','Cumin',3], ['spice','Chili powder',3], ['spice','Salt',2], ['spice','Garlic powder',2] ] },
    { title: 'Tuna Salad', image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', parts: [ ['main','Tuna',200], ['main','Lettuce',150], ['main','Cucumber',100], ['main','Tomato',100], ['main','Eggs',120], ['sauce','Olive oil',20], ['sauce','Lemon juice',15], ['spice','Salt',2], ['spice','Black pepper',1], ['spice','Parsley',5] ] },
    { title: 'Chicken Teriyaki', image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400', parts: [ ['main','Chicken breast',300], ['main','Rice',160], ['main','Broccoli',120], ['sauce','Teriyaki sauce',50], ['sauce','Sesame oil',10], ['spice','Garlic',8], ['spice','Ginger',6], ['spice','Black pepper',1] ] },
    { title: 'Veggie Pasta', image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', parts: [ ['main','Pasta',200], ['main','Zucchini',150], ['main','Bell pepper',120], ['main','Tomato',150], ['main','Spinach',80], ['sauce','Olive oil',25], ['sauce','Pesto',30], ['spice','Garlic',10], ['spice','Salt',3], ['spice','Basil',3] ] }
  ]

  for (const r of recipes){
    let rec = await getOne('recipes', { title: r.title }).catch(()=>null)
    if (!rec){
      rec = await insert('recipes', { title: r.title, default_servings: 2, image_url: r.image_url })
      console.log('Inserted recipe', r.title)
    } else if (r.image_url && rec.image_url !== r.image_url) {
      await update('recipes', { id: rec.id }, { image_url: r.image_url })
      console.log('Updated image for', r.title)
    }
    // link ingredients
    for (const p of r.parts){
      const category = p[0], name = p[1], amount = p[2]
      const ingr = await getOne('ingredients', { name }).catch(()=>null)
      if (!ingr){ console.warn('Missing ingredient', name); continue }
      const existingRI = await request(`/recipe_ingredients?recipe_id=eq.${rec.id}&ingredient_id=eq.${ingr.id}&select=*`).catch(()=>null)
      if (Array.isArray(existingRI) && existingRI.length>0){
        // update amount
        await update('recipe_ingredients', { id: existingRI[0].id }, { amount_g: amount, unit: 'g', category })
      } else {
        await insert('recipe_ingredients', { recipe_id: rec.id, ingredient_id: ingr.id, amount_g: amount, unit: 'g', category })
      }
    }
  }

  console.log('Seed complete')
}

seed().catch(e=>{ console.error('Seed failed', e); process.exit(1) })
