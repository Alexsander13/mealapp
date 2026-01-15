-- =============================================================================
-- Фаза 6: Smoke Check - проверка успешности миграции
-- =============================================================================
-- Никаких изменений данных, только проверки

-- =============================================================================
-- 1. Проверка существования таблиц
-- =============================================================================

SELECT 
    'TABLE EXISTENCE CHECK' as check_name,
    CASE WHEN to_regclass('public.recipes') IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as recipes,
    CASE WHEN to_regclass('public.ingredients') IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as ingredients,
    CASE WHEN to_regclass('public.units') IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as units,
    CASE WHEN to_regclass('public.recipe_ingredients') IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as recipe_ingredients;

-- =============================================================================
-- 2. Подсчёт записей в таблицах
-- =============================================================================

SELECT 
    'RECORD COUNTS' as check_name,
    (SELECT COUNT(*) FROM recipes) as recipes_count,
    (SELECT COUNT(*) FROM ingredients) as ingredients_count,
    (SELECT COUNT(*) FROM units) as units_count,
    (SELECT COUNT(*) FROM recipe_ingredients) as recipe_ingredients_count;

-- =============================================================================
-- 3. Проверка справочника units
-- =============================================================================

SELECT 
    'UNITS REFERENCE CHECK' as check_name,
    id,
    code,
    name_ru,
    created_at
FROM units
ORDER BY 
    CASE 
        WHEN code IN ('g', 'ml', 'pcs', 'tsp', 'tbsp', 'pinch') THEN 0
        ELSE 1
    END,
    code
LIMIT 20;

-- =============================================================================
-- 4. Проверка индексов
-- =============================================================================

SELECT 
    'INDEX CHECK' as check_name,
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE '%_pkey' THEN 'PRIMARY KEY'
        WHEN indexname LIKE '%_key' THEN 'UNIQUE'
        ELSE 'INDEX'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('recipes', 'ingredients', 'units', 'recipe_ingredients')
ORDER BY tablename, indexname;

-- =============================================================================
-- 5. Проверка Foreign Keys
-- =============================================================================

SELECT 
    'FOREIGN KEY CHECK' as check_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('recipe_ingredients')
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- 6. Проверка уникальных ограничений
-- =============================================================================

SELECT 
    'UNIQUE CONSTRAINTS CHECK' as check_name,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('recipes', 'ingredients', 'units')
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================================================
-- 7. Проверка RLS статуса
-- =============================================================================

SELECT 
    'RLS STATUS CHECK' as check_name,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✓ ENABLED'
        ELSE '✗ DISABLED'
    END as rls_status,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND pg_policies.tablename = pg_tables.tablename
    ) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('recipes', 'ingredients', 'units', 'recipe_ingredients')
ORDER BY tablename;

-- =============================================================================
-- 8. Проверка триггеров
-- =============================================================================

SELECT 
    'TRIGGER CHECK' as check_name,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'OTHER'
    END as trigger_event
FROM pg_trigger
WHERE tgrelid IN (
    'public.recipes'::regclass,
    'public.ingredients'::regclass,
    'public.units'::regclass,
    'public.recipe_ingredients'::regclass
)
AND tgisinternal = false
ORDER BY tgrelid::regclass::text, tgname;

-- =============================================================================
-- 9. Проверка колонок таблиц
-- =============================================================================

SELECT 
    'COLUMN CHECK' as check_name,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('recipes', 'ingredients', 'units', 'recipe_ingredients')
ORDER BY 
    CASE table_name
        WHEN 'recipes' THEN 1
        WHEN 'ingredients' THEN 2
        WHEN 'units' THEN 3
        WHEN 'recipe_ingredients' THEN 4
    END,
    ordinal_position;

-- =============================================================================
-- 10. Финальный статус
-- =============================================================================

DO $$
DECLARE
    recipes_exists BOOLEAN;
    ingredients_exists BOOLEAN;
    units_exists BOOLEAN;
    recipe_ingredients_exists BOOLEAN;
    units_count INT;
    all_checks_passed BOOLEAN;
BEGIN
    recipes_exists := (to_regclass('public.recipes') IS NOT NULL);
    ingredients_exists := (to_regclass('public.ingredients') IS NOT NULL);
    units_exists := (to_regclass('public.units') IS NOT NULL);
    recipe_ingredients_exists := (to_regclass('public.recipe_ingredients') IS NOT NULL);
    
    SELECT COUNT(*) INTO units_count FROM units;
    
    all_checks_passed := (
        recipes_exists AND 
        ingredients_exists AND 
        units_exists AND 
        recipe_ingredients_exists AND
        units_count >= 6
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'MIGRATION SMOKE CHECK RESULTS';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Tables:';
    RAISE NOTICE '  ✓ recipes: %', recipes_exists;
    RAISE NOTICE '  ✓ ingredients: %', ingredients_exists;
    RAISE NOTICE '  ✓ units: %', units_exists;
    RAISE NOTICE '  ✓ recipe_ingredients: %', recipe_ingredients_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Data:';
    RAISE NOTICE '  ✓ units populated: % records', units_count;
    RAISE NOTICE '';
    
    IF all_checks_passed THEN
        RAISE NOTICE '✓ ALL CHECKS PASSED';
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE NOTICE '✗ SOME CHECKS FAILED';
        RAISE NOTICE 'Please review the output above for details.';
    END IF;
    
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Import recipe data using your data loading script';
    RAISE NOTICE '  2. Test queries against new schema';
    RAISE NOTICE '  3. Update application code to use new tables';
    RAISE NOTICE '  4. Consider adding INSERT/UPDATE/DELETE RLS policies if needed';
    RAISE NOTICE '=============================================================================';
END $$;
