#!/bin/bash
# Script to check Telegram configuration on production server

echo "============================================"
echo "Checking Production Telegram Configuration"
echo "============================================"
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "✓ .env file found"
    echo ""
    
    # Check TELEGRAM_BOT_TOKEN
    echo "TELEGRAM_BOT_TOKEN:"
    grep "TELEGRAM_BOT_TOKEN" .env || echo "  ❌ Not found in .env"
    echo ""
    
    # Check TELEGRAM_GROUP_CHAT_ID
    echo "TELEGRAM_GROUP_CHAT_ID:"
    grep "TELEGRAM_GROUP_CHAT_ID" .env || echo "  ❌ Not found in .env"
    echo ""
    
    # Check TELEGRAM_CHAT_ID (fallback)
    echo "TELEGRAM_CHAT_ID:"
    grep "TELEGRAM_CHAT_ID" .env || echo "  ❌ Not found in .env"
    echo ""
else
    echo "❌ .env file not found in current directory"
    echo "Current directory: $(pwd)"
fi

echo ""
echo "============================================"
echo "To fix Telegram on production:"
echo "1. SSH to server: ssh user@erp.lenza.uz"
echo "2. cd /opt/lenza_erp"
echo "3. Edit .env file: nano .env"
echo "4. Set: TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM"
echo "5. Set: TELEGRAM_GROUP_CHAT_ID=-1003006758530"
echo "6. Restart: docker-compose restart backend"
echo "============================================"
