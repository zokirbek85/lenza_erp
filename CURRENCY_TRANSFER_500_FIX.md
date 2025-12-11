# Currency Transfer 500 Error Fix

## Deployment Steps

1. **Apply the migration:**
```bash
cd /path/to/backend
python manage.py migrate finance
```

2. **If using Docker:**
```bash
docker-compose exec backend python manage.py migrate finance
```

3. **Restart the server:**
```bash
# Systemd
sudo systemctl restart lenza-backend

# Or Docker
docker-compose restart backend
```

4. **Verify the fix:**
- Go to Finance module
- Click on "USD → UZS Konvertatsiya"
- Fill in the form and submit
- Should now complete successfully instead of 500 error

## What Was Changed

- File: `backend/finance/models.py`
- Line: 336-341
- Change: Added `blank=True` to `created_by` field
- Migration: `0013_rename_finance_exp_isglobal_is_active_idx_finance_exp_is_glob_83d151_idx_and_more.py`

## Root Cause

The `created_by` field had `null=True` (allows NULL in DB) but was missing `blank=True` (required for validation). When creating a currency transfer transaction, the model's `save()` method calls `full_clean()` which validates all fields. Without `blank=True`, Django treats the field as required and raises a validation error, resulting in a 500 error.
