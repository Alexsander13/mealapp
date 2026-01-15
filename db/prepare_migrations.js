#!/usr/bin/env node

/**
 * Выполнение SQL миграций через Supabase Management API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Читаем .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Извлекаем project ref из URL
const PROJECT_REF = SUPABASE_URL.split('//')[1].split('.')[0];

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║              ВЫПОЛНЕНИЕ SQL МИГРАЦИЙ ЧЕРЕЗ SUPABASE API                   ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
console.log(`🌐 Project: ${PROJECT_REF}`);
console.log(`🔑 Service Key: ${SERVICE_KEY.substring(0, 20)}...`);
console.log();

// Функция для выполнения SQL через PostgREST
async function executeSql(sqlContent, description) {
  console.log(`\n📝 ${description}...`);
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      query: sqlContent
    });

    // Используем Supabase Database Webhooks / REST API
    // К сожалению, Supabase не предоставляет прямой REST API для выполнения произвольного SQL
    // Нужно использовать либо psql, либо SQL Editor UI
    
    console.log(`  ⚠️  Supabase не поддерживает выполнение произвольного SQL через REST API`);
    console.log(`  ℹ️  Используйте один из методов:`);
    console.log(`     1. Supabase SQL Editor (рекомендуется)`);
    console.log(`     2. psql командная строка`);
    console.log(`     3. Supabase CLI`);
    
    resolve(false);
  });
}

// Проверяем доступность файлов
const files = [
  { path: 'db/migrate_add_normalized_schema.sql', desc: 'Создание нормализованной схемы' },
  { path: 'db/seed_units.sql', desc: 'Заполнение справочника единиц' },
];

console.log('📂 Проверка файлов миграций:\n');

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file.path);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`  ✅ ${file.path.padEnd(45)} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  ❌ ${file.path.padEnd(45)} НЕ НАЙДЕН`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('📋 ВАРИАНТЫ ВЫПОЛНЕНИЯ МИГРАЦИЙ:');
console.log('='.repeat(80));

console.log('\n1️⃣  ЧЕРЕЗ SUPABASE SQL EDITOR (РЕКОМЕНДУЕТСЯ):');
console.log('   URL: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
console.log('');
console.log('   Шаги:');
console.log('   a) Откройте SQL Editor');
console.log('   b) Скопируйте содержимое db/migrate_add_normalized_schema.sql');
console.log('   c) Нажмите "Run"');
console.log('   d) Скопируйте содержимое db/seed_units.sql');
console.log('   e) Нажмите "Run"');

console.log('\n2️⃣  ЧЕРЕЗ PSQL:');
console.log('   Получите Database Password из Supabase Dashboard → Settings → Database');
console.log('   Затем выполните:');
console.log('');
console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres" \\`);
console.log('     < db/migrate_add_normalized_schema.sql');
console.log('');
console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres" \\`);
console.log('     < db/seed_units.sql');

console.log('\n3️⃣  ЧЕРЕЗ SUPABASE CLI:');
console.log('   npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.' + PROJECT_REF + '.supabase.co:5432/postgres"');

console.log('\n' + '='.repeat(80));
console.log('\n💡 АВТОМАТИЧЕСКОЕ ВЫПОЛНЕНИЕ:');
console.log('   Запустите: node db/run_migrations_auto.js');
console.log('   (Потребуется database password)');
console.log('\n' + '='.repeat(80));
