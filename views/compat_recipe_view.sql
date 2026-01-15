-- =============================================================================
-- Переходный слой: VIEW для обратной совместимости (опционально)
-- =============================================================================
-- Этот VIEW создаётся только если нужна совместимость со старым форматом данных
-- Если у вас НЕТ старой схемы или она не конфликтует, этот файл можно пропустить

-- =============================================================================
-- Создание VIEW для чтения рецептов в "старом" формате
-- =============================================================================

CREATE OR REPLACE VIEW compat_recipe_view AS
SELECT 
    r.id,
    r.url,
    r.name,
    r.base_servings,
    r.description,
    r.cooking_time_minutes,
    r.image_url,
    r.created_at,
    r.updated_at,
    -- Собираем ингредиенты в JSONB объект для совместимости
    -- Формат: {"ingredient_name": "amount unit_name", ...}
    jsonb_object_agg(
        i.name,
        CASE 
            WHEN ri.amount_text IS NOT NULL THEN ri.amount_text
            WHEN ri.amount IS NOT NULL AND u.name_ru IS NOT NULL THEN 
                ri.amount::TEXT || ' ' || u.name_ru
            WHEN ri.amount IS NOT NULL THEN 
                ri.amount::TEXT
            ELSE 'по вкусу'
        END
    ) FILTER (WHERE i.id IS NOT NULL) as ingredients
FROM recipes r
LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
LEFT JOIN ingredients i ON i.id = ri.ingredient_id
LEFT JOIN units u ON u.id = ri.unit_id
GROUP BY 
    r.id, 
    r.url, 
    r.name, 
    r.base_servings, 
    r.description, 
    r.cooking_time_minutes, 
    r.image_url,
    r.created_at,
    r.updated_at;

COMMENT ON VIEW compat_recipe_view IS 'VIEW для обратной совместимости со старым форматом рецептов. Агрегирует ингредиенты в JSONB.';

-- =============================================================================
-- Альтернативный VIEW: плоский список ингредиентов (array)
-- =============================================================================

CREATE OR REPLACE VIEW recipe_with_ingredients_array AS
SELECT 
    r.id,
    r.url,
    r.name,
    r.base_servings,
    r.description,
    r.cooking_time_minutes,
    r.image_url,
    r.created_at,
    r.updated_at,
    -- Массив структурированных объектов ингредиентов
    array_agg(
        jsonb_build_object(
            'ingredient', i.name,
            'amount', ri.amount,
            'unit', u.code,
            'unit_name', u.name_ru,
            'amount_text', ri.amount_text,
            'is_optional', ri.is_optional,
            'sort_order', ri.sort_order
        ) ORDER BY COALESCE(ri.sort_order, 999), i.name
    ) FILTER (WHERE i.id IS NOT NULL) as ingredients
FROM recipes r
LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
LEFT JOIN ingredients i ON i.id = ri.ingredient_id
LEFT JOIN units u ON u.id = ri.unit_id
GROUP BY 
    r.id, 
    r.url, 
    r.name, 
    r.base_servings, 
    r.description, 
    r.cooking_time_minutes, 
    r.image_url,
    r.created_at,
    r.updated_at;

COMMENT ON VIEW recipe_with_ingredients_array IS 'VIEW рецептов с массивом структурированных ингредиентов (более детальный формат)';

-- =============================================================================
-- VIEW для поиска рецептов по ингредиентам
-- =============================================================================

CREATE OR REPLACE VIEW recipe_ingredient_search AS
SELECT 
    r.id as recipe_id,
    r.url,
    r.name as recipe_name,
    i.id as ingredient_id,
    i.name as ingredient_name,
    ri.amount,
    u.code as unit_code,
    u.name_ru as unit_name,
    ri.amount_text,
    ri.is_optional
FROM recipes r
INNER JOIN recipe_ingredients ri ON ri.recipe_id = r.id
INNER JOIN ingredients i ON i.id = ri.ingredient_id
LEFT JOIN units u ON u.id = ri.unit_id;

COMMENT ON VIEW recipe_ingredient_search IS 'Плоский VIEW для поиска и фильтрации рецептов по ингредиентам';

-- =============================================================================
-- Примеры использования VIEWs
-- =============================================================================

-- Пример 1: Получить рецепт со всеми ингредиентами в старом формате
-- SELECT * FROM compat_recipe_view WHERE url = 'https://example.com/recipe/1';

-- Пример 2: Получить рецепт с массивом ингредиентов
-- SELECT * FROM recipe_with_ingredients_array WHERE id = 1;

-- Пример 3: Найти все рецепты, содержащие определённый ингредиент
-- SELECT DISTINCT recipe_id, recipe_name, url
-- FROM recipe_ingredient_search
-- WHERE ingredient_name ILIKE '%курица%';

-- Пример 4: Найти рецепты, содержащие несколько ингредиентов
-- SELECT recipe_id, recipe_name, array_agg(ingredient_name) as ingredients
-- FROM recipe_ingredient_search
-- WHERE ingredient_name IN ('курица', 'рис', 'лук')
-- GROUP BY recipe_id, recipe_name
-- HAVING COUNT(DISTINCT ingredient_name) = 3;

-- =============================================================================
-- Проверка созданных VIEWs
-- =============================================================================

SELECT 
    'VIEWS CHECK' as check_name,
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN (
        'compat_recipe_view',
        'recipe_with_ingredients_array',
        'recipe_ingredient_search'
    )
ORDER BY viewname;
