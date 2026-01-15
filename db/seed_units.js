#!/usr/bin/env node

/**
 * Заполнение справочника units через Supabase API
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Читаем .env.local
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
  console.error('❌ Переменные окружения не найдены');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedUnits() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              ЗАПОЛНЕНИЕ СПРАВОЧНИКА ЕДИНИЦ ИЗМЕРЕНИЯ                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const units = [
    { code: 'g', name_ru: 'г' },
    { code: 'ml', name_ru: 'мл' },
    { code: 'pcs', name_ru: 'шт' },
    { code: 'tsp', name_ru: 'ч.л.' },
    { code: 'tbsp', name_ru: 'ст.л.' },
    { code: 'pinch', name_ru: 'щепотка' },
    { code: 'kg', name_ru: 'кг' },
    { code: 'l', name_ru: 'л' },
    { code: 'cup', name_ru: 'стакан' },
    { code: 'oz', name_ru: 'унция' },
    { code: 'lb', name_ru: 'фунт' },
    { code: 'clove', name_ru: 'зубчик' },
    { code: 'bunch', name_ru: 'пучок' },
    { code: 'slice', name_ru: 'ломтик' },
    { code: 'can', name_ru: 'банка' },
    { code: 'package', name_ru: 'упаковка' },
    { code: 'bag', name_ru: 'пакет' },
    { code: 'handful', name_ru: 'горсть' },
    { code: 'to_taste', name_ru: 'по вкусу' },
  ];

  console.log(`📦 Добавление ${units.length} единиц измерения...\n`);

  let added = 0;
  let skipped = 0;

  for (const unit of units) {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select();

    if (error) {
      if (error.code === '23505') {
        // Duplicate key - пропускаем
        console.log(`  ⚠️  ${unit.code.padEnd(12)} - уже существует`);
        skipped++;
      } else {
        console.error(`  ❌ ${unit.code.padEnd(12)} - ошибка:`, error.message);
      }
    } else {
      console.log(`  ✅ ${unit.code.padEnd(12)} → ${unit.name_ru}`);
      added++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ ЗАПОЛНЕНИЕ ЗАВЕРШЕНО`);
  console.log(`   Добавлено: ${added}`);
  console.log(`   Пропущено (уже существуют): ${skipped}`);
  console.log('='.repeat(80));
  
  // Проверка
  const { count } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Всего единиц в БД: ${count}\n`);
}

seedUnits().catch(error => {
  console.error('\n❌ ОШИБКА:', error);
  process.exit(1);
});
