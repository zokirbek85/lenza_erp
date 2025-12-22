#!/bin/bash
cd /opt/lenza_erp

# Backup current .env
cp .env .env.backup_telegram_$(date +%s)

# Update only Telegram token
sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env

echo "Updated! Checking:"
grep TELEGRAM_BOT_TOKEN .env
