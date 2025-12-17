#!/bin/bash
# Deployment script for Product Inbound feature

set -e  # Exit on error

echo "🚀 Deploying Product Inbound Feature..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backend Migration
echo -e "${BLUE}Step 1: Running database migrations...${NC}"
cd backend
python manage.py migrate
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Step 2: Collect static files (if needed)
echo -e "${BLUE}Step 2: Collecting static files...${NC}"
python manage.py collectstatic --noinput
echo -e "${GREEN}✓ Static files collected${NC}"
echo ""

# Step 3: Build Frontend
echo -e "${BLUE}Step 3: Building frontend...${NC}"
cd ../frontend
npm install
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 4: Restart services
echo -e "${BLUE}Step 4: Restarting services...${NC}"

# Check if using systemd
if systemctl is-active --quiet lenza-backend; then
    echo "Restarting backend service..."
    sudo systemctl restart lenza-backend
    echo -e "${GREEN}✓ Backend service restarted${NC}"
else
    echo -e "${YELLOW}⚠ Backend service not found or not running${NC}"
fi

# Check if using PM2 for frontend
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q lenza-frontend; then
        echo "Restarting frontend with PM2..."
        pm2 restart lenza-frontend
        echo -e "${GREEN}✓ Frontend restarted${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the API: curl http://localhost:8000/api/inbounds/"
echo "2. Access the UI: http://localhost:3000/products/inbounds"
echo "3. Check the documentation: PRODUCT_INBOUND_IMPLEMENTATION.md"
echo ""
