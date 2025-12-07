# Reconciliation Excel Export Fix

## Issue
Getting 500 error when exporting reconciliation report to Excel:
```
GET https://erp.lenza.uz/api/dealers/90/reconciliation/excel/?from_date=2025-11-01&to_date=2025-12-07&detailed=true 500 (Internal Server Error)
```

## Root Cause
The `/app/media/tmp` directory inside the Docker container (mounted from `/var/www/lenza_erp/media` on the host) doesn't exist or has incorrect permissions.

## Quick Fix (Run on VPS)

```bash
ssh root@lenza.uz

# Option 1: Use the fix script
cd /opt/lenza_erp
bash fix_media_permissions.sh

# Option 2: Manual fix
mkdir -p /var/www/lenza_erp/media/tmp
chmod 777 /var/www/lenza_erp/media/tmp

# Verify
ls -la /var/www/lenza_erp/media/
```

## Test
1. Go to https://erp.lenza.uz/reconciliation
2. Select a dealer and date range
3. Click "Export to Excel" (with or without detailed view)
4. Excel file should download successfully

## Technical Details
- Export endpoint: `/api/dealers/<id>/reconciliation/excel/`
- Temp file location: `/app/media/tmp/reconciliation-*.xlsx` (inside container)
- Host mount: `/var/www/lenza_erp/media/tmp/`
- Django user UID: 999 (inside container)

## Related Files
- `backend/dealers/views.py` - `DealerReconciliationExcelView`
- `backend/core/utils/exporter.py` - `export_reconciliation_to_excel()`
- `backend/core/utils/temp_files.py` - `save_temp_file()`
- `backend/docker-entrypoint.sh` - Creates tmp directory on startup
- `fix_media_permissions.sh` - Host-side permission fix script

## Notes
- The same issue may affect other exports (products, orders, payments, etc.)
- All export functions use the `save_temp_file()` utility which writes to `/app/media/tmp/`
- Running `fix_media_permissions.sh` fixes all export endpoints at once
