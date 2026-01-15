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

async function importRecipes() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Подключение...');
    await client.connect();
    console.log('✅ Подключено!\n');

    let imported = 0;
    let errors = 0;
    let lineNum = 0;
    let buffer = '';

    const rl = readline.createInterface({
      input: fs.createReadStream(CSV_PATH),
      crlfDelay: Infinity
    });

    console.log('Обработка CSV...\n');

    for await (const line of rl) {
      lineNum++;
      
      if (lineNum === 1) continue; // Skip header
      
      buffer += line;
      
      // Простая проверка: если строка заканчивается на " - значит закончилась
      if (buffer.endsWith('"')) {
        try {
          const parts = buffer.match(/^(https?:\/\/[^,]+),([^,]+),"(.+)"$/);
          
          if (parts) {
            const url = parts[1];
            const name = parts[2];
            const ingredientsStr = parts[3];

            try {
              await processRecipe(client, url, name, ingredientsStr);
              imported++;
              
              if (imported % 1000 === 0) {
                console.log(`✅ Импортировано: ${imported}`);
              }
            } catch (e) {
              errors++;
            }
          }
          
          buffer = '';
        } catch (e) {
          buffer = '';
        }
      }
    }

    console.log(`\n🎉 Импорт завершен!`);
    console.log(`   Успешно: ${imported}`);
    console.log(`   Ошибок: ${errors}\n`);

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

async function processRecipe(client, url, name, ingredientsStr) {
  await client.query('BEGIN');

  try {
    const recipeResult = await client.query(
      `INSERT INTO v2_recipes (url, name) 
       VALUES ($1, $2) 
       ON CONFLICT (url) DO NOTHING 
       RETURNING id`,
      [url, name]
    );

    if (recipeResult.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    const recipeId = recipeResult.rows[0].id;

    let ingredients = [];
    try {
      const parsed = JSON.parse(ingredientsStr.replace(/'/g, '"'));
      ingredients = Object.keys(parsed);
    } catch (e) {
      // Skip
    }

    for (const ingName of ingredients) {
      if (!ingName) continue;

      const ingResult = await client.query(
        `INSERT INTO v2_ingredients (name) 
         VALUES ($1) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [ingName]
      );

      const ingredientId = ingResult.rows[0].id;

      await client.query(
        `INSERT INTO v2_recipe_ingredients (recipe_id, ingredient_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
        [recipeId, ingredientId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

importRecipes();
