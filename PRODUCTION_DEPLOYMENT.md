# Production Deployment - Defects Stock-Based Fix

## Changes Summary

### Backend
- **File**: `backend/core/urls.py`
- **Change**: Reordered router registration to fix `/api/defects/stock/` 404 error
- **Impact**: Defects page will now query Product.stock_defect instead of empty ProductDefect table

### Frontend  
- **File**: `frontend/src/api/defects.ts`
- **Change**: Updated endpoints to use `/defects/stock/` instead of `/defects/`
- **File**: `frontend/src/pages/Defects.tsx`
- **Change**: Simplified to read-only view with "View Product" links

## Deployment Steps (VPS)

### Quick Deploy (Recommended)

```bash
# SSH to VPS
ssh root@your-vps-ip

# Navigate to project
cd /opt/lenza_erp

# Pull latest changes
git pull origin main

# Option 1: Use deployment script
chmod +x deploy_defects_fix.sh
./deploy_defects_fix.sh

# Option 2: Manual deployment
docker-compose build backend frontend
docker-compose up -d --force-recreate backend_green frontend_green
docker-compose exec nginx nginx -s reload
```

### Verification

1. **Check backend health**:
```bash
curl http://localhost:8000/api/health/
```

2. **Test defects endpoint**:
```bash
curl http://localhost:8000/api/defects/stock/?page=1&page_size=5
```
Should return JSON with defect data (not 404)

3. **Check logs**:
```bash
docker logs lenza_backend_green --tail 50
```

4. **Test frontend**:
Navigate to: `https://erp.lenza.uz/defects`
- Should display products with defective stock
- Should show quantities matching Products page

## Rollback Plan

If issues occur:

```bash
# Revert code
cd /opt/lenza_erp
git revert HEAD
git push origin main

# Rebuild and redeploy
docker-compose build backend frontend
docker-compose up -d --force-recreate
```

## Expected Results

### Before Fix
- `/defects` page: Empty (0 items)
- API call: `GET /api/defects/` returns empty results
- Database: 198 products with stock_defect > 0 (ignored)

### After Fix
- `/defects` page: Shows 198 products
- API call: `GET /api/defects/stock/` returns products with defects
- Numbers match between `/products` and `/defects` pages

## Files Modified

```
backend/core/urls.py                    # URL routing order
backend/catalog/serializers.py          # Null safety fixes
frontend/src/api/defects.ts             # API endpoints
frontend/src/pages/Defects.tsx          # UI simplification
```

## Database Impact

**No migrations needed** - using existing `Product.stock_defect` field.

## Testing Checklist

- [ ] Backend API responds to `/api/defects/stock/`
- [ ] Frontend displays defects correctly
- [ ] Quantities match Products page
- [ ] Export Excel works
- [ ] "View Product" links work
- [ ] No console errors
- [ ] Performance acceptable (pagination works)

## Support

If issues arise:
1. Check nginx logs: `docker logs nginx --tail 100`
2. Check backend logs: `docker logs lenza_backend_green --tail 100`
3. Check frontend logs: `docker logs lenza_frontend_green --tail 100`
4. Verify DNS/SSL: `curl -I https://erp.lenza.uz/api/health/`
