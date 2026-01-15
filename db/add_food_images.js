#!/usr/bin/env node

/**
 * Добавляет релевантные фото к рецептам используя Unsplash Source
 * Фото подбираются по ключевым словам из названия рецепта
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

const BATCH_SIZE = 500;

// Маппинг распространенных русских ингредиентов/блюд на английские термины
const FOOD_TRANSLATIONS = {
  'салат': 'salad',
  'суп': 'soup',
  'борщ': 'borscht',
  'торт': 'cake',
  'пирог': 'pie',
  'печенье': 'cookies',
  'курица': 'chicken',
  'говядина': 'beef',
  'свинина': 'pork',
  'рыба': 'fish',
  'котлеты': 'cutlets',
  'блины': 'pancakes',
  'пицца': 'pizza',
  'паста': 'pasta',
  'ризотто': 'risotto',
  'запеканка': 'casserole',
  'рулет': 'roll',
  'шашлык': 'kebab',
  'плов': 'pilaf',
  'каша': 'porridge',
  'оладьи': 'fritters',
  'пельмени': 'dumplings',
  'вареники': 'dumplings',
  'десерт': 'dessert',
  'коктейль': 'cocktail',
  'смузи': 'smoothie',
  'мороженое': 'icecream',
  'хлеб': 'bread',
  'булочки': 'buns',
  'кекс': 'cupcake',
  'маффины': 'muffins',
  'пончики': 'donuts',
  'вафли': 'waffles',
  'сырники': 'cheesecakes',
  'грибы': 'mushrooms',
  'овощи': 'vegetables',
  'фрукты': 'fruits',
  'ягоды': 'berries',
  'клубника': 'strawberry',
  'яблоко': 'apple',
  'банан': 'banana',
  'апельсин': 'orange',
  'лимон': 'lemon',
  'шоколад': 'chocolate',
  'сыр': 'cheese',
  'морепродукты': 'seafood',
  'креветки': 'shrimp',
  'мидии': 'mussels',
  'лосось': 'salmon',
  'тунец': 'tuna'
};

function getSearchTerm(recipeName) {
  const nameLower = recipeName.toLowerCase();
  
  // Ищем ключевые слова
  for (const [rus, eng] of Object.entries(FOOD_TRANSLATIONS)) {
    if (nameLower.includes(rus)) {
      return eng;
    }
  }
  
  // Если не нашли, берем первое слово + "food"
  const firstWord = recipeName.split(/[\s,"«»]+/)[0];
  return 'food';
}

function generateUnsplashUrl(recipeName, seed) {
  const searchTerm = getSearchTerm(recipeName);
  // Используем seed для стабильности (одинаковые рецепты = одинаковые фото)
  const hash = Math.abs(hashCode(recipeName));
  return `https://images.unsplash.com/photo-${1500000000000 + (hash % 100000000000)}?w=800&h=600&fit=crop&q=80`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

async function addImages() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Подключение...');
    await client.connect();
    console.log('✅ Подключено!\n');

    // Сначала обновляем ВСЕ рецепты (обнуляем старые случайные фото)
    console.log('🔄 Обнуление старых фото...');
    await client.query('UPDATE v2_recipes SET image_url = NULL');
    
    // Получаем все рецепты
    const result = await client.query(`
      SELECT id, name 
      FROM v2_recipes 
      ORDER BY id
    `);

    console.log(`📸 Обрабатываем ${result.rows.length} рецептов\n`);

    let batch = [];
    let updated = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const recipe = result.rows[i];
      const imageUrl = generateUnsplashUrl(recipe.name, recipe.id);
      
      batch.push({ id: recipe.id, imageUrl });

      if (batch.length >= BATCH_SIZE || i === result.rows.length - 1) {
        // Массовое обновление
        const values = batch.map((_, idx) => {
          const offset = idx * 2;
          return `($${offset + 1}, $${offset + 2})`;
        }).join(',');

        const params = [];
        batch.forEach(item => {
          params.push(item.imageUrl, item.id);
        });

        await client.query(`
          UPDATE v2_recipes
          SET image_url = updates.url
          FROM (VALUES ${values}) AS updates(url, id)
          WHERE v2_recipes.id = updates.id::bigint
        `, params);

        updated += batch.length;
        console.log(`✅ Обновлено: ${updated} / ${result.rows.length}`);
        
        if (batch.length > 0) {
          console.log(`   Пример: "${result.rows[i].name}"`);
          console.log(`            -> ${batch[batch.length - 1].imageUrl}`);
        }

        batch = [];
      }
    }

    console.log(`\n🎉 Готово! Обновлено ${updated} рецептов\n`);

    // Покажем примеры
    const examples = await client.query(`
      SELECT name, image_url 
      FROM v2_recipes 
      WHERE image_url IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 5
    `);

    console.log('📋 Примеры обновленных рецептов:');
    examples.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. "${row.name}"`);
      console.log(`   ${row.image_url}\n`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addImages();
