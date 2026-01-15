-- =============================================================================
-- Фаза 3: Заполнение справочника единиц измерения
-- =============================================================================
-- БЕЗОПАСНАЯ ОПЕРАЦИЯ: использует ON CONFLICT DO NOTHING
-- Можно запускать многократно без побочных эффектов

BEGIN;

-- Вставка базовых единиц измерения
INSERT INTO units (code, name_ru) VALUES
    ('g', 'г'),
    ('ml', 'мл'),
    ('pcs', 'шт'),
    ('tsp', 'ч.л.'),
    ('tbsp', 'ст.л.'),
    ('pinch', 'щепотка')
ON CONFLICT (code) DO NOTHING;

-- Дополнительные единицы для полноты справочника
INSERT INTO units (code, name_ru) VALUES
    ('kg', 'кг'),
    ('l', 'л'),
    ('cup', 'стакан'),
    ('oz', 'унция'),
    ('lb', 'фунт'),
    ('clove', 'зубчик'),
    ('bunch', 'пучок'),
    ('slice', 'ломтик'),
    ('can', 'банка'),
    ('package', 'упаковка'),
    ('bag', 'пакет'),
    ('handful', 'горсть'),
    ('to_taste', 'по вкусу')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- Проверка результата
SELECT 
    'UNITS SEED COMPLETED' as status,
    COUNT(*) as total_units,
    array_agg(code ORDER BY code) as available_codes
FROM units;

-- Показываем все единицы
SELECT 
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
    code;
