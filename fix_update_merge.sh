#!/bin/bash
# Quick fix script for update.sh merge conflict on VPS

echo "🔧 Fixing update.sh merge conflict..."

cd /opt/lenza_erp

# Backup current update.sh
echo "📦 Backing up current update.sh..."
cp update.sh update.sh.backup.$(date +%Y%m%d_%H%M%S)

# Stash local changes
echo "💾 Stashing local changes..."
git stash

# Pull latest changes
echo "⬇️  Pulling latest version..."
git pull origin main

# Check if there are stashed changes
if git stash list | grep -q "stash@{0}"; then
    echo "📝 Local changes were stashed. Comparing versions..."
    
    # Show what was in the stash
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Local changes that were stashed:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    git stash show -p stash@{0}
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    echo "ℹ️  If you need those changes, restore them with: git stash pop"
    echo "ℹ️  Or drop the stash with: git stash drop"
fi

echo ""
echo "✅ update.sh updated successfully!"
echo "📁 Backup saved as: update.sh.backup.*"
echo ""
echo "Now run: bash update.sh"
