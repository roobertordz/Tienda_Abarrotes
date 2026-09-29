#!/bin/sh
set -e

echo "🔄 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

echo "🌱 Ejecutando seed de datos..."
npx prisma db seed

echo "🚀 Iniciando servidor..."
npm start
