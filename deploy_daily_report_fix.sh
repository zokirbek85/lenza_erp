#!/bin/bash
# Deploy daily report PDF fix to production

echo "🚀 Deploying daily report PDF fix..."

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Restart backend service
echo "🔄 Restarting backend service..."
sudo systemctl restart lenza_erp.service

# Wait a bit for service to start
sleep 3

# Check service status
echo "✅ Checking service status..."
sudo systemctl status lenza_erp.service --no-pager | head -n 10

echo ""
echo "✨ Deployment complete!"
echo ""
echo "Test the fix at: https://erp.lenza.uz/api/orders/daily-report/pdf/?report_date=2025-12-16"
