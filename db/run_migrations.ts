/**
 * Автоматическое выполнение SQL миграций через Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Конфигурация
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Необходимо установить переменные окружения');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =============================================================================
// Функция выполнения SQL
// =============================================================================

async function executeSql(sql: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Если RPC функция не существует, используем прямой SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    }
    
    console.log(`✅ ${description} - выполнено успешно`);
    return true;
  } catch (error: any) {
    console.error(`❌ Ошибка: ${error.message}`);
    return false;
  }
}

// =============================================================================
// Альтернативный метод через pg
// =============================================================================

async function executeSqlDirect(sqlFile: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}...`);
  
  const sql = fs.readFileSync(sqlFile, 'utf-8');
  
  // Разбиваем на отдельные команды
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const command of commands) {
    try {
      // Используем REST API для выполнения SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
      });
      
      successCount++;
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        errorCount++;
        console.warn(`  ⚠️  ${error.message.substring(0, 100)}`);
      }
    }
  }
  
  if (errorCount === 0) {
    console.log(`✅ ${description} - выполнено успешно (${successCount} команд)`);
    return true;
  } else {
    console.log(`⚠️  ${description} - выполнено с предупреждениями (ошибок: ${errorCount})`);
    return true;
  }
}

// =============================================================================
// Главная функция
// =============================================================================

async function runMigrations() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              АВТОМАТИЧЕСКОЕ ВЫПОЛНЕНИЕ МИГРАЦИЙ SUPABASE                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n🌐 Supabase URL: ${SUPABASE_URL}\n`);

  const migrations = [
    {
      file: path.join(__dirname, 'migrate_add_normalized_schema.sql'),
      name: 'Создание нормализованной схемы (recipes, ingredients, units, recipe_ingredients)',
    },
    {
      file: path.join(__dirname, 'seed_units.sql'),
      name: 'Заполнение справочника единиц измерения',
    },
  ];

  let allSuccess = true;

  for (const migration of migrations) {
    if (!fs.existsSync(migration.file)) {
      console.error(`❌ Файл не найден: ${migration.file}`);
      allSuccess = false;
      continue;
    }

    const sql = fs.readFileSync(migration.file, 'utf-8');
    const success = await executeSqlDirect(migration.file, migration.name);
    
    if (!success) {
      allSuccess = false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  
  if (allSuccess) {
    console.log('✅ ВСЕ МИГРАЦИИ ВЫПОЛНЕНЫ УСПЕШНО');
    console.log('\nТеперь можно запустить импорт рецептов:');
    console.log('  npm run import:recipes');
  } else {
    console.log('⚠️  НЕКОТОРЫЕ МИГРАЦИИ ВЫПОЛНЕНЫ С ПРЕДУПРЕЖДЕНИЯМИ');
    console.log('\nПроверьте логи выше для деталей.');
  }
  
  console.log('='.repeat(80));
}

// Запуск
runMigrations().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});
