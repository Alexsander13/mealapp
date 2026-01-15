BEGIN;

INSERT INTO v2_units (code, name_ru) VALUES
    ('g', 'г'),
    ('ml', 'мл'),
    ('pcs', 'шт'),
    ('tsp', 'ч.л.'),
    ('tbsp', 'ст.л.'),
    ('pinch', 'щепотка'),
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
