# Deployment Instructions for Orders Export Fix & Status Cards

## Issue
- `/api/orders/export/excel/` returns 500 error
- Cause: Directory mismatch (`/app/media/temp` vs `/app/media/tmp`)

## Changes Made
1. ✅ Fixed Dockerfile: `temp` → `tmp`
2. ✅ Fixed docker-entrypoint.sh: `temp` → `tmp`
3. ✅ Fixed fix_media_permissions.sh: `temp` → `tmp`
4. ✅ Added OrderStatusStatAPIView endpoint
5. ✅ Added OrderStatusCards component to frontend

## Deploy Steps

### Quick Deploy (Copy-paste to VPS terminal):

```bash
cd /opt/lenza_erp && \
git pull origin main && \
mkdir -p /var/www/lenza_erp/media/tmp && \
chmod 777 /var/www/lenza_erp/media/tmp && \
docker-compose build backend && \
docker-compose up -d backend && \
sleep 10 && \
docker-compose exec -T backend ls -la /app/media/ && \
docker-compose logs backend --tail=20
```

### Or Step-by-Step:

```bash
# 1. SSH to VPS
ssh root@lenza.uz

# 2. Navigate to project
cd /opt/lenza_erp

# 3. Pull changes
git pull origin main

# 4. Create tmp directory on host
mkdir -p /var/www/lenza_erp/media/tmp
chmod 777 /var/www/lenza_erp/media/tmp

# 5. Rebuild backend
docker-compose build backend

# 6. Restart
docker-compose up -d backend

# 7. Wait for startup
sleep 10

# 8. Verify
docker-compose exec backend ls -la /app/media/
# Should show: drwxrwxrwx ... tmp

# 9. Test export
# Go to https://erp.lenza.uz/orders and click "Export Excel"

# 10. Check logs if issues
docker-compose logs backend --tail=50
```

## Verification

1. **Excel Export**: Visit https://erp.lenza.uz/orders → Click "Экспорт Excel"
2. **Status Cards**: Should see 7 status cards at top of orders page
3. **Status Filter**: Click any card to filter orders by that status

## Rollback (if needed)

```bash
cd /opt/lenza_erp
git reset --hard HEAD~3
docker-compose build backend
docker-compose up -d backend
```

## What's New

### Backend
- `OrderStatusStatAPIView` - Returns order counts by status
- Endpoint: `GET /api/orders/status-stat/`
- Fixed: `/app/media/tmp` directory creation

### Frontend
- Order status statistics cards with:
  - Real-time counts per status
  - Click to filter
  - Auto-refresh every 60s
  - Responsive grid layout
  - Dark mode support
