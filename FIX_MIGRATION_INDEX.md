# Fix Migration Index Error

## Error
```
django.db.utils.ProgrammingError: relation "finance_exp_isglobal_is_active_idx" does not exist
```

## Root Cause
Previous migration tries to rename/alter an index that doesn't exist in the database. This happens when:
- Migration was applied on dev but not on production
- Database schema is out of sync with migrations
- Index was manually dropped or never created

## Solution Options

### Option 1: Fake the Problematic Migration (Recommended)

```bash
# SSH to VPS
cd /opt/lenza_erp

# Start blue stack (working version)
docker compose -f deploy/docker-compose.blue.yml up -d

# Get into blue backend container
docker exec -it lenza_backend_blue bash

# Check applied migrations
python manage.py showmigrations finance

# Find the migration that creates/modifies this index
# Look for migration before 0020
python manage.py showmigrations finance | grep -B5 "0020"

# If a migration is unapplied, fake it:
python manage.py migrate finance 0019_whatever --fake

# Exit container
exit
```

### Option 2: Create Missing Index Manually

```bash
# Connect to database
docker exec -it lenza_db psql -U lenzaerp lenza_erp_db

# Check existing indexes
\di finance_*

# Check if the index exists with different name
SELECT indexname FROM pg_indexes WHERE tablename LIKE 'finance_%' ORDER BY indexname;

# If index exists with different name, rename it:
ALTER INDEX old_name RENAME TO finance_exp_isglobal_is_active_idx;

# Or create it if missing:
CREATE INDEX finance_exp_isglobal_is_active_idx 
ON finance_expensecategory (is_global, is_active);

# Exit
\q
```

### Option 3: Check and Fix Migration Files

```bash
cd /opt/lenza_erp/backend/finance/migrations

# Find migrations that reference the index
grep -r "finance_exp_isglobal_is_active_idx" *.py

# Look at the migration file
cat 00XX_migration_with_index.py
```

The migration might have `RenameIndex` or `AlterIndex` operation. You can:
1. Comment out the operation temporarily
2. Or fake that migration
3. Or manually create the index with correct name

### Option 4: Check Current Blue Stack State

```bash
# Check what migrations are applied on working blue stack
docker exec lenza_backend_blue python manage.py showmigrations finance

# Compare with local dev
# Local: backend/finance/migrations/
# Should match production applied migrations
```

## Quick Fix Command Sequence

```bash
# On VPS - Run these in order:

# 1. Stop failed green stack
docker compose -f deploy/docker-compose.green.yml down

# 2. Ensure blue stack is running
docker compose -f deploy/docker-compose.blue.yml up -d

# 3. Check database indexes
docker exec -it lenza_db psql -U lenzaerp lenza_erp_db -c "\di finance_*"

# 4. Check applied migrations on blue (working)
docker exec lenza_backend_blue python manage.py showmigrations finance | tail -10

# 5. Create missing index if it doesn't exist
docker exec -it lenza_db psql -U lenzaerp lenza_erp_db -c "
CREATE INDEX IF NOT EXISTS finance_exp_isglobal_is_active_idx 
ON finance_expensecategory (is_global, is_active);
"

# 6. Try update again
bash update.sh
```

## Alternative: Skip Problematic Migration

If the index is not critical for the new feature (manager payment), you can:

1. Edit migration file to comment out the index operation
2. Commit and push
3. Deploy again

```python
# In migration file, change:
migrations.RenameIndex(
    model_name='expensecategory',
    old_name='old_index_name',
    new_name='finance_exp_isglobal_is_active_idx',
),

# To:
# migrations.RenameIndex(
#     model_name='expensecategory',
#     old_name='old_index_name',
#     new_name='finance_exp_isglobal_is_active_idx',
# ),
```

## Verify Fix

After applying fix:

```bash
# Check migration status
docker exec lenza_backend_green python manage.py showmigrations finance

# All should show [X]:
# finance
#  [X] 0019_...
#  [X] 0020_add_pending_rejected_status

# Check backend starts without error
docker logs lenza_backend_green --tail 50

# Should see:
# "Applying finance.0020_add_pending_rejected_status... OK"
```

## Prevention

To avoid this in future:

1. **Always check migrations before deploy:**
   ```bash
   python manage.py showmigrations
   ```

2. **Test migrations on staging first**

3. **Keep dev database in sync with production schema**

4. **Document manual database changes**

## Contact DBA

If none of above works, you may need to:
1. Export production data
2. Recreate database schema from scratch
3. Import data back

**Only do this as last resort!**
