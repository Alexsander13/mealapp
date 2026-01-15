-- Изменение типа recipe_id в plan_rows с UUID на BIGINT

BEGIN;

-- Удаляем внешний ключ на старую таблицу recipes
ALTER TABLE plan_rows DROP CONSTRAINT IF EXISTS plan_rows_recipe_id_fkey;

-- Очищаем старые данные (они все равно ссылались на старые recipes)
TRUNCATE TABLE plan_rows;

-- Меняем тип recipe_id с UUID на BIGINT
ALTER TABLE plan_rows ALTER COLUMN recipe_id TYPE BIGINT USING NULL;

-- Добавляем внешний ключ на v2_recipes
ALTER TABLE plan_rows 
ADD CONSTRAINT plan_rows_recipe_id_fkey 
FOREIGN KEY (recipe_id) 
REFERENCES v2_recipes(id) 
ON DELETE CASCADE;

COMMIT;

-- Проверка
SELECT 
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'plan_rows' AND column_name = 'recipe_id';
