#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Запуск MealApp...${NC}\n"

# Переходим в директорию проекта
cd "$(dirname "$0")"

# Настраиваем PATH для node
export PATH="/Users/alex/.nvm/versions/node/v22.17.1/bin:/bin:/usr/bin:/usr/local/bin:$PATH"

echo -e "${GREEN}✓${NC} Директория: $(pwd)"
echo -e "${GREEN}✓${NC} Node версия: $(node --version)"
echo -e "${GREEN}✓${NC} Запуск dev сервера...\n"

# Запускаем сервер
npm run dev
