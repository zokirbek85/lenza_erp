# Finance Sources + Expenses - Deployment TODO

## ✅ Completed

### Backend
- [x] Created FinanceSource model with balance tracking
- [x] Created ExpenseCategory model  
- [x] Created Expense model with approval workflow
- [x] Created FinanceLog audit trail model
- [x] Added source FK to Payment model
- [x] Implemented 6 signal handlers for balance tracking
- [x] Created serializers for all models
- [x] Created viewsets with permissions
- [x] Registered models in admin
- [x] Added URL routes
- [x] Generated migration file

### Frontend
- [x] Created financeApi.ts API client
- [x] Created FinanceSources page with CRUD
- [x] Created Expenses page with approval workflow
- [x] Added routes to router.tsx
- [x] Added menu items to Sidebar

### Documentation
- [x] Created implementation summary
- [x] Created testing guide
- [x] Created deployment scripts (Bash & PowerShell)

---

## 🔄 Pending - Deployment Tasks

### Step 1: Run Migrations
```powershell
cd d:\Project\new\lenza_erp\backend
python manage.py migrate payments
```

**Verification:**
- [ ] Migration 0020_expensecategory_financesource... applied successfully
- [ ] No errors in migration output
- [ ] All tables created: payments_financesource, payments_expensecategory, payments_expense, payments_financelog
- [ ] Payment table has source_id column

---

### Step 2: Seed Initial Data
```powershell
cd d:\Project\new\lenza_erp
.\deploy_finance.ps1
```

**Or manually:**
```powershell
cd d:\Project\new\lenza_erp\backend

# Create expense categories
python manage.py shell
>>> from payments.models import ExpenseCategory
>>> ExpenseCategory.objects.create(name="Office Supplies", description="Pens, paper, office equipment")
>>> ExpenseCategory.objects.create(name="Utilities", description="Electricity, water, internet")
>>> ExpenseCategory.objects.create(name="Salaries", description="Employee salaries")
>>> ExpenseCategory.objects.create(name="Marketing", description="Advertising")
>>> ExpenseCategory.objects.create(name="Travel", description="Business travel")
>>> exit()

# Create finance sources
python manage.py shell
>>> from payments.models import FinanceSource
>>> FinanceSource.objects.create(name="Main Cash USD", type="cash", currency="USD")
>>> FinanceSource.objects.create(name="Main Cash UZS", type="cash", currency="UZS")
>>> FinanceSource.objects.create(name="Bank Account USD", type="bank", currency="USD")
>>> exit()
```

**Verification:**
- [ ] At least 3-5 expense categories created
- [ ] At least 2-3 finance sources created (USD and UZS)
- [ ] Data visible in admin: http://localhost:8000/admin/payments/

---

### Step 3: Update Existing Payments (Optional but Recommended)

**Option A: Bulk assign to default source**
```python
from payments.models import Payment, FinanceSource

# Get or create default source
default_source_usd = FinanceSource.objects.get_or_create(
    name="Migration - USD Cash", 
    defaults={"type": "cash", "currency": "USD"}
)[0]

default_source_uzs = FinanceSource.objects.get_or_create(
    name="Migration - UZS Cash",
    defaults={"type": "cash", "currency": "UZS"}
)[0]

# Update all USD payments
Payment.objects.filter(currency='USD', source__isnull=True).update(source=default_source_usd)

# Update all UZS payments
Payment.objects.filter(currency='UZS', source__isnull=True).update(source=default_source_uzs)
```

**Option B: Manual assignment in admin**
- Go to admin panel
- Filter payments by source=null
- Manually assign appropriate sources

**Verification:**
- [ ] Existing payments linked to sources
- [ ] No null source_id for approved payments

---

### Step 4: Recalculate Finance Source Balances

**Important:** After linking payments to sources, recalculate balances:

```python
from payments.models import Payment, Expense, FinanceSource
from decimal import Decimal

for source in FinanceSource.objects.all():
    # Calculate from approved payments
    payment_total = Payment.objects.filter(
        source=source,
        status='approved'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Calculate from approved expenses
    expense_total = Expense.objects.filter(
        source=source,
        status='approved'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Update balance
    source.balance = payment_total - expense_total
    source.save()
    
    print(f"{source.name}: {source.balance} {source.currency}")
```

**Verification:**
- [ ] All finance source balances calculated
- [ ] Balances match expected totals
- [ ] No negative balances (unless expected)

---

### Step 5: Create FinanceLog Entries for Existing Data (Optional)

```python
from payments.models import Payment, Expense, FinanceSource, FinanceLog
from decimal import Decimal

# For each approved payment, create log entry
for payment in Payment.objects.filter(status='approved', source__isnull=False):
    FinanceLog.objects.get_or_create(
        source=payment.source,
        reference_type='payment',
        reference_id=payment.id,
        defaults={
            'type': 'payment_in',
            'amount': payment.amount,
            'old_balance': Decimal('0'),  # Unknown historical value
            'new_balance': payment.amount,
            'description': f'Payment from {payment.dealer.name if payment.dealer else "Unknown"}',
            'created_by': payment.approved_by,
        }
    )

print(f"Created {FinanceLog.objects.count()} log entries")
```

**Verification:**
- [ ] FinanceLog entries created for historical payments
- [ ] No duplicate log entries

---

### Step 6: Frontend Build & Deploy

```powershell
cd d:\Project\new\lenza_erp\frontend

# Install any new dependencies (if needed)
npm install

# Build production bundle
npm run build

# Deploy dist/ folder to your web server
```

**Verification:**
- [ ] Build completes without errors
- [ ] dist/ folder contains index.html and assets
- [ ] No console errors when loading app

---

### Step 7: Test in Production Environment

**Backend Tests:**
- [ ] API endpoints accessible: /api/finance-sources/, /api/expenses/
- [ ] Can create finance source via API
- [ ] Can create expense via API
- [ ] Can approve expense via API
- [ ] Balance updates correctly
- [ ] FinanceLog entries created

**Frontend Tests:**
- [ ] Finance Sources page loads
- [ ] Expenses page loads
- [ ] Can create expense with file upload
- [ ] Can approve/reject expense
- [ ] Filters work correctly
- [ ] Export buttons work

**Permission Tests:**
- [ ] Sales user can create expense but cannot approve
- [ ] Accountant can approve expense
- [ ] Admin can manage finance sources
- [ ] Sales user cannot edit finance sources

---

### Step 8: User Training

**Train accountants on:**
- [ ] How to create/manage finance sources
- [ ] How to approve/reject expenses
- [ ] How to view finance logs for audit
- [ ] How to check available balances

**Train sales team on:**
- [ ] How to create expense requests
- [ ] How to upload receipt images
- [ ] How to check expense status
- [ ] What happens after approval

**Documentation to provide:**
- [ ] User manual for expense submission
- [ ] User manual for expense approval
- [ ] FAQ document
- [ ] Video tutorials (optional)

---

### Step 9: Monitoring Setup

**Set up alerts for:**
- [ ] Low balance warnings (< 1000 USD/UZS)
- [ ] Pending expenses older than 3 days
- [ ] Failed approvals (insufficient balance)
- [ ] Unusual expense amounts

**Create reports:**
- [ ] Daily expense summary by category
- [ ] Weekly finance source balance report
- [ ] Monthly expense trends
- [ ] Expense approval time metrics

---

### Step 10: Gradual Migration

**Phase 1 (Week 1):**
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Fix any critical issues
- [ ] Collect user feedback

**Phase 2 (Week 2):**
- [ ] Encourage expense submissions through new system
- [ ] Train additional users
- [ ] Add more expense categories if needed
- [ ] Create custom finance sources per department

**Phase 3 (Week 3):**
- [ ] Make expense submission mandatory
- [ ] Migrate all payments to use finance sources
- [ ] Deactivate old cashbox system (if any)
- [ ] Run full audit of finance logs

---

## 🔒 Security Checklist

- [ ] Only admin/accountant can approve expenses
- [ ] Only admin/accountant can create/edit finance sources
- [ ] File uploads restricted to images only
- [ ] Receipt images stored securely
- [ ] API endpoints protected with authentication
- [ ] CORS configured properly for production
- [ ] No sensitive data in frontend bundle

---

## 📊 Success Metrics

**Week 1 Targets:**
- [ ] 0 migration errors
- [ ] 0 critical bugs
- [ ] 100% of accountants trained
- [ ] 50% of sales team using new system

**Week 2 Targets:**
- [ ] 0 data inconsistencies
- [ ] < 5 minutes average approval time
- [ ] 100% of sales team using new system
- [ ] All new payments linked to sources

**Week 3 Targets:**
- [ ] Old cashbox system fully deprecated
- [ ] 100% audit trail coverage
- [ ] Finance log accuracy verified
- [ ] User satisfaction > 80%

---

## 🐛 Known Issues to Watch

1. **Currency Mismatch Errors**
   - Watch for users trying to create expenses in wrong currency
   - Add frontend warning if source currency doesn't match

2. **Balance Drift**
   - Monitor for discrepancies between finance source balance and finance log totals
   - Run weekly reconciliation script

3. **Concurrent Approvals**
   - Watch for race conditions with multiple accountants
   - Current signals should handle this, but monitor logs

4. **File Upload Size**
   - Ensure receipt images don't exceed size limits
   - Add frontend validation for file size

---

## 📞 Support Contacts

**Technical Issues:**
- Backend Developer: [Your Name]
- Frontend Developer: [Your Name]
- DevOps: [DevOps Team]

**Business Issues:**
- Accountant Lead: [Name]
- Sales Manager: [Name]

---

## 🚨 Rollback Plan

If critical issues arise:

1. **Backend Rollback:**
```bash
cd backend
python manage.py migrate payments 0019_drop_expenses_tables
```

2. **Frontend Rollback:**
```bash
# Redeploy previous frontend version
git checkout <previous_commit>
npm run build
# Deploy dist/
```

3. **Database Rollback:**
```sql
-- Backup first!
pg_dump -U postgres -d lenza_erp > backup_before_rollback.sql

-- Remove source FK from payments
ALTER TABLE payments_payment DROP COLUMN source_id;

-- Drop new tables
DROP TABLE payments_financelog;
DROP TABLE payments_expense;
DROP TABLE payments_expensecategory;
DROP TABLE payments_financesource;
```

---

**Last Updated**: January 27, 2025  
**Status**: Ready for deployment  
**Next Action**: Run migrations and seed data
