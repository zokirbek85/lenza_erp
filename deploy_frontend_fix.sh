#!/bin/bash
# Quick deploy script for frontend fixes

echo "🚀 Deploying frontend fixes to production..."

# Navigate to frontend directory
cd /opt/lenza_erp/frontend

# Pull latest changes (if using git)
# git pull

# Install dependencies (if needed)
# npm install

# Build frontend
echo "📦 Building frontend..."
npm run build

# Copy to nginx directory
echo "📋 Copying build files..."
sudo rm -rf /var/www/lenza_erp/dist/*
sudo cp -r dist/* /var/www/lenza_erp/dist/

# Clear nginx cache
echo "🧹 Clearing nginx cache..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Frontend deployed successfully!"
echo "🌐 Please refresh https://erp.lenza.uz with Ctrl+Shift+R"
