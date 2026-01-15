BEGIN;

CREATE TABLE IF NOT EXISTS v2_recipes (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    base_servings INT NOT NULL DEFAULT 1,
    description TEXT NULL,
    cooking_time_minutes INT NULL,
    image_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_v2_recipes_url ON v2_recipes(url);
CREATE INDEX IF NOT EXISTS idx_v2_recipes_created_at ON v2_recipes(created_at DESC);

CREATE TABLE IF NOT EXISTS v2_ingredients (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_ingredients_name ON v2_ingredients(name);

CREATE TABLE IF NOT EXISTS v2_units (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ru TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_units_code ON v2_units(code);

CREATE TABLE IF NOT EXISTS v2_recipe_ingredients (
    recipe_id BIGINT NOT NULL REFERENCES v2_recipes(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES v2_ingredients(id),
    amount NUMERIC(12,3) NULL,
    unit_id BIGINT NULL REFERENCES v2_units(id),
    amount_text TEXT NULL,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_recipe_ingredients_ingredient_id ON v2_recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_v2_recipe_ingredients_unit_id ON v2_recipe_ingredients(unit_id);
CREATE INDEX IF NOT EXISTS idx_v2_recipe_ingredients_sort_order ON v2_recipe_ingredients(recipe_id, sort_order);

COMMIT;
