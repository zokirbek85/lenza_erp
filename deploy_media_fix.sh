#!/usr/bin/env bash
# Quick deployment script for VPS
# Run: sudo bash deploy_media_fix.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Lenza ERP Media 404 Fix Deployment${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Check root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${YELLOW}Please run as root: sudo bash deploy_media_fix.sh${NC}"
    exit 1
fi

cd /opt/lenza_erp

echo -e "\n${GREEN}[1/8]${NC} Pulling latest code..."
git pull origin main

echo -e "\n${GREEN}[2/8]${NC} Running media migration..."
chmod +x migrate_media.sh
bash migrate_media.sh

echo -e "\n${GREEN}[3/8]${NC} Checking active stack..."
ACTIVE_STACK="blue"  # Default
if grep -q "backend_green" /etc/nginx/conf.d/active_upstream.conf 2>/dev/null; then
    ACTIVE_STACK="green"
fi
echo "Active stack: $ACTIVE_STACK"

echo -e "\n${GREEN}[4/8]${NC} Stopping current containers..."
docker-compose -f deploy/docker-compose.$ACTIVE_STACK.yml down

echo -e "\n${GREEN}[5/8]${NC} Rebuilding containers with new volume config..."
docker-compose -f deploy/docker-compose.$ACTIVE_STACK.yml build --no-cache backend_$ACTIVE_STACK

echo -e "\n${GREEN}[6/8]${NC} Starting containers..."
docker-compose -f deploy/docker-compose.$ACTIVE_STACK.yml up -d

echo -e "\n${GREEN}[7/8]${NC} Updating NGINX configuration..."
cp deploy/nginx/erp.lenza.uz.conf /etc/nginx/sites-available/erp.lenza.uz

echo "Testing NGINX configuration..."
nginx -t

echo "Reloading NGINX..."
nginx -s reload

echo -e "\n${GREEN}[8/8]${NC} Verifying deployment..."
sleep 5

# Check backend health
echo "Checking backend health..."
if curl -sf http://localhost:8000/api/health/ > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed${NC}"
fi

# Check media directory
VARIANT_COUNT=$(find /var/www/lenza_erp/media/catalog/variants -type f 2>/dev/null | wc -l)
echo -e "\n${GREEN}Media Files Summary:${NC}"
echo "  Variant images: $VARIANT_COUNT"
echo "  Media path: /var/www/lenza_erp/media"

if [ "$VARIANT_COUNT" -gt 0 ]; then
    echo -e "\n${GREEN}Sample images:${NC}"
    ls -lh /var/www/lenza_erp/media/catalog/variants/ | head -5
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo "Test media access:"
echo "  curl -I https://erp.lenza.uz/media/catalog/variants/<filename>.png"
echo ""
echo "Check frontend:"
echo "  https://erp.lenza.uz/catalog"
echo ""
echo "Monitor logs:"
echo "  docker logs -f lenza_backend_$ACTIVE_STACK"
echo "  tail -f /var/log/nginx/error.log"
