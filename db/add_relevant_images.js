#!/usr/bin/env node

/**
 * Добавляет релевантные фото из Unsplash к рецептам по их названию
 */

const { Client } = require('pg');
const { createApi } = require('unsplash-js');
const fetch = require('node-fetch');

const dbConfig = {
  host: 'db.nwigkuihnbekkstqsyue.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '?!Zbx8DLvxJH$6w',
  ssl: { rejectUnauthorized: false }
};

// Unsplash API (используем demo для тестирования, лучше получить свой ключ на unsplash.com/developers)
const unsplash = createApi({
  accessKey: 'demo', // Замените на свой ключ для production
  fetch: fetch,
});

const BATCH_SIZE = 50; // Обрабатываем по 50 рецептов
const DELAY_MS = 1000; // Задержка между запросами (rate limit)

async function addImages() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Подключение к БД...');
    await client.connect();
    console.log('✅ Подключено!\n');

    // Получаем рецепты БЕЗ фото
    const result = await client.query(`
      SELECT id, name 
      FROM v2_recipes 
      WHERE image_url IS NULL 
      ORDER BY id 
      LIMIT 10000
    `);

    console.log(`📸 Найдено рецептов без фото: ${result.rows.length}\n`);

    let updated = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const recipe = result.rows[i];
      
      try {
        // Создаем поисковый запрос: берем первые 2-3 слова из названия + "food"
        const searchTerms = recipe.name
          .split(/[\s,]+/)
          .slice(0, 3)
          .join(' ');
        
        const query = `${searchTerms} food`;
        
        // Ищем фото на Unsplash
        const searchResult = await unsplash.search.getPhotos({
          query: query,
          page: 1,
          perPage: 1,
          orientation: 'landscape'
        });

        let imageUrl = null;

        if (searchResult.response && searchResult.response.results.length > 0) {
          const photo = searchResult.response.results[0];
          imageUrl = photo.urls.regular; // Используем regular качество (1080px)
          
          // Обновляем БД
          await client.query(
            'UPDATE v2_recipes SET image_url = $1 WHERE id = $2',
            [imageUrl, recipe.id]
          );

          updated++;
          
          if (updated % 10 === 0) {
            console.log(`✅ Обновлено: ${updated} / ${result.rows.length}`);
            console.log(`   Пример: "${recipe.name}" -> ${imageUrl.substring(0, 60)}...`);
          }
        } else {
          // Если ничего не найдено, используем общее фото еды
          imageUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'; // Общее фото еды
          await client.query(
            'UPDATE v2_recipes SET image_url = $1 WHERE id = $2',
            [imageUrl, recipe.id]
          );
          updated++;
        }

        // Задержка чтобы не превысить rate limit Unsplash (50 requests/hour для demo)
        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }

      } catch (err) {
        console.error(`❌ Ошибка для рецепта #${recipe.id} "${recipe.name}": ${err.message}`);
      }
    }

    console.log(`\n🎉 Готово!`);
    console.log(`   Обновлено: ${updated} рецептов`);

    // Статистика
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(image_url) as with_images,
        COUNT(*) - COUNT(image_url) as without_images
      FROM v2_recipes
    `);

    console.log(`\n📊 Статистика:`);
    console.log(`   Всего рецептов: ${stats.rows[0].total}`);
    console.log(`   С фото: ${stats.rows[0].with_images}`);
    console.log(`   Без фото: ${stats.rows[0].without_images}\n`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addImages();
