#!/bin/bash
# Deployment Script for Defects Stock-Based Fix
# Run this on the VPS to deploy the changes

set -e  # Exit on error

echo "=========================================="
echo "Deploying Defects Stock-Based Fix"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Pull latest changes${NC}"
cd /opt/lenza_erp
git pull origin main

echo -e "${YELLOW}Step 2: Rebuild backend Docker image${NC}"
docker-compose build backend

echo -e "${YELLOW}Step 3: Rebuild frontend Docker image${NC}"
docker-compose build frontend

echo -e "${YELLOW}Step 4: Deploy with zero-downtime (green/blue)${NC}"

# Check which container is currently active
CURRENT=$(docker ps --filter "name=lenza_backend_green" --format "{{.Names}}" | head -1)

if [ "$CURRENT" == "lenza_backend_green" ]; then
    echo "Green is active, deploying to blue..."
    NEW_COLOR="blue"
    OLD_COLOR="green"
else
    echo "Blue is active (or first deploy), deploying to green..."
    NEW_COLOR="green"
    OLD_COLOR="blue"
fi

# Start new backend container
echo "Starting lenza_backend_${NEW_COLOR}..."
docker-compose up -d backend_${NEW_COLOR}

# Wait for backend to be healthy
echo "Waiting for backend to be healthy..."
sleep 5
for i in {1..30}; do
    if curl -sf http://localhost:8000/api/health/ > /dev/null; then
        echo -e "${GREEN}Backend is healthy!${NC}"
        break
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

# Start new frontend container
echo "Starting lenza_frontend_${NEW_COLOR}..."
docker-compose up -d frontend_${NEW_COLOR}

# Wait for frontend to be ready
sleep 3

# Update nginx to point to new containers
echo "Updating nginx configuration..."
if [ "$NEW_COLOR" == "green" ]; then
    # Point to green
    sed -i 's/lenza_backend_blue:8000/lenza_backend_green:8000/g' /opt/lenza_erp/nginx/nginx.conf
    sed -i 's/lenza_frontend_blue:80/lenza_frontend_green:80/g' /opt/lenza_erp/nginx/nginx.conf
else
    # Point to blue
    sed -i 's/lenza_backend_green:8000/lenza_backend_blue:8000/g' /opt/lenza_erp/nginx/nginx.conf
    sed -i 's/lenza_frontend_green:80/lenza_frontend_blue:80/g' /opt/lenza_erp/nginx/nginx.conf
fi

# Reload nginx
echo "Reloading nginx..."
docker-compose exec nginx nginx -s reload

# Wait a bit for connections to drain
echo "Waiting for connections to drain..."
sleep 5

# Stop old containers
echo "Stopping old containers (lenza_*_${OLD_COLOR})..."
docker-compose stop backend_${OLD_COLOR} frontend_${OLD_COLOR}

echo -e "${GREEN}=========================================="
echo -e "Deployment Complete!"
echo -e "==========================================${NC}"
echo ""
echo "Active containers: ${NEW_COLOR}"
echo "Old containers stopped: ${OLD_COLOR}"
echo ""
echo "Verification:"
echo "  Backend:  curl http://localhost:8000/api/health/"
echo "  Frontend: curl http://localhost/"
echo "  Defects:  curl http://localhost:8000/api/defects/stock/"
echo ""
echo "Check logs:"
echo "  docker logs lenza_backend_${NEW_COLOR} --tail 50"
echo "  docker logs lenza_frontend_${NEW_COLOR} --tail 50"
echo ""
echo "Test the fix at: https://erp.lenza.uz/defects"
