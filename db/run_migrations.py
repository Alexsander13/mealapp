#!/usr/bin/env python3
"""
Выполнение SQL миграций через psycopg2 (PostgreSQL драйвер для Python)
"""

import os
import sys

try:
    import psycopg2
except ImportError:
    print("❌ Установите psycopg2: pip3 install psycopg2-binary")
    sys.exit(1)

# Данные подключения из .env.local
SUPABASE_URL = "https://nwigkuihnbekkstqsyue.supabase.co"

# Построим connection string
# Формат Supabase: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
PROJECT_REF = SUPABASE_URL.split("//")[1].split(".")[0]
DB_HOST = f"db.{PROJECT_REF}.supabase.co"

print("╔════════════════════════════════════════════════════════════════════════════╗")
print("║              ВЫПОЛНЕНИЕ SQL МИГРАЦИЙ ЧЕРЕЗ PSYCOPG2                       ║")
print("╚════════════════════════════════════════════════════════════════════════════╝\n")
print(f"🌐 Supabase Project: {PROJECT_REF}")
print(f"🗄️  Database Host: {DB_HOST}\n")

# Запрашиваем пароль
print("⚠️  Нужен пароль от PostgreSQL (Database Password из Supabase)")
print("   Settings → Database → Connection string → Password\n")
password = input("Введите пароль: ")

if not password:
    print("❌ Пароль не указан")
    sys.exit(1)

# Подключаемся
try:
    conn = psycopg2.connect(
        host=DB_HOST,
        database="postgres",
        user="postgres",
        password=password,
        port=5432
    )
    print("\n✅ Подключение к PostgreSQL установлено\n")
except Exception as e:
    print(f"\n❌ Ошибка подключения: {e}")
    print("\nПроверьте:")
    print("  1. Пароль правильный")
    print("  2. Подключение к БД разрешено (Settings → Database → Connection pooling)")
    sys.exit(1)

# Выполняем миграции
migrations = [
    ("db/migrate_add_normalized_schema.sql", "Создание схемы"),
    ("db/seed_units.sql", "Заполнение справочника"),
]

cursor = conn.cursor()

for sql_file, description in migrations:
    print(f"📝 {description}...")
    
    if not os.path.exists(sql_file):
        print(f"  ❌ Файл не найден: {sql_file}")
        continue
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    try:
        cursor.execute(sql)
        conn.commit()
        print(f"  ✅ Выполнено успешно\n")
    except Exception as e:
        print(f"  ⚠️  Предупреждение: {str(e)[:100]}\n")
        conn.rollback()

# Проверяем результат
print("="* 80)
print("📊 Проверка таблиц:\n")

tables = ['recipes', 'ingredients', 'units', 'recipe_ingredients']
for table in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  ✅ {table.ljust(25)} - {count} записей")
    except Exception as e:
        print(f"  ❌ {table.ljust(25)} - не существует")

print("="* 80)
print("\n✅ МИГРАЦИИ ЗАВЕРШЕНЫ")
print("\nТеперь можно запустить импорт:")
print("  npm run import:recipes\n")

cursor.close()
conn.close()
