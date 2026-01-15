#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const { parse } = require('csv-parse');

const dbConfig = {
  host: 'db.nwigkuihnbekkstqsyue.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '?!Zbx8DLvxJH$6w',
  ssl: { rejectUnauthorized: false }
};

const CSV_PATH = '/Users/alex/Documents/receip/References/povarenok_recipes_2021_06_16.csv';
const BATCH_SIZE = 100;

async function importRecipes() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Подключение к БД...');
    await client.connect();
    console.log('✅ Подключено!\n');

    let imported = 0;
    let errors = 0;
    let batch = [];
    let total = 0;

    console.log('Чтение CSV...\n');

    const parser = fs.createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, skip_empty_lines: true }));

    for await (const record of parser) {
      total++;
      
      const url = record.url;
      const name = record.name;
      const ingredientsStr = record.ingredients || '{}';

      batch.push({ url, name, ingredientsStr });

      if (batch.length >= BATCH_SIZE) {
        try {
          await processBatch(client, batch);
          imported += batch.length;
          if (imported % 1000 === 0) {
            console.log(`Импортировано: ${imported}`);
          }
        } catch (err) {
          console.error(`Ошибка: ${err.message}`);
          errors += batch.length;
        }
        batch = [];
      }
    }

    // Последний batch
    if (batch.length > 0) {
      try {
        await processBatch(client, batch);
        imported += batch.length;
      } catch (err) {
        errors += batch.length;
      }
    }

    console.log(`\n✅ Импорт завершен!`);
    console.log(`   Всего строк: ${total}`);
    console.log(`   Успешно: ${imported}`);
    console.log(`   Ошибок: ${errors}`);

    // Статистика
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM v2_recipes) as recipes,
        (SELECT COUNT(*) FROM v2_ingredients) as ingredients,
        (SELECT COUNT(*) FROM v2_recipe_ingredients) as links
    `);
    console.log(`\n📊 В БД:`);
    console.log(`   Рецепты: ${stats.rows[0].recipes}`);
    console.log(`   Ингредиенты: ${stats.rows[0].ingredients}`);
    console.log(`   Связей: ${stats.rows[0].links}`);

  } catch (error) {
    console.error('Критическая ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function processBatch(client, batch) {
  for (const { url, name, ingredientsStr } of batch) {
    await client.query('BEGIN');

    try {
      // Вставляем рецепт
      const recipeResult = await client.query(
        `INSERT INTO v2_recipes (url, name) 
         VALUES ($1, $2) 
         ON CONFLICT (url) DO NOTHING 
         RETURNING id`,
        [url, name]
      );

      if (recipeResult.rows.length === 0) {
        await client.query('COMMIT');
        continue;
      }

      const recipeId = recipeResult.rows[0].id;

      // Парсим ingredients (формат: "{'Молоко': '250 мл', 'Клубника': '200 г'}")
      let ingredients = [];
      try {
        const parsed = JSON.parse(ingredientsStr.replace(/'/g, '"'));
        ingredients = Object.keys(parsed);
      } catch (e) {
        // Если не парсится - пропускаем
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
}

importRecipes();
