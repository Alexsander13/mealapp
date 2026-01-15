/**
 * Импорт рецептов из CSV в СУЩЕСТВУЮЩУЮ схему Supabase
 * Адаптирован под текущую структуру БД с UUID
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

const PROGRESS_INTERVAL = 100;

// =============================================================================
// Инициализация
// =============================================================================

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Необходимо установить переменные окружения');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =============================================================================
// Кэш
// =============================================================================

let ingredientsCache: Map<string, string> = new Map(); // name -> uuid

interface ParsedIngredient {
  name: string;
  amountText: string | null;
}

function parseIngredients(ingredientsStr: string): ParsedIngredient[] {
  try {
    let jsonStr = ingredientsStr
      .replace(/'/g, '"')
      .replace(/None/g, 'null')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false');
    
    const obj = JSON.parse(jsonStr);
    
    return Object.entries(obj).map(([name, amount]) => ({
      name: name.trim().toLowerCase(),
      amountText: amount as string | null,
    }));
  } catch (error) {
    return [];
  }
}

function parseAmountAndUnit(amountText: string | null): { amount_g: number; unit: string } {
  if (!amountText) {
    return { amount_g: 0, unit: '' };
  }

  const text = amountText.trim().toLowerCase();
  
  // Простой парсинг количества в граммы
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    const unitText = match[2].trim();
    
    // Конвертация в граммы (приблизительно)
    let amount_g = num;
    let unit = unitText;
    
    if (unitText.includes('кг')) {
      amount_g = num * 1000;
      unit = 'кг';
    } else if (unitText.includes('л')) {
      amount_g = num * 1000;
      unit = 'л';
    } else if (unitText.includes('мл')) {
      amount_g = num;
      unit = 'мл';
    } else if (unitText.includes('г')) {
      amount_g = num;
      unit = 'г';
    } else if (unitText.includes('шт')) {
      amount_g = num * 100; // приблизительно
      unit = 'шт';
    } else {
      unit = unitText || '';
    }
    
    return { amount_g: Math.round(amount_g), unit };
  }
  
  return { amount_g: 0, unit: amountText };
}

async function getOrCreateIngredient(name: string): Promise<string> {
  const normalizedName = name.trim().toLowerCase();

  if (ingredientsCache.has(normalizedName)) {
    return ingredientsCache.get(normalizedName)!;
  }

  // Ищем в БД
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id')
    .eq('name', normalizedName)
    .single();

  if (existing) {
    ingredientsCache.set(normalizedName, existing.id);
    return existing.id;
  }

  // Создаём новый
  const { data: newIngredient, error } = await supabase
    .from('ingredients')
    .insert({ name: normalizedName, tags: [] })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  ingredientsCache.set(normalizedName, newIngredient.id);
  return newIngredient.id;
}

// =============================================================================
// Импорт
// =============================================================================

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

    if (isHeader) {
      isHeader = false;
      continue;
    }

    const match = line.match(/^([^,]+),([^,]+),"(.+)"$/);
    if (!match) {
      skippedRecipes++;
      continue;
    }

    const [, url, name, ingredientsStr] = match;

    try {
      const ingredients = parseIngredients(ingredientsStr);
      
      if (ingredients.length === 0) {
        skippedRecipes++;
        continue;
      }

      // Создаём рецепт
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: name.trim(),
          default_servings: 2,
          image_url: null,
        })
        .select('id')
        .single();

      if (recipeError) {
        if (recipeError.code === '23505') {
          skippedRecipes++;
          continue;
        }
        throw recipeError;
      }

      // Создаём связи с ингредиентами
      const recipeIngredientsData = [];
      for (let i = 0; i < ingredients.length && i < 20; i++) { // Максимум 20 ингредиентов
        const ing = ingredients[i];
        
        const ingredientId = await getOrCreateIngredient(ing.name);
        const { amount_g, unit } = parseAmountAndUnit(ing.amountText);

        recipeIngredientsData.push({
          recipe_id: recipe.id,
          ingredient_id: ingredientId,
          amount_g: amount_g || 100,
          unit: unit || 'г',
          category: 'main',
        });
      }

      const { error: riError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredientsData);

      if (riError) {
        errorRecipes++;
      } else {
        processedRecipes++;
      }

      if (processedRecipes % PROGRESS_INTERVAL === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processedRecipes / elapsed;
        console.log(
          `📊 Обработано: ${processedRecipes} | ` +
          `Пропущено: ${skippedRecipes} | ` +
          `Ошибок: ${errorRecipes} | ` +
          `Скорость: ${rate.toFixed(1)} рец/сек`
        );
      }
    } catch (error) {
      errorRecipes++;
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(80));
  console.log('✅ ИМПОРТ ЗАВЕРШЁН');
  console.log('='.repeat(80));
  console.log(`Всего строк обработано: ${lineNumber - 1}`);
  console.log(`✓ Успешно импортировано: ${processedRecipes}`);
  console.log(`⚠️  Пропущено: ${skippedRecipes}`);
  console.log(`❌ Ошибок: ${errorRecipes}`);
  console.log(`🕐 Время: ${Math.ceil(totalTime / 60)} мин`);
  console.log(`⚡ Скорость: ${(processedRecipes / totalTime).toFixed(1)} рец/сек`);
  console.log(`📦 Уникальных ингредиентов: ${ingredientsCache.size}`);
  console.log('='.repeat(80));
}

// =============================================================================
// Главная функция
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         ИМПОРТ РЕЦЕПТОВ В СУЩЕСТВУЮЩУЮ СХЕМУ SUPABASE                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📂 CSV файл: ${CSV_PATH}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log();

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV файл не найден: ${CSV_PATH}`);
    process.exit(1);
  }

  try {
    await importRecipes();
    console.log('\n✅ Готово!\n');
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

main();
