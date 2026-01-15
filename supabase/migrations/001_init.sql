-- 001_init.sql

-- ensure pgcrypto extension for gen_random_uuid
create extension if not exists pgcrypto;

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tags text[] not null
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  default_servings int not null default 2
);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete restrict,
  amount_g int not null,
  unit text not null default 'g',
  category text not null -- 'main'|'sauce'|'spice'
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  name text not null
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text,
  people_count int not null,
  created_at timestamptz default now()
);

create table if not exists plan_rows (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  day_index int not null,
  slot text not null,
  recipe_id uuid references recipes(id) on delete restrict
);

create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid references shopping_lists(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete restrict,
  amount_g int not null,
  unit text not null default 'g'
);

create index if not exists idx_ingredients_name on ingredients(lower(name));
create index if not exists idx_recipes_title on recipes(lower(title));
