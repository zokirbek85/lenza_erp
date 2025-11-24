#!/usr/bin/env bash
# ========================================
# Lenza ERP - Fix Nginx Issue
# Removes problematic nginx config that references non-existent containers
# Run this on server where server_install.sh failed
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Lenza ERP - Nginx Configuration Fix${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} This script must be run as root"
    exit 1
fi

echo -e "${YELLOW}[1/6]${NC} Stopping Nginx (if running)..."
systemctl stop nginx 2>/dev/null || echo "Nginx already stopped"

echo -e "${YELLOW}[2/6]${NC} Removing problematic Nginx configurations..."
rm -f /etc/nginx/sites-enabled/erp.lenza.uz
rm -f /etc/nginx/sites-available/erp.lenza.uz
rm -f /etc/nginx/conf.d/active_upstream.conf
echo -e "${GREEN}✓${NC} Removed nginx configs that referenced non-existent containers"

echo -e "${YELLOW}[3/6]${NC} Fixing dpkg configuration..."
dpkg --configure -a
echo -e "${GREEN}✓${NC} dpkg configuration fixed"

echo -e "${YELLOW}[4/6]${NC} Verifying Nginx installation..."
apt install -y --fix-broken nginx
echo -e "${GREEN}✓${NC} Nginx installation verified"

echo -e "${YELLOW}[5/6]${NC} Testing Nginx configuration..."
nginx -t && echo -e "${GREEN}✓${NC} Nginx configuration is valid"

echo -e "${YELLOW}[6/6]${NC} Disabling Nginx (will be started by deploy.sh)..."
systemctl disable nginx
echo -e "${GREEN}✓${NC} Nginx disabled (deploy.sh will configure and start it)"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Fix completed successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Review environment file:"
echo -e "     ${BLUE}nano /opt/lenza_erp/.env${NC}"
echo -e ""
echo -e "  2. Run deployment:"
echo -e "     ${BLUE}cd /opt/lenza_erp && ./deploy.sh${NC}"
echo -e ""
echo -e "${GREEN}The deploy.sh script will properly configure Nginx after starting containers.${NC}\n"

exit 0
