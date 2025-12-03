# Finance Migration Fix - VPS Deployment Guide

## Problem Summary
- Migration numbering conflict (two 0002_ files)
- Merge migration created unnecessarily
- PostgreSQL already has `finance_exchangerate` table
- Django migration state out of sync

## Solution Applied
- Removed duplicate 0002_exchangerate.py
- Deleted merge migration 0004_merge_20251204_0328.py  
- Created proper 0004_exchangerate.py

## VPS Deployment Steps

### Option 1: Fake Migration (Recommended - table already exists)
```bash
cd /opt/lenza_erp
git pull origin main

# Enter backend container
docker exec -it lenza_backend_green bash
# or
docker exec -it lenza_backend_blue bash

# Fake the migration since table already exists
python manage.py migrate finance 0004_exchangerate --fake

# Verify
python manage.py showmigrations finance
```

Expected output:
```
finance
 [X] 0001_initial
 [X] 0002_seed_cash_accounts
 [X] 0003_alter_financetransaction_amount_usd
 [X] 0004_exchangerate
```

### Option 2: Drop and Recreate (if fake doesn't work)
```bash
# Enter PostgreSQL
docker exec -it lenza_db psql -U lenza_user -d lenza_db

# Drop existing table
DROP TABLE IF EXISTS finance_exchangerate CASCADE;
\q

# Enter backend container
docker exec -it lenza_backend_green bash

# Run migration normally
python manage.py migrate finance

# Verify
python manage.py showmigrations finance
```

### Option 3: Full Reset (last resort)
```bash
# DANGER: This deletes all finance data!
docker exec -it lenza_db psql -U lenza_user -d lenza_db

# Reset finance migrations
DELETE FROM django_migrations WHERE app='finance';
DROP TABLE IF EXISTS finance_exchangerate CASCADE;
DROP TABLE IF EXISTS finance_financetransaction CASCADE;
DROP TABLE IF EXISTS finance_financeaccount CASCADE;
\q

# Recreate everything
docker exec -it lenza_backend_green bash
python manage.py migrate finance
```

## Verification Checklist

After deployment:

1. **Check migration state:**
```bash
docker exec lenza_backend_green python manage.py showmigrations finance
```

2. **Test ExchangeRate API:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://erp.lenza.uz/api/finance/exchange-rates/
```

3. **Test in browser:**
- Login to https://erp.lenza.uz
- Navigate to Currency Rates page
- Add new exchange rate
- Verify it appears in list

4. **Check Django admin:**
- Login to https://erp.lenza.uz/admin/
- Finance → Exchange rates
- Should be visible and manageable

## Migration History (Final)

```
0001_initial.py
  └─ Creates: FinanceAccount, FinanceTransaction
  
0002_seed_cash_accounts.py  
  └─ Seeds: Default Cash UZS and Cash USD accounts
  
0003_alter_financetransaction_amount_usd.py
  └─ Alters: amount_usd field configuration
  
0004_exchangerate.py (NEW)
  └─ Creates: ExchangeRate model (rate_date, usd_to_uzs)
```

## Files Changed

**Deleted:**
- `backend/finance/migrations/0002_exchangerate.py` (duplicate number)
- `backend/finance/migrations/0004_merge_20251204_0328.py` (unnecessary)

**Created:**
- `backend/finance/migrations/0004_exchangerate.py` (correct position)

**No changes to:**
- Models (ExchangeRate already defined)
- Serializers (ExchangeRateSerializer already defined)
- Views (ExchangeRateViewSet already defined)
- URLs (endpoint already registered)
- Admin (already registered)

## Troubleshooting

### Error: "relation finance_exchangerate already exists"
**Solution:** Use `--fake` option (see Option 1 above)

### Error: "migration finance.0004_exchangerate is applied before its dependency"
**Solution:** Database migration table is corrupted. Use Option 2 or 3.

### Error: "No such table: django_migrations"
**Solution:** Run `python manage.py migrate` without app name first.

## Support

If issues persist:
1. Check container logs: `docker logs lenza_backend_green`
2. Check database: `docker exec -it lenza_db psql -U lenza_user -d lenza_db -c "\dt finance_*"`
3. Verify migration files match Git: `git diff backend/finance/migrations/`
