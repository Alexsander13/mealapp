#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: 'db.nwigkuihnbekkstqsyue.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '?!Zbx8DLvxJH$6w',
  ssl: { rejectUnauthorized: false }
};

// Словарь перевода для поиска релевантных фото
const TRANSLATIONS = {
  'салат': 'salad', 'цезарь': 'caesar', 'греческий': 'greek', 'оливье': 'olivier',
  'суп': 'soup', 'борщ': 'borscht', 'щи': 'cabbage soup', 'солянка': 'solyanka meat soup', 
  'уха': 'fish soup', 'харчо': 'kharcho', 'рамен': 'ramen',
  'торт': 'cake', 'наполеон': 'napoleon cake', 'медовик': 'honey cake', 'тирамису': 'tiramisu',
  'пирог': 'pie', 'шарлотка': 'apple pie', 'печенье': 'cookies',
  'курица': 'chicken', 'цыпленок': 'chicken', 'говядина': 'beef', 'свинина': 'pork',
  'рыба': 'fish', 'лосось': 'salmon', 'семга': 'salmon', 'форель': 'trout',
  'котлеты': 'cutlets', 'тефтели': 'meatballs', 'блины': 'pancakes', 'сырники': 'syrniki',
  'пицца': 'pizza', 'маргарита': 'margherita', 'паста': 'pasta', 'спагетти': 'spaghetti',
  'карбонара': 'carbonara', 'лазанья': 'lasagna', 'ризотто': 'risotto',
  'запеканка': 'casserole', 'шашлык': 'shashlik kebab', 'плов': 'pilaf', 'каша': 'porridge',
  'пельмени': 'pelmeni', 'вареники': 'vareniki', 'манты': 'manti', 'хинкали': 'khinkali',
  'мороженое': 'ice cream', 'хлеб': 'bread', 'кекс': 'cupcake', 'маффин': 'muffin',
  'пончик': 'donut', 'круассан': 'croissant', 'сыр': 'cheese',
  'морепродукты': 'seafood', 'креветки': 'shrimp', 'мидии': 'mussels', 'краб': 'crab',
  'омлет': 'omelette', 'яичница': 'fried eggs', 'бургер': 'burger', 'стейк': 'steak',
  'гуляш': 'goulash', 'рагу': 'stew', 'картофель': 'potato', 'пюре': 'mashed potato',
  'овощи': 'vegetables', 'грибы': 'mushrooms', 'коктейль': 'cocktail', 'смузи': 'smoothie',
  'шоколад': 'chocolate', 'вафли': 'waffles', 'пудинг': 'pudding', 'макарон': 'macaron',
  'брауни': 'brownie', 'колбаса': 'sausage', 'ветчина': 'ham', 'бекон': 'bacon',
  'фаршированный': 'stuffed', 'жареный': 'fried', 'запеченный': 'baked',
  'тушеный': 'stewed', 'вареный': 'boiled', 'гриль': 'grilled'
};

function translateRecipeName(recipeName) {
  const nameLower = recipeName.toLowerCase();
  const words = [];
  
  // Ищем все совпадения в названии
  for (const [rus, eng] of Object.entries(TRANSLATIONS)) {
    if (nameLower.includes(rus)) {
      words.push(eng);
    }
  }
  
  // Если нашли переводы - используем их
  if (words.length > 0) {
    return words.slice(0, 3).join(' '); // Максимум 3 слова для запроса
  }
  
  // Если не нашли - используем общий запрос "food"
  return 'food meal';
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateImageUrl(recipeName) {
  const searchTerm = translateRecipeName(recipeName);
  const hash = hashCode(recipeName);
  
  // Используем Unsplash Source для поиска по запросу
  // Добавляем sig для стабильности (одно название = одно фото)
  const encodedSearch = encodeURIComponent(searchTerm);
  return `https://source.unsplash.com/800x600/?${encodedSearch}&sig=${hash}`;
}

async function updateImages() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Подключение к базе...');
    await client.connect();
    console.log('✅ Подключено!\n');

    const result = await client.query('SELECT id, name FROM v2_recipes ORDER BY id');
    console.log(`📸 Обновляем URL для ${result.rows.length} рецептов...\n`);

    const BATCH_SIZE = 1000;
    let updated = 0;

    for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
      const batch = result.rows.slice(i, i + BATCH_SIZE);
      
      const values = batch.map((recipe) => {
        const imageUrl = generateImageUrl(recipe.name);
        return `(${recipe.id}, '${imageUrl.replace(/'/g, "''")}'::text)`;
      }).join(',\n      ');

      const updateQuery = `
        UPDATE v2_recipes AS r
        SET image_url = v.image_url
        FROM (VALUES ${values}) AS v(id, image_url)
        WHERE r.id = v.id::bigint
      `;

      await client.query(updateQuery);
      updated += batch.length;
      
      const progress = ((updated / result.rows.length) * 100).toFixed(1);
      console.log(`  ✓ ${updated}/${result.rows.length} (${progress}%)`);
    }

    console.log(`\n✅ Готово! Обновлено ${updated} рецептов`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('Примеры URL с переводом:');
const examples = [
  'Салат Цезарь',
  'Борщ украинский',
  'Солянка с колбасой',
  'Торт Наполеон',
  'Куриные котлеты',
  'Пицца Маргарита',
  'Паста Карбонара',
  'Шашлык из свинины'
];

examples.forEach(name => {
  const translated = translateRecipeName(name);
  const url = generateImageUrl(name);
  console.log(`  ${name} → "${translated}"`);
  console.log(`    ${url}\n`);
});

updateImages();
