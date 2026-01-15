#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const readline = require('readline');

const dbConfig = {
  host: 'db.nwigkuihnbekkstqsyue.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '?!Zbx8DLvxJH$6w',
  ssl: { rejectUnauthorized: false }
};

const CSV_PATH = '/Users/alex/Documents/receip/References/povarenok_recipes_2021_06_16.csv';
const BATCH_SIZE = 500;

async function importRecipes() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Подключение...');
    await client.connect();
    console.log('✅ Подключено!\n');

    let imported = 0;
    let lineNum = 0;
    let buffer = '';
    let batch = [];

    const rl = readline.createInterface({
      input: fs.createReadStream(CSV_PATH),
      crlfDelay: Infinity
    });

    console.log('Обработка CSV...\n');

    for await (const line of rl) {
      lineNum++;
      
      if (lineNum === 1) continue;
      
      buffer += line;
      
      if (buffer.endsWith('"')) {
        try {
          const parts = buffer.match(/^(https?:\/\/[^,]+),([^,]+),"(.+)"$/);
          
          if (parts) {
            const url = parts[1];
            const name = parts[2];
            const ingredientsStr = parts[3];

            let ingredients = [];
            try {
              const parsed = JSON.parse(ingredientsStr.replace(/'/g, '"'));
              ingredients = Object.keys(parsed).filter(Boolean);
            } catch (e) {}

            batch.push({ url, name, ingredients });

            if (batch.length >= BATCH_SIZE) {
              await processBatch(client, batch);
              imported += batch.length;
              console.log(`✅ Импортировано: ${imported}`);
              batch = [];
            }
          }
          
          buffer = '';
        } catch (e) {
          buffer = '';
        }
      }
    }

    // Последний batch
    if (batch.length > 0) {
      await processBatch(client, batch);
      imported += batch.length;
      console.log(`✅ Импортировано: ${imported}`);
    }

    console.log(`\n🎉 Импорт завершен!\n`);

    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM v2_recipes) as recipes,
        (SELECT COUNT(*) FROM v2_ingredients) as ingredients,
        (SELECT COUNT(*) FROM v2_recipe_ingredients) as links
    `);
    console.log(`📊 В БД:`);
    console.log(`   Рецепты: ${stats.rows[0].recipes}`);
    console.log(`   Ингредиенты: ${stats.rows[0].ingredients}`);
    console.log(`   Связей: ${stats.rows[0].links}\n`);

  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function processBatch(client, batch) {
  // Собираем все уникальные ингредиенты из batch
  const allIngredients = new Set();
  batch.forEach(r => r.ingredients.forEach(i => allIngredients.add(i)));

  // Массовая вставка ингредиентов
  if (allIngredients.size > 0) {
    const ingValues = Array.from(allIngredients).map((_, i) => `($${i + 1})`).join(',');
    const ingParams = Array.from(allIngredients);
    await client.query(`
      INSERT INTO v2_ingredients (name)
      VALUES ${ingValues}
      ON CONFLICT (name) DO NOTHING
    `, ingParams);
  }

  // Получаем ID всех ингредиентов
  const ingIds = new Map();
  if (allIngredients.size > 0) {
    const ingResult = await client.query(`
      SELECT id, name FROM v2_ingredients 
      WHERE name = ANY($1)
    `, [Array.from(allIngredients)]);
    
    ingResult.rows.forEach(row => {
      ingIds.set(row.name, row.id);
    });
  }

  // Массовая вставка рецептов
  const recipeValues = batch.map((_, i) => {
    const offset = i * 2;
    return `($${offset + 1}, $${offset + 2})`;
  }).join(',');
  
  const recipeParams = [];
  batch.forEach(r => {
    recipeParams.push(r.url, r.name);
  });

  const recipeResult = await client.query(`
    INSERT INTO v2_recipes (url, name)
    VALUES ${recipeValues}
    ON CONFLICT (url) DO NOTHING
    RETURNING id, url
  `, recipeParams);

  // Создаём маппинг url -> recipe_id
  const recipeIds = new Map();
  recipeResult.rows.forEach(row => {
    recipeIds.set(row.url, row.id);
  });

  // Массовая вставка связей
  const linkParams = [];
  const linkValues = [];
  let linkIdx = 1;

  batch.forEach(recipe => {
    const recipeId = recipeIds.get(recipe.url);
    if (!recipeId) return;

    recipe.ingredients.forEach(ingName => {
      const ingredientId = ingIds.get(ingName);
      if (!ingredientId) return;

      linkValues.push(`($${linkIdx}, $${linkIdx + 1})`);
      linkParams.push(recipeId, ingredientId);
      linkIdx += 2;
    });
  });

  if (linkValues.length > 0) {
    await client.query(`
      INSERT INTO v2_recipe_ingredients (recipe_id, ingredient_id)
      VALUES ${linkValues.join(',')}
      ON CONFLICT DO NOTHING
    `, linkParams);
  }
}

importRecipes();
