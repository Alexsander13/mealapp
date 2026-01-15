-- =============================================================================
-- Фаза 1: Диагностика текущей схемы Supabase
-- =============================================================================
-- Запустите этот файл в Supabase SQL Editor для получения полной картины БД
-- Никаких изменений данных не производится

-- 1. Список всех таблиц в public schema
SELECT 
    'TABLES IN PUBLIC SCHEMA' as section,
    tablename as table_name,
    tableowner as owner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Колонки и типы для каждой таблицы
SELECT 
    'TABLE COLUMNS' as section,
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Индексы по таблицам
SELECT 
    'INDEXES' as section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Внешние ключи (Foreign Keys)
SELECT 
    'FOREIGN KEYS' as section,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
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
ORDER BY tc.table_name, kcu.column_name;

-- 5. Проверка RLS (Row Level Security) - критично для Supabase
SELECT 
    'RLS STATUS' as section,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. RLS Policies (если есть)
SELECT 
    'RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Уникальные ограничения
SELECT 
    'UNIQUE CONSTRAINTS' as section,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 8. Primary Keys
SELECT 
    'PRIMARY KEYS' as section,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 9. Проверка наличия конфликтующих имён таблиц
SELECT 
    'TABLE NAME CONFLICTS CHECK' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') 
        THEN 'WARNING: Table "recipes" already exists - consider using "v2_recipes"'
        ELSE 'OK: Table "recipes" is available'
    END as recipes_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ingredients') 
        THEN 'WARNING: Table "ingredients" already exists - consider using "v2_ingredients"'
        ELSE 'OK: Table "ingredients" is available'
    END as ingredients_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'units') 
        THEN 'WARNING: Table "units" already exists - consider using "v2_units"'
        ELSE 'OK: Table "units" is available'
    END as units_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipe_ingredients') 
        THEN 'WARNING: Table "recipe_ingredients" already exists - consider using "v2_recipe_ingredients"'
        ELSE 'OK: Table "recipe_ingredients" is available'
    END as recipe_ingredients_check;

-- 10. Storage usage (опционально)
SELECT 
    'TABLE SIZES' as section,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
