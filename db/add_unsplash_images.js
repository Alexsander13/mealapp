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

// Красивые Unsplash фото для разных категорий еды
const foodImages = [
  'photo-1546069901-ba9599a7e63c', // Food bowl
  'photo-1567620905732-2d1ec7ab7445', // Pancakes
  'photo-1565299585323-38d6b0865b47', // Tacos
  'photo-1565958011703-44f9829ba187', // Salad
  'photo-1504674900247-0877df9cc836', // Food
  'photo-1482049016688-2d3e1b311543', // Restaurant food
  'photo-1517673132405-a56a62b18caf', // Oatmeal
  'photo-1525351484163-7529414344d8', // Eggs
  'photo-1598103442097-8b74394b95c6', // Asian food
  'photo-1603133872878-684f208fb84b', // Fried rice
  'photo-1621996346565-e3dbc646d9a9', // Pasta
  'photo-1625937289178-a3b98cd8e85f', // Stew
  'photo-1512621776951-a57141f2eefd', // Salad bowl
  'photo-1551504734-5ee1c4a1479b', // Tacos
  'photo-1618040996337-56904b7850b9', // Quesadilla
  'photo-1541519227354-08fa5d50c44d', // Avocado toast
  'photo-1528207776546-365bb710ee93', // Pancakes
  'photo-1488477181946-6428a0291777', // Yogurt
  'photo-1467003909585-2f8a72700288', // Salmon
  'photo-1505252585461-04db1eb84625', // Smoothie
  'photo-1612929633738-8fe44f7ec841', // Omelette
  'photo-1546793665-c74683f339c1', // Caesar salad
  'photo-1455619452474-d2be8b1e70cd', // Curry
  'photo-1598866594230-a7c12756260f'  // Pasta
];

async function addImages() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Подключение...');
    await client.connect();
    console.log('✅ Подключено!\n');

    // Получаем все рецепты без фото
    const result = await client.query(`
      SELECT id, name FROM v2_recipes 
      WHERE image_url IS NULL 
      ORDER BY id
      LIMIT 10000
    `);

    console.log(`Найдено рецептов без фото: ${result.rows.length}\n`);

    let updated = 0;
    
    for (let i = 0; i < result.rows.length; i++) {
      const recipe = result.rows[i];
      // Выбираем фото на основе ID рецепта (детерминированно)
      const imageId = foodImages[Number(recipe.id) % foodImages.length];
      const imageUrl = `https://images.unsplash.com/${imageId}?w=400&q=80`;

      await client.query(`
        UPDATE v2_recipes 
        SET image_url = $1 
        WHERE id = $2
      `, [imageUrl, recipe.id]);

      updated++;

      if (updated % 1000 === 0) {
        console.log(`✅ Обновлено: ${updated}`);
      }
    }

    console.log(`\n🎉 Готово! Обновлено рецептов: ${updated}\n`);

    // Статистика
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(image_url) as with_images
      FROM v2_recipes
    `);

    console.log(`📊 Статистика:`);
    console.log(`   Всего рецептов: ${stats.rows[0].total}`);
    console.log(`   С фото: ${stats.rows[0].with_images}\n`);

  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addImages();
