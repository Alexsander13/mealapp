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

const FOOD_CATEGORIES = {
  'салат': 'salad',
  'суп': 'soup',
  'борщ': 'soup',
  'торт': 'dessert',
  'пирог': 'pie',
  'печенье': 'cookies',
  'курица': 'chicken',
  'говядина': 'meat',
  'свинина': 'meat',
  'рыба': 'fish',
  'котлеты': 'meat',
  'блины': 'pancakes',
  'пицца': 'pizza',
  'паста': 'pasta',
  'запеканка': 'casserole',
  'шашлык': 'grill',
  'плов': 'rice',
  'каша': 'porridge',
  'пельмени': 'dumplings',
  'вареники': 'dumplings',
  'десерт': 'dessert',
  'мороженое': 'icecream',
  'хлеб': 'bread',
  'кекс': 'cupcake',
  'сыр': 'cheese',
  'морепродукты': 'seafood',
  'креветки': 'seafood',
  'лосось': 'fish',
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getCategory(recipeName) {
  const nameLower = recipeName.toLowerCase();
  for (const [keyword, category] of Object.entries(FOOD_CATEGORIES)) {
    if (nameLower.includes(keyword)) {
      return category;
    }
  }
  return 'food';
}

function generateImageUrl(recipeName) {
  const hash = hashCode(recipeName);
  const category = getCategory(recipeName);
  
  // Используем Lorem Flickr - стабильный бесплатный сервис с реальными фото еды
  // Добавляем hash в URL для уникальности, но стабильности (один рецепт = одно фото)
  return `https://loremflickr.com/800/600/${category},food?random=${hash}`;
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

console.log('Примеры URL:');
console.log('  Салат Цезарь:', generateImageUrl('Салат Цезарь'));
console.log('  Борщ:', generateImageUrl('Борщ'));
console.log('  Торт:', generateImageUrl('Торт'));
console.log('  Куриные котлеты:', generateImageUrl('Куриные котлеты'));
console.log('  Пицца:', generateImageUrl('Пицца'));
console.log('\nПроверьте, что эти URL открываются в браузере перед запуском!\n');

updateImages();
