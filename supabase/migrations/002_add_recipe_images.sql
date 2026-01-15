-- 002_add_recipe_images.sql

alter table recipes
add column if not exists image_url text;
