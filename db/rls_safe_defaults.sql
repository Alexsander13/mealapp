-- =============================================================================
-- Фаза 4: Безопасные настройки RLS (Row Level Security) для Supabase
-- =============================================================================
-- ВАЖНО: НЕ включаем RLS принудительно, чтобы не сломать текущий функционал
-- Только добавляем минимальные политики, если RLS уже включён

BEGIN;

-- =============================================================================
-- Проверка текущего статуса RLS
-- =============================================================================

DO $$
DECLARE
    recipes_rls_enabled BOOLEAN;
    ingredients_rls_enabled BOOLEAN;
    units_rls_enabled BOOLEAN;
    recipe_ingredients_rls_enabled BOOLEAN;
BEGIN
    -- Получаем статус RLS для каждой таблицы
    SELECT rowsecurity INTO recipes_rls_enabled 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'recipes';
    
    SELECT rowsecurity INTO ingredients_rls_enabled 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'ingredients';
    
    SELECT rowsecurity INTO units_rls_enabled 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'units';
    
    SELECT rowsecurity INTO recipe_ingredients_rls_enabled 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'recipe_ingredients';
    
    -- Выводим информацию
    RAISE NOTICE 'RLS Status Check:';
    RAISE NOTICE '  recipes: %', COALESCE(recipes_rls_enabled::TEXT, 'NOT ENABLED');
    RAISE NOTICE '  ingredients: %', COALESCE(ingredients_rls_enabled::TEXT, 'NOT ENABLED');
    RAISE NOTICE '  units: %', COALESCE(units_rls_enabled::TEXT, 'NOT ENABLED');
    RAISE NOTICE '  recipe_ingredients: %', COALESCE(recipe_ingredients_rls_enabled::TEXT, 'NOT ENABLED');
END $$;

-- =============================================================================
-- Политики для recipes (только если RLS включён)
-- =============================================================================

-- Чтение: все аутентифицированные пользователи могут читать рецепты
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'recipes' 
        AND rowsecurity = true
    ) THEN
        -- Создаём политику на чтение только если её нет
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'recipes' 
            AND policyname = 'recipes_select_authenticated'
        ) THEN
            CREATE POLICY recipes_select_authenticated
            ON recipes FOR SELECT
            TO authenticated
            USING (true);
            
            RAISE NOTICE 'Created policy: recipes_select_authenticated';
        END IF;
    ELSE
        RAISE NOTICE 'RLS not enabled for recipes, skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- Политики для ingredients (только если RLS включён)
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'ingredients' 
        AND rowsecurity = true
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'ingredients' 
            AND policyname = 'ingredients_select_authenticated'
        ) THEN
            CREATE POLICY ingredients_select_authenticated
            ON ingredients FOR SELECT
            TO authenticated
            USING (true);
            
            RAISE NOTICE 'Created policy: ingredients_select_authenticated';
        END IF;
    ELSE
        RAISE NOTICE 'RLS not enabled for ingredients, skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- Политики для units (только если RLS включён)
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'units' 
        AND rowsecurity = true
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'units' 
            AND policyname = 'units_select_authenticated'
        ) THEN
            CREATE POLICY units_select_authenticated
            ON units FOR SELECT
            TO authenticated
            USING (true);
            
            RAISE NOTICE 'Created policy: units_select_authenticated';
        END IF;
    ELSE
        RAISE NOTICE 'RLS not enabled for units, skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- Политики для recipe_ingredients (только если RLS включён)
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'recipe_ingredients' 
        AND rowsecurity = true
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'recipe_ingredients' 
            AND policyname = 'recipe_ingredients_select_authenticated'
        ) THEN
            CREATE POLICY recipe_ingredients_select_authenticated
            ON recipe_ingredients FOR SELECT
            TO authenticated
            USING (true);
            
            RAISE NOTICE 'Created policy: recipe_ingredients_select_authenticated';
        END IF;
    ELSE
        RAISE NOTICE 'RLS not enabled for recipe_ingredients, skipping policy creation';
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- Финальная проверка политик
-- =============================================================================

SELECT 
    'RLS POLICIES CHECK' as section,
    tablename,
    policyname,
    cmd as command,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('recipes', 'ingredients', 'units', 'recipe_ingredients')
ORDER BY tablename, policyname;

-- Рекомендации по дальнейшей настройке RLS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'RLS RECOMMENDATIONS:';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Текущие политики разрешают только SELECT для authenticated пользователей.';
    RAISE NOTICE '';
    RAISE NOTICE 'Для добавления/изменения данных рассмотрите добавление политик:';
    RAISE NOTICE '  1. INSERT policies для создания новых рецептов';
    RAISE NOTICE '  2. UPDATE policies для обновления существующих рецептов';
    RAISE NOTICE '  3. DELETE policies для удаления рецептов';
    RAISE NOTICE '';
    RAISE NOTICE 'Пример политики INSERT (раскомментируйте при необходимости):';
    RAISE NOTICE '  CREATE POLICY recipes_insert_authenticated';
    RAISE NOTICE '  ON recipes FOR INSERT';
    RAISE NOTICE '  TO authenticated';
    RAISE NOTICE '  WITH CHECK (true);';
    RAISE NOTICE '';
    RAISE NOTICE 'ВАЖНО: Не добавляйте write-политики без понимания бизнес-логики!';
    RAISE NOTICE '=============================================================================';
END $$;
