#!/bin/bash

# Скрипт для выполнения миграций через Supabase SQL Editor

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              ИНСТРУКЦИЯ ПО ВЫПОЛНЕНИЮ МИГРАЦИЙ В SUPABASE                 ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Supabase Project: https://nwigkuihnbekkstqsyue.supabase.co"
echo ""
echo "📝 Шаги для выполнения:"
echo ""
echo "1️⃣  Откройте Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/nwigkuihnbekkstqsyue/sql/new"
echo ""
echo "2️⃣  Скопируйте и выполните миграцию создания схемы:"
echo "   Файл: db/migrate_add_normalized_schema.sql"
echo ""
echo "3️⃣  Скопируйте и выполните заполнение справочника единиц:"
echo "   Файл: db/seed_units.sql"
echo ""
echo "4️⃣  Проверьте результат:"
echo "   Файл: db/smoke_check.sql"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
read -p "Открыть Supabase SQL Editor в браузере? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://supabase.com/dashboard/project/nwigkuihnbekkstqsyue/sql/new"
    echo ""
    echo "✅ SQL Editor открыт в браузере"
    echo ""
fi

echo "📋 Готовые команды для копирования:"
echo ""
echo "Шаг 1 - Создание схемы (скопируйте содержимое файла):"
echo "───────────────────────────────────────────────────────"
cat db/migrate_add_normalized_schema.sql | head -20
echo "..."
echo "(Полный файл: db/migrate_add_normalized_schema.sql)"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
