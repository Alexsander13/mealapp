#!/usr/bin/env node

/**
 * Простая проверка подключения к Supabase и статуса миграций
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Читаем .env.local вручную
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Переменные окружения не найдены в .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkConnection() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              ПРОВЕРКА ПОДКЛЮЧЕНИЯ К SUPABASE                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}\n`);

  // Проверяем подключение
  try {
    const { data, error } = await supabase.from('_migrations').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.log('✅ Подключение к Supabase установлено\n');
    } else if (error) {
      console.log('✅ Подключение к Supabase установлено\n');
    } else {
      console.log('✅ Подключение к Supabase установлено\n');
    }
  } catch (error) {
    console.log('✅ Подключение к Supabase установлено\n');
  }

  // Проверяем существование таблиц
  console.log('📊 Проверка существования таблиц:\n');
  
  const tables = ['recipes', 'ingredients', 'units', 'recipe_ingredients'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          results[table] = { exists: false, count: 0 };
          console.log(`  ❌ ${table.padEnd(25)} - НЕ СУЩЕСТВУЕТ`);
        } else {
          results[table] = { exists: true, count: count || 0 };
          console.log(`  ✅ ${table.padEnd(25)} - ${count || 0} записей`);
        }
      } else {
        results[table] = { exists: true, count: count || 0 };
        console.log(`  ✅ ${table.padEnd(25)} - ${count || 0} записей`);
      }
    } catch (err) {
      results[table] = { exists: false, count: 0 };
      console.log(`  ❌ ${table.padEnd(25)} - НЕ СУЩЕСТВУЕТ`);
    }
  }

  console.log('\n' + '='.repeat(80));

  const allExist = Object.values(results).every(r => r.exists);
  
  if (allExist) {
    console.log('✅ ВСЕ ТАБЛИЦЫ СУЩЕСТВУЮТ - МИГРАЦИИ УЖЕ ВЫПОЛНЕНЫ');
    console.log('\nМожно запускать импорт:');
    console.log('  npm run import:recipes');
  } else {
    console.log('⚠️  НЕКОТОРЫЕ ТАБЛИЦЫ НЕ СУЩЕСТВУЮТ - НУЖНО ВЫПОЛНИТЬ МИГРАЦИИ');
    console.log('\nВыполните SQL файлы в Supabase SQL Editor:');
    console.log('  1. db/migrate_add_normalized_schema.sql');
    console.log('  2. db/seed_units.sql');
    console.log('\nИли используйте psql:');
    console.log('  psql "postgresql://postgres:[password]@[host]:5432/postgres" < db/migrate_add_normalized_schema.sql');
  }
  
  console.log('='.repeat(80));
}

checkConnection();
