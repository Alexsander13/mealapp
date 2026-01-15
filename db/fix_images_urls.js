#!/usr/bin/env node

/**
 * Обновляет URL фото на рабочие placeholder'ы
 */

const { Client } = require('pg');

const dbConfig = {
  host: 'db.nwigkuihnbekkstqsyue.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '?!Zbx8DLvxJH$6w',
  ssl: { rejectUnauthorized: false }
};

// Маппинг ключевых слов на категории для picsum.photos
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
  
  // Используем Unsplash Source API с ключевыми словами для релевантных фото
  // Добавляем sig параметр для стабильности (одно название = одно фото)
  return `https://source.unsplash.com/800x600/?${category},food&sig=${hash}`;
}

async function updateImages() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Подключение к базе...');
    await client.connect();
    console.log('✅ Подключено!\n');

    // Получаем все рецепты
    const result = await client.query(`
      SELECT id, name 
      FROM v2_recipes 
      ORDER BY id
    `);

    console.log(`📸 Обновляем URL для ${result.rows.length} рецептов...\n`);

    const BATCH_SIZE = 1000;
    let updated = 0;

    for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
      const batch = result.rows.slice(i, i + BATCH_SIZE);
      
      // Генерируем VALUES для массового UPDATE
      const values = batch.map((recipe, idx) => {
        const imageUrl = generateImageUrl(recipe.name);
        const paramOffset = idx * 2;
        return `(${recipe.id}, '${imageUrl.replace(/'/g, "''")}'::text)`;
      }).join(',\n      ');

      const updateQuery = `
        UPDATE v2_recipes AS r
        SET image_url = v.image_url
        FROM (VALUES
          ${values}
        ) AS v(id, image_url)
        WHERE r.id = v.id::bigint
      `;

      await client.query(updateQuery);
      updated += batch.length;
      
      const progress = ((updated / result.rows.length) * 100).toFixed(1);
      console.log(`  ✓ ${updated}/${result.rows.length} (${progress}%)`);
    }

    console.log(`\n✅ Готово! Обновлено ${updated} рецептов`);

    // Проверка
    const check = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(image_url) as with_images
      FROM v2_recipes
    `);
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего рецептов: ${check.rows[0].total}`);
    console.log(`   С фото: ${check.rows[0].with_images}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Показываем примеры URL
console.log('Примеры URL которые будут сгенерированы:');
const testRecipes = [
  'Салат Цезарь',
  'Борщ украинский',
  'Торт Наполеон',
  'Куриные котлеты',
  'Пицца Маргарита'
];

testRecipes.forEach(name => {
  console.log(`  ${name}: ${generateImageUrl(name)}`);
});
console.log('\n');

updateImages();
