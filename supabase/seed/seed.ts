import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!url || !key) throw new Error('Missing env for seed')

const supabase = createClient(url, key)

async function upsertIngredient(name: string, tags: string[]) {
  const { data, error } = await supabase
    .from('ingredients')
    .upsert({ name, tags }, { onConflict: 'name' })
    .select()
  if (error) throw error
  return data![0]
}

async function upsertRecipe(title: string, default_servings: number, parts: Array<{category:string, name:string, amount:number}>){
  // upsert recipe
  const { data: rdata, error: rerr } = await supabase.from('recipes').upsert({ title, default_servings }, { onConflict: 'title' }).select()
  if (rerr) throw rerr
  const recipe = rdata![0]

  // ensure ingredients exist and link
  for (const p of parts) {
    const ingr = await upsertIngredient(p.name, [])
    // insert or update recipe_ingredients
    const { error } = await supabase.from('recipe_ingredients').upsert({ recipe_id: recipe.id, ingredient_id: ingr.id, amount_g: p.amount, unit: 'g', category: p.category }, { onConflict: 'recipe_id,ingredient_id,category' })
    if (error) throw error
  }
}

async function main(){
  // seed ingredients with tags
  const main = [
    'Oats','Milk','Banana','Eggs','Bread','Chicken breast','Beef','Salmon','Rice','Pasta','Potatoes','Carrot','Onion','Garlic','Tomato','Cucumber','Lettuce','Bell pepper','Mushrooms','Broccoli','Yogurt','Cheese','Butter'
  ]
  const sauce = ['Olive oil','Tomato paste','Soy sauce','Chicken broth','Lemon juice','Honey']
  const spice = ['Salt','Black pepper','Paprika','Oregano','Basil','Bay leaf','Curry powder','Cinnamon']

  // multi-tags
  const multi = { 'Olive oil': ['sauce','main'], 'Garlic': ['main','spice'] }

  for (const n of main) await upsertIngredient(n, ['main'])
  for (const n of sauce) await upsertIngredient(n, ['sauce'])
  for (const n of spice) await upsertIngredient(n, ['spice'])
  for (const k of Object.keys(multi)) await upsertIngredient(k, multi[k as keyof typeof multi])

  // Recipes
  await upsertRecipe('Oatmeal with Banana', 2, [
    {category:'main', name:'Oats', amount:120},
    {category:'main', name:'Milk', amount:400},
    {category:'main', name:'Banana', amount:200},
    {category:'sauce', name:'Honey', amount:20},
    {category:'spice', name:'Cinnamon', amount:2},
    {category:'spice', name:'Salt', amount:1}
  ])

  await upsertRecipe('Scrambled Eggs on Toast', 2, [
    {category:'main', name:'Eggs', amount:240},
    {category:'main', name:'Bread', amount:120},
    {category:'sauce', name:'Butter', amount:20},
    {category:'spice', name:'Salt', amount:2},
    {category:'spice', name:'Black pepper', amount:1}
  ])

  await upsertRecipe('Chicken Rice Bowl', 2, [
    {category:'main', name:'Chicken breast', amount:300},
    {category:'main', name:'Rice', amount:160},
    {category:'main', name:'Carrot', amount:120},
    {category:'main', name:'Onion', amount:80},
    {category:'sauce', name:'Soy sauce', amount:30},
    {category:'sauce', name:'Olive oil', amount:20},
    {category:'spice', name:'Salt', amount:3},
    {category:'spice', name:'Black pepper', amount:1},
    {category:'spice', name:'Paprika', amount:2}
  ])

  await upsertRecipe('Beef Stew', 2, [
    {category:'main', name:'Beef', amount:350},
    {category:'main', name:'Potatoes', amount:400},
    {category:'main', name:'Carrot', amount:150},
    {category:'main', name:'Onion', amount:100},
    {category:'main', name:'Garlic', amount:10},
    {category:'sauce', name:'Tomato paste', amount:40},
    {category:'sauce', name:'Chicken broth', amount:500},
    {category:'sauce', name:'Olive oil', amount:20},
    {category:'spice', name:'Salt', amount:4},
    {category:'spice', name:'Black pepper', amount:2},
    {category:'spice', name:'Bay leaf', amount:1},
    {category:'spice', name:'Paprika', amount:2}
  ])

  await upsertRecipe('Salmon Lemon Pasta', 2, [
    {category:'main', name:'Pasta', amount:180},
    {category:'main', name:'Salmon', amount:250},
    {category:'main', name:'Garlic', amount:8},
    {category:'main', name:'Tomato', amount:150},
    {category:'sauce', name:'Lemon juice', amount:25},
    {category:'sauce', name:'Olive oil', amount:20},
    {category:'spice', name:'Salt', amount:3},
    {category:'spice', name:'Black pepper', amount:1},
    {category:'spice', name:'Oregano', amount:2},
    {category:'spice', name:'Basil', amount:2}
  ])

  console.log('Seed complete')
}

main().catch((e)=>{ console.error(e); process.exit(1) })
