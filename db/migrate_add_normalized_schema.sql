-- =============================================================================
-- Фаза 2: Создание нормализованной схемы рецептов
-- =============================================================================
-- БЕЗОПАСНАЯ МИГРАЦИЯ: только additive changes, никаких DROP/RENAME/TRUNCATE
-- Все создания через IF NOT EXISTS для идемпотентности

BEGIN;

-- =============================================================================
-- Таблица: recipes
-- =============================================================================
CREATE TABLE IF NOT EXISTS recipes (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    base_servings INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NULL
);

-- Добавляем уникальное ограничение на url (безопасно)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'recipes_url_key' 
        AND conrelid = 'recipes'::regclass
    ) THEN
        ALTER TABLE recipes ADD CONSTRAINT recipes_url_key UNIQUE (url);
    END IF;
END $$;

-- Индекс на url для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_recipes_url ON recipes(url);

-- Индекс на created_at для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

-- Комментарии для документации
COMMENT ON TABLE recipes IS 'Нормализованная таблица рецептов с базовым количеством порций';
COMMENT ON COLUMN recipes.url IS 'URL источника рецепта, уникальный идентификатор';
COMMENT ON COLUMN recipes.base_servings IS 'Базовое количество порций в рецепте (для расчёта масштабирования)';

-- =============================================================================
-- Таблица: ingredients
-- =============================================================================
CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем уникальное ограничение на name (безопасно)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ingredients_name_key' 
        AND conrelid = 'ingredients'::regclass
    ) THEN
        ALTER TABLE ingredients ADD CONSTRAINT ingredients_name_key UNIQUE (name);
    END IF;
END $$;

-- Индекс на name для поиска
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);

-- Триграмный индекс для fuzzy search (опционально, требует pg_trgm)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING gin (name gin_trgm_ops)';
    END IF;
END $$;

COMMENT ON TABLE ingredients IS 'Справочник ингредиентов';
COMMENT ON COLUMN ingredients.name IS 'Название ингредиента, нормализованное';

-- =============================================================================
-- Таблица: units
-- =============================================================================
CREATE TABLE IF NOT EXISTS units (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    name_ru TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем уникальное ограничение на code (безопасно)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'units_code_key' 
        AND conrelid = 'units'::regclass
    ) THEN
        ALTER TABLE units ADD CONSTRAINT units_code_key UNIQUE (code);
    END IF;
END $$;

-- Индекс на code
CREATE INDEX IF NOT EXISTS idx_units_code ON units(code);

COMMENT ON TABLE units IS 'Справочник единиц измерения';
COMMENT ON COLUMN units.code IS 'Код единицы (g, ml, pcs, tsp, tbsp, pinch, etc)';
COMMENT ON COLUMN units.name_ru IS 'Название единицы на русском языке';

-- =============================================================================
-- Таблица: recipe_ingredients (связь многие-ко-многим)
-- =============================================================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    amount NUMERIC(12,3) NULL,
    unit_id BIGINT NULL,
    amount_text TEXT NULL,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- Добавляем Foreign Keys безопасно
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'recipe_ingredients_recipe_id_fkey'
        AND conrelid = 'recipe_ingredients'::regclass
    ) THEN
        ALTER TABLE recipe_ingredients 
        ADD CONSTRAINT recipe_ingredients_recipe_id_fkey 
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'recipe_ingredients_ingredient_id_fkey'
        AND conrelid = 'recipe_ingredients'::regclass
    ) THEN
        ALTER TABLE recipe_ingredients 
        ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey 
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'recipe_ingredients_unit_id_fkey'
        AND conrelid = 'recipe_ingredients'::regclass
    ) THEN
        ALTER TABLE recipe_ingredients 
        ADD CONSTRAINT recipe_ingredients_unit_id_fkey 
        FOREIGN KEY (unit_id) REFERENCES units(id);
    END IF;
END $$;

-- Индексы для эффективных JOIN и поиска
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_unit_id ON recipe_ingredients(unit_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_sort_order ON recipe_ingredients(recipe_id, sort_order);

COMMENT ON TABLE recipe_ingredients IS 'Связь рецептов и ингредиентов с количеством';
COMMENT ON COLUMN recipe_ingredients.amount IS 'Числовое количество (если указано)';
COMMENT ON COLUMN recipe_ingredients.amount_text IS 'Текстовое описание количества (если amount NULL или для специальных случаев)';
COMMENT ON COLUMN recipe_ingredients.is_optional IS 'Является ли ингредиент опциональным';
COMMENT ON COLUMN recipe_ingredients.sort_order IS 'Порядок отображения ингредиентов в рецепте';

-- =============================================================================
-- Опциональные колонки для будущего расширения (additive approach)
-- =============================================================================

-- Добавляем колонку для описания рецепта (если её ещё нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'recipes' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE recipes ADD COLUMN description TEXT NULL;
    END IF;
END $$;

-- Добавляем колонку для времени приготовления (если её ещё нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'recipes' 
        AND column_name = 'cooking_time_minutes'
    ) THEN
        ALTER TABLE recipes ADD COLUMN cooking_time_minutes INT NULL;
    END IF;
END $$;

-- Добавляем колонку для изображения (если её ещё нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'recipes' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE recipes ADD COLUMN image_url TEXT NULL;
    END IF;
END $$;

-- =============================================================================
-- Триггер для автоматического обновления updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаём триггер только если его ещё нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_recipes_updated_at'
    ) THEN
        CREATE TRIGGER update_recipes_updated_at
        BEFORE UPDATE ON recipes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;

-- Финальная проверка
SELECT 
    'MIGRATION COMPLETED' as status,
    COUNT(*) FILTER (WHERE tablename = 'recipes') as recipes_exists,
    COUNT(*) FILTER (WHERE tablename = 'ingredients') as ingredients_exists,
    COUNT(*) FILTER (WHERE tablename = 'units') as units_exists,
    COUNT(*) FILTER (WHERE tablename = 'recipe_ingredients') as recipe_ingredients_exists
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('recipes', 'ingredients', 'units', 'recipe_ingredients');
