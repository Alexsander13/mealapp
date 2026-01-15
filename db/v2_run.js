#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'db.nwigkuihnbekkstqsyue.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '?!Zbx8DLvxJH$6w',
  ssl: { rejectUnauthorized: false }
};

async function main() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Подключение...');
    await client.connect();
    console.log('Подключено!\n');

    console.log('Создание таблиц v2...');
    const migrateSql = fs.readFileSync(path.join(__dirname, 'v2_migrate.sql'), 'utf-8');
    await client.query(migrateSql);
    console.log('Таблицы созданы!\n');

    console.log('Заполнение единиц...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'v2_seed.sql'), 'utf-8');
    await client.query(seedSql);
    console.log('Единицы добавлены!\n');

    const tables = ['v2_recipes', 'v2_ingredients', 'v2_units', 'v2_recipe_ingredients'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} записей`);
    }

    console.log('\n✅ ГОТОВО!');

  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
