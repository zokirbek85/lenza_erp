#!/bin/bash

# Quick fix for 413 Request Entity Too Large error
# This script updates nginx configuration on production server

echo "=================================================="
echo "Fixing 413 Request Entity Too Large Error"
echo "=================================================="

# Check if running on production server
if [ ! -f "/etc/nginx/sites-available/erp.lenza.uz" ]; then
    echo "❌ Not on production server or nginx config not found"
    exit 1
fi

echo "✓ Production server detected"

# Backup current config
sudo cp /etc/nginx/sites-available/erp.lenza.uz /etc/nginx/sites-available/erp.lenza.uz.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Config backed up"

# Update client_max_body_size
echo "Updating client_max_body_size to 100M..."
sudo sed -i 's/client_max_body_size [0-9]*M;/client_max_body_size 100M;/g' /etc/nginx/sites-available/erp.lenza.uz

# Also update nginx.conf if exists
if [ -f "/etc/nginx/nginx.conf" ]; then
    if ! grep -q "client_max_body_size" /etc/nginx/nginx.conf; then
        echo "Adding client_max_body_size to nginx.conf http block..."
        sudo sed -i '/http {/a \    client_max_body_size 100M;' /etc/nginx/nginx.conf
    fi
fi

# Test nginx config
echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✓ Nginx config is valid"
    
    # Reload nginx
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✓ Nginx reloaded successfully"
        echo ""
        echo "=================================================="
        echo "✅ Fix applied successfully!"
        echo "=================================================="
        echo "client_max_body_size increased to 100M"
        echo "You can now upload larger images in ProductVariant"
    else
        echo "❌ Failed to reload nginx"
        exit 1
    fi
else
    echo "❌ Nginx config test failed"
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/erp.lenza.uz.backup.* /etc/nginx/sites-available/erp.lenza.uz
    exit 1
fi
