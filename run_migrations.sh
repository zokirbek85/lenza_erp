#!/bin/bash

# Run migrations on VPS server
# This script connects to VPS and runs migrations inside Docker container

set -e

echo "========================================"
echo "Running Migrations on VPS"
echo "========================================"

VPS_HOST="95.142.46.43"
VPS_USER="root"
CONTAINER_NAME="lenza_backend_blue"

echo "[1/3] Connecting to VPS..."
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
set -e

echo "[2/3] Running migrations in container..."
docker exec lenza_backend_blue python manage.py migrate dealers --noinput

echo "[3/3] Checking migration status..."
docker exec lenza_backend_blue python manage.py showmigrations dealers | tail -5

echo "✓ Migrations completed successfully!"
ENDSSH

echo ""
echo "========================================"
echo "Migration Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Restart backend: ssh root@95.142.46.43 'docker restart lenza_backend_blue'"
echo "2. Check logs: ssh root@95.142.46.43 'docker logs lenza_backend_blue --tail 50'"
