#!/bin/bash
# Script to fix Telegram Bot on production server
# Run this from local machine

SERVER="root@erp.lenza.uz"
DEPLOY_DIR="/opt/lenza_erp"

echo "============================================"
echo "Fixing Telegram Bot on Production Server"
echo "============================================"
echo ""

# Step 1: Copy updated .env.backend file to server
echo "[Step 1/3] Uploading updated .env.backend file..."
scp .env.backend "${SERVER}:${DEPLOY_DIR}/.env"

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload .env file"
    exit 1
fi
echo "✓ .env file uploaded successfully"
echo ""

# Step 2: Verify the changes
echo "[Step 2/3] Verifying Telegram configuration..."
ssh $SERVER << 'ENDSSH'
cd /opt/lenza_erp
echo "Checking Telegram settings in .env file:"
grep -E 'TELEGRAM_(BOT_TOKEN|GROUP_CHAT_ID|CHAT_ID)' .env
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Failed to verify configuration"
    exit 1
fi
echo "✓ Configuration verified"
echo ""

# Step 3: Restart backend container
echo "[Step 3/3] Restarting backend container..."
ssh $SERVER << 'ENDSSH'
cd /opt/lenza_erp
docker-compose restart backend
echo "Waiting for backend to start..."
sleep 10
docker-compose ps backend
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Failed to restart backend"
    exit 1
fi
echo "✓ Backend restarted successfully"
echo ""

# Test Telegram
echo "============================================"
echo "Testing Telegram Bot..."
echo "============================================"
ssh $SERVER << 'ENDSSH'
cd /opt/lenza_erp
docker-compose exec -T backend python << 'ENDPYTHON'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from telegram_bot.services import send_telegram_message
print('Sending test message...')
send_telegram_message('✅ Telegram Bot Production Test\n\nTelegram bot is now working correctly!')
print('Test completed!')
ENDPYTHON
ENDSSH

echo ""
echo "============================================"
echo "Done! Check your Telegram group for test message"
echo "============================================"
