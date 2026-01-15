# Миграция: Добавление картинок к рецептам

## Шаг 1: Применить миграцию в Supabase Dashboard

1. Откройте https://supabase.com/dashboard/project/nwigkuihnbekkstqsyue/editor
2. Перейдите в SQL Editor
3. Создайте новый запрос и выполните:

```sql
alter table recipes add column if not exists image_url text;
```

## Шаг 2: После применения миграции запустите seed

```bash
cd /Users/alex/Documents/receip/mealapp
node supabase/seed/seed_node.js
```

Это добавит URL картинок ко всем рецептам.

## Альтернативный способ (через psql)

Если у вас установлен psql:

```bash
cat supabase/migrations/002_add_recipe_images.sql | psql "postgresql://postgres.nwigkuihnbekkstqsyue:[YOUR_DB_PASSWORD]@db.nwigkuihnbekkstqsyue.supabase.co:5432/postgres"
```
