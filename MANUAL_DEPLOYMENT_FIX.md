# Manual Deployment Fix - Migration 0020

## Issue
Deployment failed during migration apply step. Migration `0020_add_pending_rejected_status` needs to be applied manually.

## Quick Fix on VPS

### Option 1: Run Migration Manually
```bash
# SSH to VPS
ssh root@vps00405

# Navigate to project directory
cd /opt/lenza_erp

# Check running containers
docker ps | grep lenza

# Run migration in green backend container
docker exec lenza_backend_green python manage.py migrate

# Check migration status
docker exec lenza_backend_green python manage.py showmigrations finance

# Expected output should show:
# finance
#  [X] 0020_add_pending_rejected_status
```

### Option 2: Re-run Update Script
```bash
cd /opt/lenza_erp
bash update.sh
```

## Verify Migration Applied

### Check Database
```bash
docker exec lenza_backend_green python manage.py dbshell

# In PostgreSQL shell:
SELECT status FROM finance_financetransaction LIMIT 1;

# Should accept: 'pending', 'approved', 'rejected', etc.
# Exit with: \q
```

### Check Container Logs
```bash
# Backend logs
docker logs lenza_backend_green --tail 100

# Look for migration output:
# "Running migrations:
#   Applying finance.0020_add_pending_rejected_status... OK"
```

## Switch to Green Stack

If migration successful but script failed, switch manually:

```bash
cd /opt/lenza_erp/deploy

# Update nginx config
sudo cp nginx.conf.green /etc/nginx/sites-available/lenza_erp
sudo nginx -t
sudo systemctl reload nginx

# Stop blue stack
docker compose -f docker-compose.blue.yml stop

# Update active stack marker
echo "green" > /opt/lenza_erp/.active_stack
```

## Rollback if Needed

If migration has issues:

```bash
# Stop green stack
docker compose -f docker-compose.green.yml stop

# Keep blue stack running (already active)
docker compose -f docker-compose.blue.yml ps

# Revert code
cd /opt/lenza_erp
git reset --hard dec3cec  # Previous commit before manager payment feature
```

## Troubleshooting

### Error: "Column 'status' does not exist"
**Solution**: Migration not applied. Run Option 1 above.

### Error: "Invalid choice: 'pending'"
**Solution**: Check migration file exists:
```bash
docker exec lenza_backend_green ls -la /app/finance/migrations/ | grep 0020
```

### Error: "Permission denied"
**Solution**: Check Django user permissions:
```bash
docker exec lenza_backend_green whoami
docker exec lenza_backend_green ls -la /app/
```

### Container Won't Start
**Solution**: Check logs and rebuild:
```bash
docker logs lenza_backend_green
docker compose -f docker-compose.green.yml down
docker compose -f docker-compose.green.yml up -d --build
```

## Update Script Fix

The update.sh script has been improved to handle migration errors better:

```bash
# Old version (fails silently):
docker exec "$BACKEND_CONTAINER" python manage.py migrate --noinput

# New version (checks exit code):
if docker exec "$BACKEND_CONTAINER" python manage.py migrate --noinput 2>&1; then
    log_info "✓ Migrations applied successfully"
else
    log_error "Migration failed"
    exit 1
fi
```

## Post-Deployment Verification

After successful deployment:

### 1. Test API Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://erp.lenza.uz/api/finance/manager-dealers/ | jq
```

### 2. Test Frontend
- Login as sales manager
- Go to Orders page
- Verify "💳 To'lov yaratish" button visible
- Click and test modal opens

### 3. Test Permission
- Login as sales manager
- Try to access `/finance` directly
- Should be redirected or show error

### 4. Check Database
```bash
docker exec lenza_backend_green python manage.py shell
```

```python
from finance.models import FinanceTransaction
from django.contrib.auth import get_user_model

User = get_user_model()

# Check pending status works
FinanceTransaction.objects.filter(status='pending').count()

# Check sales manager
sales_user = User.objects.filter(role='sales').first()
print(f"Sales user: {sales_user.username}")
print(f"Dealers: {sales_user.dealers.all()}")
```

## Complete Deployment Command Sequence

If starting fresh:

```bash
# On VPS
cd /opt/lenza_erp

# Pull latest
git pull origin main

# Run update script
bash update.sh

# If fails at migration, do manual:
docker exec lenza_backend_green python manage.py migrate

# Continue health checks manually:
docker exec lenza_backend_green curl -f http://127.0.0.1:8000/api/health/

# Switch nginx
sudo cp deploy/nginx.conf.green /etc/nginx/sites-available/lenza_erp
sudo nginx -t
sudo systemctl reload nginx

# Update marker
echo "green" > .active_stack

# Cleanup old stack
docker compose -f deploy/docker-compose.blue.yml down
```

## Success Indicators

✅ Migration 0020 shown in `showmigrations` with `[X]`
✅ Backend container healthy (responds to `/api/health/`)
✅ Frontend serves (check `https://erp.lenza.uz`)
✅ Nginx proxies to green stack (check logs: `tail -f /var/log/nginx/access.log`)
✅ Old blue containers stopped
✅ `.active_stack` file shows `green`

## Cleanup Old Containers

After successful deployment:

```bash
# Remove old images
docker image prune -a -f

# Check disk space
df -h
docker system df
```

## Contact

If issues persist, check:
- Backend logs: `docker logs lenza_backend_green -f`
- Database logs: `docker logs lenza_db -f`
- Nginx logs: `tail -f /var/log/nginx/error.log`
