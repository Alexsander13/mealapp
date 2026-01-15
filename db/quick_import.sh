#!/bin/bash

# Быстрый запуск импорта рецептов
# Использование: ./db/quick_import.sh

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              БЫСТРЫЙ ИМПОРТ РЕЦЕПТОВ В SUPABASE                           ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Проверка переменных окружения
if [ ! -f ".env.local" ]; then
    echo "❌ Файл .env.local не найден!"
    echo ""
    echo "Создайте файл .env.local со следующим содержимым:"
    echo ""
    cat .env.example
    echo ""
    echo "Получить ключи можно в Supabase Dashboard → Settings → API"
    exit 1
fi

# Проверка CSV файла
CSV_PATH="../References/povarenok_recipes_2021_06_16.csv"
if [ ! -f "$CSV_PATH" ]; then
    echo "❌ CSV файл не найден: $CSV_PATH"
    echo ""
    echo "Распакуйте архив:"
    echo "  cd ../References"
    echo "  unzip povarenok_recipes_2021_06_16.csv.zip"
    exit 1
fi

echo "✓ Найден .env.local"
echo "✓ Найден CSV файл"
echo ""

# Подгружаем переменные окружения
set -a
source .env.local
set +a

# Проверка Supabase подключения
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Не установлены переменные окружения:"
    echo "   NEXT_PUBLIC_SUPABASE_URL"
    echo "   SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "🌐 Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Спрашиваем подтверждение
echo "⚠️  ВНИМАНИЕ: Будет импортировано ~149K рецептов"
echo "   Это займёт 30-60 минут"
echo ""
read -p "Продолжить? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено"
    exit 0
fi

echo ""
echo "🚀 Запускаю импорт..."
echo ""

# Запуск импорта
npm run import:recipes

echo ""
echo "✅ Импорт завершён!"
echo ""
echo "Проверьте результаты в Supabase SQL Editor:"
echo "  SELECT COUNT(*) FROM recipes;"
echo "  SELECT COUNT(*) FROM ingredients;"
