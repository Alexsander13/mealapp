/**
 * Импорт рецептов из CSV в нормализованную схему Supabase
 * 
 * Формат CSV: url, name, ingredients
 * ingredients формат: Python dict {'ingredient': 'amount unit', ...}
 * 
 * Целевые таблицы:
 * - recipes (id, url, name, base_servings, created_at)
 * - ingredients (id, name, created_at)
 * - units (id, code, name_ru, created_at) - уже заполнена
 * - recipe_ingredients (recipe_id, ingredient_id, amount, unit_id, amount_text, sort_order)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// =============================================================================
// Конфигурация
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_PATH = path.join(__dirname, '../../References/povarenok_recipes_2021_06_16.csv');

// Размер batch для массовых вставок
const BATCH_SIZE = 100;
const PROGRESS_INTERVAL = 1000;

// =============================================================================
// Инициализация Supabase
// =============================================================================

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Необходимо установить переменные окружения:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =============================================================================
// Парсинг ингредиентов из Python dict формата
// =============================================================================

interface ParsedIngredient {
  name: string;
  amountText: string | null;
}

/**
 * Парсит Python dict строку в массив ингредиентов
 * Пример: "{'Молоко': '250 мл', 'Сахар': '15 г'}"
 */
function parseIngredients(ingredientsStr: string): ParsedIngredient[] {
  try {
    // Заменяем одинарные кавычки на двойные для JSON
    let jsonStr = ingredientsStr
      .replace(/'/g, '"')
      .replace(/None/g, 'null')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false');
    
    const obj = JSON.parse(jsonStr);
    
    return Object.entries(obj).map(([name, amount]) => ({
      name: name.trim(),
      amountText: amount as string | null,
    }));
  } catch (error) {
    console.warn(`⚠️  Ошибка парсинга ингредиентов: ${ingredientsStr.substring(0, 100)}...`);
    return [];
  }
}

/**
 * Парсит amount_text и пытается извлечь числовое значение и единицу
 * Возвращает: { amount: number | null, unitCode: string | null, amountText: string }
 */
function parseAmountText(amountText: string | null): {
  amount: number | null;
  unitCode: string | null;
  amountText: string | null;
} {
  if (!amountText) {
    return { amount: null, unitCode: null, amountText: null };
  }

  const text = amountText.trim().toLowerCase();
  
  // Маппинг русских единиц на коды
  const unitMap: Record<string, string> = {
    'г': 'g',
    'гр': 'g',
    'грамм': 'g',
    'мл': 'ml',
    'миллилитр': 'ml',
    'кг': 'kg',
    'килограмм': 'kg',
    'л': 'l',
    'литр': 'l',
    'шт': 'pcs',
    'штук': 'pcs',
    'штука': 'pcs',
    'ч.л.': 'tsp',
    'ч. л.': 'tsp',
    'чайн. лож.': 'tsp',
    'ст.л.': 'tbsp',
    'ст. л.': 'tbsp',
    'стол. лож.': 'tbsp',
    'щепотка': 'pinch',
    'зуб.': 'clove',
    'зубчик': 'clove',
    'пуч.': 'bunch',
    'пучок': 'bunch',
    'стакан': 'cup',
    'по вкусу': 'to_taste',
  };

  // Паттерн: число (может быть дробное) + единица
  const pattern = /^(\d+(?:[.,]\d+)?)\s*([а-яё.\s]+)$/i;
  const match = text.match(pattern);

  if (match) {
    const amountStr = match[1].replace(',', '.');
    const amount = parseFloat(amountStr);
    const unitText = match[2].trim();
    
    // Ищем единицу в маппинге
    for (const [ru, code] of Object.entries(unitMap)) {
      if (unitText.includes(ru)) {
        return { amount, unitCode: code, amountText };
      }
    }
    
    // Если единица не найдена, но есть число
    return { amount, unitCode: null, amountText };
  }

  // Проверяем, есть ли просто единица без числа
  for (const [ru, code] of Object.entries(unitMap)) {
    if (text.includes(ru)) {
      return { amount: null, unitCode: code, amountText };
    }
  }

  // Не удалось распарсить
  return { amount: null, unitCode: null, amountText };
}

// =============================================================================
// Загрузка справочников
// =============================================================================

let unitsCache: Map<string, number> = new Map();
let ingredientsCache: Map<string, number> = new Map();

async function loadUnits() {
  console.log('📥 Загружаю справочник единиц...');
  const { data, error } = await supabase
    .from('units')
    .select('id, code');

  if (error) {
    console.error('❌ Ошибка загрузки units:', error);
    throw error;
  }

  data?.forEach((unit: any) => {
    unitsCache.set(unit.code, unit.id);
  });

  console.log(`✓ Загружено ${unitsCache.size} единиц измерения`);
}

async function getOrCreateIngredient(name: string): Promise<number> {
  // Нормализуем название (приводим к нижнему регистру, убираем лишние пробелы)
  const normalizedName = name.trim().toLowerCase();

  // Проверяем кэш
  if (ingredientsCache.has(normalizedName)) {
    return ingredientsCache.get(normalizedName)!;
  }

  // Пытаемся найти в БД
  const { data: existing, error: selectError } = await supabase
    .from('ingredients')
    .select('id')
    .eq('name', normalizedName)
    .single();

  if (existing) {
    ingredientsCache.set(normalizedName, existing.id);
    return existing.id;
  }

  // Создаём новый ингредиент
  const { data: newIngredient, error: insertError } = await supabase
    .from('ingredients')
    .insert({ name: normalizedName })
    .select('id')
    .single();

  if (insertError) {
    console.error(`❌ Ошибка создания ингредиента "${normalizedName}":`, insertError);
    throw insertError;
  }

  ingredientsCache.set(normalizedName, newIngredient.id);
  return newIngredient.id;
}

// =============================================================================
// Импорт рецептов
// =============================================================================

interface RecipeToImport {
  url: string;
  name: string;
  ingredients: ParsedIngredient[];
}

async function importRecipes() {
  console.log('\n🚀 Начинаю импорт рецептов...\n');

  const fileStream = fs.createReadStream(CSV_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let processedRecipes = 0;
  let skippedRecipes = 0;
  let errorRecipes = 0;
  let isHeader = true;

  const startTime = Date.now();

  for await (const line of rl) {
    lineNumber++;

    // Пропускаем заголовок
    if (isHeader) {
      isHeader = false;
      continue;
    }

    // Парсим CSV строку (учитываем, что ingredients может содержать запятые)
    const match = line.match(/^([^,]+),([^,]+),"(.+)"$/);
    if (!match) {
      console.warn(`⚠️  Строка ${lineNumber}: не удалось распарсить`);
      skippedRecipes++;
      continue;
    }

    const [, url, name, ingredientsStr] = match;

    try {
      // Парсим ингредиенты
      const ingredients = parseIngredients(ingredientsStr);
      
      if (ingredients.length === 0) {
        console.warn(`⚠️  Рецепт ${url}: нет ингредиентов, пропускаю`);
        skippedRecipes++;
        continue;
      }

      // Создаём рецепт
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          url: url.trim(),
          name: name.trim(),
          base_servings: 1, // По умолчанию 1 порция
        })
        .select('id')
        .single();

      if (recipeError) {
        // Проверяем, не дубликат ли это
        if (recipeError.code === '23505') {
          skippedRecipes++;
          continue;
        }
        throw recipeError;
      }

      // Создаём связи с ингредиентами
      const recipeIngredientsData = [];
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        
        // Получаем или создаём ингредиент
        const ingredientId = await getOrCreateIngredient(ing.name);
        
        // Парсим количество
        const { amount, unitCode, amountText } = parseAmountText(ing.amountText);
        const unitId = unitCode ? unitsCache.get(unitCode) || null : null;

        recipeIngredientsData.push({
          recipe_id: recipe.id,
          ingredient_id: ingredientId,
          amount,
          unit_id: unitId,
          amount_text: amountText,
          sort_order: i + 1,
        });
      }

      // Вставляем связи batch'ом
      const { error: riError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredientsData);

      if (riError) {
        console.error(`❌ Ошибка добавления ингредиентов для рецепта ${recipe.id}:`, riError);
        errorRecipes++;
      } else {
        processedRecipes++;
      }

      // Прогресс
      if (processedRecipes % PROGRESS_INTERVAL === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processedRecipes / elapsed;
        const remaining = (lineNumber - processedRecipes - skippedRecipes - errorRecipes);
        const eta = remaining / rate;

        console.log(
          `📊 Обработано: ${processedRecipes} | ` +
          `Пропущено: ${skippedRecipes} | ` +
          `Ошибок: ${errorRecipes} | ` +
          `Скорость: ${rate.toFixed(1)} рец/сек | ` +
          `ETA: ${Math.ceil(eta / 60)} мин`
        );
      }
    } catch (error) {
      console.error(`❌ Ошибка обработки рецепта ${url}:`, error);
      errorRecipes++;
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(80));
  console.log('✅ ИМПОРТ ЗАВЕРШЁН');
  console.log('='.repeat(80));
  console.log(`Всего строк обработано: ${lineNumber - 1}`);
  console.log(`✓ Успешно импортировано: ${processedRecipes}`);
  console.log(`⚠️  Пропущено (дубликаты/ошибки парсинга): ${skippedRecipes}`);
  console.log(`❌ Ошибок импорта: ${errorRecipes}`);
  console.log(`🕐 Время выполнения: ${Math.ceil(totalTime / 60)} мин ${Math.ceil(totalTime % 60)} сек`);
  console.log(`⚡ Средняя скорость: ${(processedRecipes / totalTime).toFixed(1)} рецептов/сек`);
  console.log(`📦 Уникальных ингредиентов: ${ingredientsCache.size}`);
  console.log('='.repeat(80));
}

// =============================================================================
// Главная функция
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         ИМПОРТ РЕЦЕПТОВ В SUPABASE - НОРМАЛИЗОВАННАЯ СХЕМА                ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📂 CSV файл: ${CSV_PATH}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log();

  // Проверяем наличие CSV файла
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV файл не найден: ${CSV_PATH}`);
    console.error('   Убедитесь, что файл распакован из архива.');
    process.exit(1);
  }

  try {
    // Загружаем справочники
    await loadUnits();

    // Импортируем рецепты
    await importRecipes();

    console.log('\n✅ Готово! Данные успешно импортированы.\n');
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

// Запуск
main();
