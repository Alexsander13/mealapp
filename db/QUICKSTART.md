# 🍳 Импорт рецептов Поварёнок.ру в Supabase

Автоматический импорт ~149K рецептов из CSV в нормализованную базу данных.

## ⚡ Быстрый старт

### 1️⃣ Настройте .env.local

```bash
cp .env.example .env.local
```

Отредактируйте `.env.local` и добавьте ключи из Supabase Dashboard → Settings → API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2️⃣ Запустите миграции БД

В Supabase SQL Editor выполните по порядку:

```sql
-- 1. Создание схемы
-- db/migrate_add_normalized_schema.sql

-- 2. Заполнение справочника единиц
-- db/seed_units.sql

-- 3. Проверка (опционально)
-- db/smoke_check.sql
```

### 3️⃣ Запустите импорт

```bash
npm run import:recipes
```

**Или через shell скрипт:**

```bash
cd db
./quick_import.sh
```

## 📊 Что будет импортировано

- ✅ ~149,000 рецептов
- ✅ ~15,000+ уникальных ингредиентов
- ✅ Связи рецептов с ингредиентами
- ✅ Количество и единицы измерения
- ⏱️ Время: 30-60 минут

## 📂 Структура данных

### Исходный CSV формат:
```csv
url,name,ingredients
https://www.povarenok.ru/recipes/show/164365/,Коктейль,"{'Молоко': '250 мл', 'Клубника': '200 г'}"
```

### Результат в БД:

**recipes**
| id | url | name | base_servings |
|----|-----|------|---------------|
| 1 | https://... | Коктейль | 1 |

**ingredients**
| id | name |
|----|------|
| 1 | молоко |
| 2 | клубника |

**recipe_ingredients**
| recipe_id | ingredient_id | amount | unit_id | amount_text |
|-----------|---------------|--------|---------|-------------|
| 1 | 1 | 250 | 2 (ml) | 250 мл |
| 1 | 2 | 200 | 1 (g) | 200 г |

## 🔍 Проверка результатов

После импорта выполните в Supabase SQL Editor:

```sql
-- Статистика
SELECT 
    (SELECT COUNT(*) FROM recipes) as recipes,
    (SELECT COUNT(*) FROM ingredients) as ingredients,
    (SELECT COUNT(*) FROM recipe_ingredients) as links;

-- Пример рецепта с ингредиентами
SELECT 
    r.name,
    i.name as ingredient,
    ri.amount,
    u.name_ru as unit
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredients i ON i.id = ri.ingredient_id
LEFT JOIN units u ON u.id = ri.unit_id
WHERE r.id = 1;

-- Топ-20 ингредиентов
SELECT 
    i.name,
    COUNT(*) as recipe_count
FROM ingredients i
JOIN recipe_ingredients ri ON ri.ingredient_id = i.id
GROUP BY i.id, i.name
ORDER BY recipe_count DESC
LIMIT 20;
```

## ⚠️ Важно

- **Service Role Key** обходит RLS — храните в секрете!
- Импорт идемпотентен — можно прерывать и перезапускать
- Дубликаты (по URL) автоматически пропускаются

## 📖 Подробная документация

- [db/IMPORT_GUIDE.md](db/IMPORT_GUIDE.md) — полная инструкция
- [db/README.md](db/README.md) — информация о миграциях

## 🐛 Проблемы?

1. **Ошибка "CSV file not found"** → Распакуйте архив:
   ```bash
   cd ../References
   unzip povarenok_recipes_2021_06_16.csv.zip
   ```

2. **Ошибка "Missing env variables"** → Проверьте `.env.local`

3. **Медленный импорт** → Это нормально для 149K записей, ждите 30-60 мин

## ✅ После импорта

Используйте данные в приложении:

```typescript
// Получить рецепт с ингредиентами
const { data } = await supabase
  .from('recipes')
  .select(`
    *,
    recipe_ingredients (
      amount,
      amount_text,
      ingredient:ingredients(name),
      unit:units(name_ru)
    )
  `)
  .eq('id', recipeId)
  .single();
```

---

**Готово к импорту!** 🚀
