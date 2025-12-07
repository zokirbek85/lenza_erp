#!/usr/bin/env bash
# Fix media directory permissions for Docker containers
# Run this on the VPS host as root

set -e

MEDIA_DIR="/var/www/lenza_erp/media"

echo "🔧 Creating media subdirectories..."

# Create subdirectories
mkdir -p "$MEDIA_DIR/catalog/variants"
mkdir -p "$MEDIA_DIR/catalog/products"
mkdir -p "$MEDIA_DIR/catalog/kits"
mkdir -p "$MEDIA_DIR/exports"
mkdir -p "$MEDIA_DIR/tmp"

echo "🔐 Setting permissions..."

# The django user in the container has UID 999 by default
# We need to make the directories writable by that UID
# Option 1: Make directories world-writable (simple but less secure)
chmod -R 777 "$MEDIA_DIR"

# Option 2: Set ownership to container's django user UID (more secure)
# Uncomment this and comment out the chmod above if you prefer:
# chown -R 999:999 "$MEDIA_DIR"

echo "✅ Media permissions fixed!"
echo ""
echo "Directory structure:"
ls -lah "$MEDIA_DIR"
echo ""
ls -lah "$MEDIA_DIR/catalog/"
