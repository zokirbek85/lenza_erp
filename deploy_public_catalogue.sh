#!/bin/bash
# Public Catalogue Deployment Script
# Run this script on the VPS as root

set -e

echo "🚀 Deploying Public Catalogue..."

cd /opt/lenza_erp

echo "📥 Pulling latest changes..."
git pull origin main

echo "🔨 Building frontend..."
docker-compose exec -T frontend npm run build || echo "Frontend build will happen in container"

echo "🐳 Rebuilding containers..."
docker-compose down
docker-compose up -d --build

echo "⏳ Waiting for backend to start..."
sleep 10

echo "🗄️ Running migrations..."
docker-compose exec -T backend python manage.py migrate

echo "📦 Collecting static files..."
docker-compose exec -T backend python manage.py collectstatic --noinput

echo "🔄 Restarting services..."
docker-compose restart nginx backend frontend

echo "✅ Deployment complete!"
echo ""
echo "📍 Public catalogue available at: https://erp.lenza.uz/catalogue"
echo "📍 Test endpoint: https://erp.lenza.uz/api/public/catalog/variants/"
echo ""
echo "🧪 To test:"
echo "   curl https://erp.lenza.uz/api/public/catalog/variants/"
