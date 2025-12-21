#!/bin/bash
cd /opt/lenza_erp

# Backup
cp .env .env.backup_$(date +%s)

# Fix DJANGO_SECRET_KEY (line 7)
sed -i '7s/.*/DJANGO_SECRET_KEY="your-super-secret-key-change-this-in-production-min-50-chars"/' .env

# Fix POSTGRES_PASSWORD (line 15)
sed -i '15s/.*/POSTGRES_PASSWORD="secure_password_change_this"/' .env

# Fix COMPANY settings (lines 47-50)
sed -i '47s/.*/COMPANY_NAME="Lenza ERP"/' .env
sed -i '48s/.*/COMPANY_SLOGAN="Your Business Management Solution"/' .env
sed -i '49s/.*/COMPANY_ADDRESS="Tashkent, Uzbekistan"/' .env
sed -i '50s/.*/COMPANY_PHONE="+998 XX XXX XX XX"/' .env

echo "Fixed! Checking critical lines:"
echo "=== Line 7 (DJANGO_SECRET_KEY) ==="
sed -n '7p' .env
echo "=== Line 15 (POSTGRES_PASSWORD) ==="
sed -n '15p' .env
echo "=== Lines 47-50 (COMPANY) ==="
sed -n '47,50p' .env
