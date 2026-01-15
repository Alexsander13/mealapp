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
  const hash = hashCode(recipeName);
  // Используем LoremFlickr - надежный сервис с реальными фото еды
  // Параметры: 800x600, категория food, seed для стабильности
  return `https://loremflickr.com/800/600/food,meal?lock=${hash}`;
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
console.log('  ', generateImageUrl('Салат Цезарь'));
console.log('  ', generateImageUrl('Борщ'));
console.log('  ', generateImageUrl('Торт'));
console.log('\n');

updateImages();
