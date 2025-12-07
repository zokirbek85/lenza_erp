#!/usr/bin/env bash
# Deploy fix for /api/products/export/excel/ 500 error
# Run this on the VPS as root

set -e

echo "🚀 Deploying tmp directory fix..."

cd /opt/lenza_erp

echo "📥 Pulling latest changes..."
git pull origin main

echo "📁 Creating /var/www/lenza_erp/media/tmp directory..."
bash fix_media_permissions.sh

echo "🔨 Rebuilding backend container..."
docker-compose build backend

echo "🔄 Restarting backend container..."
docker-compose up -d backend

echo "⏳ Waiting for backend to start..."
sleep 5

echo "✅ Verifying tmp directory exists in container..."
docker-compose exec -T backend ls -la /app/media/ | grep tmp || echo "❌ tmp directory not found!"

echo ""
echo "🎉 Deployment complete!"
echo "Test the export at: https://erp.lenza.uz/products"
