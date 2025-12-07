#!/bin/bash

# Fix for reconciliation Excel export 500 error
# Ensures /tmp directory exists with proper permissions in media volume

echo "━━━━ Fixing Reconciliation Excel Export ━━━━"

# Create tmp directory on host
echo "[INFO] Creating tmp directory in media volume..."
mkdir -p /var/www/lenza_erp/media/tmp

# Set proper permissions
echo "[INFO] Setting permissions..."
chmod 777 /var/www/lenza_erp/media/tmp
chown -R 1000:1000 /var/www/lenza_erp/media/tmp

# Verify
if [ -d "/var/www/lenza_erp/media/tmp" ]; then
    echo "[SUCCESS] tmp directory created and configured"
    ls -la /var/www/lenza_erp/media/tmp
else
    echo "[ERROR] Failed to create tmp directory"
    exit 1
fi

echo "━━━━ Fix Complete ━━━━"
echo "Now test the reconciliation Excel export at:"
echo "https://erp.lenza.uz/reconciliation"
