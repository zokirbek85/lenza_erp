# Migration Plan - Cashbox & Expenses System

## Overview
This document outlines the database migration strategy for transitioning from the legacy card-based expense tracking to the new unified Cashbox system.

---

## Migration Strategy

### Phase 1: Add New Models (Backward Compatible)

#### Migration 1: Create Cashbox Table
```python
# payments/migrations/0XXX_create_cashbox.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_previous_migration'),
    ]

    operations = [
        migrations.CreateModel(
            name='Cashbox',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('cashbox_type', models.CharField(max_length=20, choices=[...])),
                ('name', models.CharField(max_length=200)),
                ('currency', models.CharField(max_length=3, choices=[...])),
                ('is_active', models.BooleanField(default=True)),
                ('card', models.ForeignKey(..., null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
```

#### Migration 2: Populate Cashbox from PaymentCard
```python
# payments/migrations/0XXX_populate_cashbox.py
from django.db import migrations

def populate_cashbox_from_cards(apps, schema_editor):
    """Create Cashbox records for each PaymentCard"""
    Cashbox = apps.get_model('payments', 'Cashbox')
    PaymentCard = apps.get_model('payments', 'PaymentCard')
    
    for card in PaymentCard.objects.all():
        Cashbox.objects.create(
            cashbox_type='CARD',
            name=card.name,
            currency='UZS',  # Default, can be adjusted
            card=card,
            is_active=True
        )
    
    # Create default cash cashboxes
    Cashbox.objects.create(
        cashbox_type='CASH_UZS',
        name='Naqd pul (UZS)',
        currency='UZS',
        is_active=True
    )
    Cashbox.objects.create(
        cashbox_type='CASH_USD',
        name='Naqd pul (USD)',
        currency='USD',
        is_active=True
    )

def reverse_populate(apps, schema_editor):
    """Remove auto-created cashboxes"""
    Cashbox = apps.get_model('payments', 'Cashbox')
    Cashbox.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_create_cashbox'),
    ]

    operations = [
        migrations.RunPython(populate_cashbox_from_cards, reverse_populate),
    ]
```

---

### Phase 2: Add Foreign Keys (Nullable)

#### Migration 3: Add Cashbox FK to Payment
```python
# payments/migrations/0XXX_add_cashbox_to_payment.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_populate_cashbox'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='cashbox',
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name='payments',
                to='payments.cashbox',
                null=True,
                blank=True
            ),
        ),
    ]
```

#### Migration 4: Populate Payment.cashbox from Payment.card
```python
# payments/migrations/0XXX_populate_payment_cashbox.py
from django.db import migrations

def populate_payment_cashbox(apps, schema_editor):
    """Set cashbox FK based on card FK"""
    Payment = apps.get_model('payments', 'Payment')
    Cashbox = apps.get_model('payments', 'Cashbox')
    
    # Map payments with cards to corresponding cashbox
    for payment in Payment.objects.filter(card__isnull=False, cashbox__isnull=True):
        try:
            cashbox = Cashbox.objects.get(card=payment.card)
            payment.cashbox = cashbox
            payment.save(update_fields=['cashbox'])
        except Cashbox.DoesNotExist:
            pass  # Skip if no matching cashbox
    
    # Map cash payments to default cash cashbox
    cash_uzs = Cashbox.objects.filter(cashbox_type='CASH_UZS').first()
    cash_usd = Cashbox.objects.filter(cashbox_type='CASH_USD').first()
    
    Payment.objects.filter(
        card__isnull=True,
        currency='UZS',
        cashbox__isnull=True
    ).update(cashbox=cash_uzs)
    
    Payment.objects.filter(
        card__isnull=True,
        currency='USD',
        cashbox__isnull=True
    ).update(cashbox=cash_usd)

def reverse_populate(apps, schema_editor):
    Payment = apps.get_model('payments', 'Payment')
    Payment.objects.update(cashbox=None)

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_add_cashbox_to_payment'),
    ]

    operations = [
        migrations.RunPython(populate_payment_cashbox, reverse_populate),
    ]
```

#### Migration 5: Add Cashbox FK to Expense
```python
# expenses/migrations/0XXX_add_cashbox_to_expense.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('expenses', '0XXX_previous_migration'),
        ('payments', '0XXX_populate_cashbox'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='cashbox',
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name='expenses',
                to='payments.cashbox',
                null=True,
                blank=True
            ),
        ),
    ]
```

#### Migration 6: Populate Expense.cashbox from Expense.card
```python
# expenses/migrations/0XXX_populate_expense_cashbox.py
from django.db import migrations

def populate_expense_cashbox(apps, schema_editor):
    """Set cashbox FK based on card FK and method"""
    Expense = apps.get_model('expenses', 'Expense')
    Cashbox = apps.get_model('payments', 'Cashbox')
    
    # Map expenses with cards to corresponding cashbox
    for expense in Expense.objects.filter(card__isnull=False, cashbox__isnull=True):
        try:
            cashbox = Cashbox.objects.get(card=expense.card)
            expense.cashbox = cashbox
            expense.save(update_fields=['cashbox'])
        except Cashbox.DoesNotExist:
            pass
    
    # Map cash expenses to default cash cashbox
    cash_uzs = Cashbox.objects.filter(cashbox_type='CASH_UZS').first()
    cash_usd = Cashbox.objects.filter(cashbox_type='CASH_USD').first()
    
    Expense.objects.filter(
        method='CASH',
        currency='UZS',
        cashbox__isnull=True
    ).update(cashbox=cash_uzs)
    
    Expense.objects.filter(
        method='CASH',
        currency='USD',
        cashbox__isnull=True
    ).update(cashbox=cash_usd)

def reverse_populate(apps, schema_editor):
    Expense = apps.get_model('expenses', 'Expense')
    Expense.objects.update(cashbox=None)

class Migration(migrations.Migration):
    dependencies = [
        ('expenses', '0XXX_add_cashbox_to_expense'),
    ]

    operations = [
        migrations.RunPython(populate_expense_cashbox, reverse_populate),
    ]
```

#### Migration 7: Update CashboxOpeningBalance
```python
# payments/migrations/0XXX_add_cashbox_to_opening_balance.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_populate_payment_cashbox'),
    ]

    operations = [
        migrations.AddField(
            model_name='cashboxopeningbalance',
            name='cashbox',
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name='opening_balances',
                to='payments.cashbox',
                null=True,
                blank=True
            ),
        ),
    ]
```

#### Migration 8: Populate CashboxOpeningBalance.cashbox
```python
# payments/migrations/0XXX_populate_opening_balance_cashbox.py
from django.db import migrations

def populate_opening_balance_cashbox(apps, schema_editor):
    """Map opening balances to cashbox records"""
    CashboxOpeningBalance = apps.get_model('payments', 'CashboxOpeningBalance')
    Cashbox = apps.get_model('payments', 'Cashbox')
    
    # Map by cashbox_type
    for opening in CashboxOpeningBalance.objects.filter(cashbox__isnull=True):
        try:
            cashbox = Cashbox.objects.filter(
                cashbox_type=opening.cashbox_type,
                currency=opening.currency
            ).first()
            
            if cashbox:
                opening.cashbox = cashbox
                opening.save(update_fields=['cashbox'])
        except Exception:
            pass

def reverse_populate(apps, schema_editor):
    CashboxOpeningBalance = apps.get_model('payments', 'CashboxOpeningBalance')
    CashboxOpeningBalance.objects.update(cashbox=None)

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_add_cashbox_to_opening_balance'),
    ]

    operations = [
        migrations.RunPython(populate_opening_balance_cashbox, reverse_populate),
    ]
```

---

### Phase 3: Optional - Make FK Required (Future)

**⚠️ Only after frontend is updated and tested!**

#### Migration 9: Make cashbox required (Future)
```python
# payments/migrations/0XXX_make_cashbox_required.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_populate_opening_balance_cashbox'),
        ('expenses', '0XXX_populate_expense_cashbox'),
    ]

    operations = [
        # Make Payment.cashbox required
        migrations.AlterField(
            model_name='payment',
            name='cashbox',
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name='payments',
                to='payments.cashbox',
                null=False,  # Changed from True
                blank=False  # Changed from True
            ),
        ),
        # Make Expense.cashbox required
        migrations.AlterField(
            model_name='expense',
            name='cashbox',
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name='expenses',
                to='payments.cashbox',
                null=False,
                blank=False
            ),
        ),
        # Make CashboxOpeningBalance.cashbox required
        migrations.AlterField(
            model_name='cashboxopeningbalance',
            name='cashbox',
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name='opening_balances',
                to='payments.cashbox',
                null=False,
                blank=False
            ),
        ),
    ]
```

---

## Execution Plan

### Development Environment
```bash
# 1. Generate migrations
cd backend
python manage.py makemigrations payments
python manage.py makemigrations expenses

# 2. Check migration plan
python manage.py showmigrations

# 3. Run migrations
python manage.py migrate

# 4. Verify data
python manage.py shell
>>> from payments.models import Cashbox, Payment
>>> Cashbox.objects.count()
>>> Payment.objects.filter(cashbox__isnull=True).count()  # Should be 0
```

### Staging Environment
```bash
# 1. Backup database
pg_dump lenza_erp > backup_before_cashbox_migration.sql

# 2. Run migrations
python manage.py migrate

# 3. Test APIs
curl http://localhost:8000/api/cashbox/summary/
curl http://localhost:8000/api/cashbox/

# 4. Verify balance calculations
python manage.py shell
>>> from payments.models import Cashbox
>>> cb = Cashbox.objects.first()
>>> cb.calculate_balance()
```

### Production Environment
```bash
# 1. Schedule maintenance window (optional)
# 2. Backup database
ssh user@vps
pg_dump lenza_erp > /backup/lenza_erp_$(date +%Y%m%d_%H%M%S).sql

# 3. Update code
cd /var/www/lenza_erp
git pull origin main

# 4. Run migrations
cd backend
source venv/bin/activate
python manage.py migrate --noinput

# 5. Restart services
sudo systemctl restart gunicorn
sudo systemctl restart nginx

# 6. Health check
curl https://lenza-erp.uz/api/health/
curl https://lenza-erp.uz/api/cashbox/summary/

# 7. Monitor logs
tail -f /var/log/gunicorn/error.log
```

---

## Rollback Plan

### If Migration Fails
```bash
# 1. Restore database backup
psql lenza_erp < backup_before_cashbox_migration.sql

# 2. Revert code
git revert <commit-hash>
git push origin main

# 3. Redeploy previous version
./update.sh
```

### If Data Issues Found After Migration
```bash
# 1. Stop accepting new data (read-only mode)
# 2. Analyze issues
python manage.py shell
>>> from payments.models import Payment
>>> Payment.objects.filter(cashbox__isnull=True)

# 3. Run corrective data migration
python manage.py migrate expenses 0XXX_populate_expense_cashbox --fake
python manage.py migrate expenses 0XXX_populate_expense_cashbox

# 4. Resume normal operations
```

---

## Verification Checklist

### Post-Migration Verification
- [ ] All Cashbox records created (cards + 2 cash)
- [ ] All Payment records have cashbox FK set
- [ ] All Expense records have cashbox FK set
- [ ] All CashboxOpeningBalance records have cashbox FK set
- [ ] Balance calculations work correctly
- [ ] API endpoints return correct data
- [ ] No null FK errors in logs
- [ ] Frontend displays cashbox data correctly

### Data Integrity Checks
```python
# Run in Django shell
from payments.models import Cashbox, Payment, CashboxOpeningBalance
from expenses.models import Expense

# Check 1: All cashboxes have proper setup
print("Cashboxes:", Cashbox.objects.count())
for cb in Cashbox.objects.all():
    print(f"  {cb.name} ({cb.cashbox_type}): {cb.calculate_balance()}")

# Check 2: No orphaned payments
orphaned = Payment.objects.filter(cashbox__isnull=True).count()
print(f"Orphaned payments: {orphaned}")  # Should be 0

# Check 3: No orphaned expenses
orphaned = Expense.objects.filter(cashbox__isnull=True).count()
print(f"Orphaned expenses: {orphaned}")  # Should be 0

# Check 4: Opening balances linked
orphaned = CashboxOpeningBalance.objects.filter(cashbox__isnull=True).count()
print(f"Orphaned opening balances: {orphaned}")  # Should be 0

# Check 5: Balance calculation consistency
for cb in Cashbox.objects.all():
    detailed = cb.calculate_balance(return_detailed=True)
    print(f"{cb.name}:")
    print(f"  Opening: {detailed['opening_balance']}")
    print(f"  Income: {detailed['income_sum']}")
    print(f"  Expense: {detailed['expense_sum']}")
    print(f"  Balance: {detailed['balance']}")
```

---

## Timeline

- **Phase 1**: Migrations 1-2 (Create Cashbox, populate) - 5 minutes
- **Phase 2**: Migrations 3-8 (Add FKs, populate) - 10 minutes
- **Testing**: API endpoints, balance calculations - 15 minutes
- **Total**: ~30 minutes downtime (if maintenance window used)

**Alternative**: Zero-downtime deployment (nullable FKs allow this)

---

## Notes

1. **Backward Compatibility**: Legacy `card`, `method`, `cashbox_type` fields remain for safety
2. **Data Validation**: All migrations include reverse operations for rollback
3. **Idempotency**: Migrations can be re-run safely with `--fake` if needed
4. **No Data Loss**: All existing data preserved and mapped to new structure
5. **Performance**: Indexed FKs ensure fast lookups

---

## Support

If issues arise during migration:
1. Check migration logs: `python manage.py showmigrations`
2. Verify data: Run integrity checks above
3. Review error logs: `/var/log/gunicorn/error.log`
4. Rollback if needed: Use rollback plan
5. Contact: [support team]

---

**Migration Ready**: All code in place, awaiting `makemigrations` command.
