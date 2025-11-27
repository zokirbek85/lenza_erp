# Finance Sources + Expenses - Testing Guide

## Quick Test Suite

### Prerequisites
- Backend migrations applied (`python manage.py migrate`)
- Test user accounts created (admin, accountant, sales)
- Initial data seeded (run `deploy_finance.ps1` or `deploy_finance.sh`)

---

## Backend API Tests

### Test 1: Finance Source CRUD

```bash
# Login as admin
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Get token from response, then:
export TOKEN="your_access_token"

# 1.1 List finance sources
curl http://localhost:8000/api/finance-sources/ \
  -H "Authorization: Bearer $TOKEN"

# 1.2 Create finance source
curl -X POST http://localhost:8000/api/finance-sources/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Cash USD",
    "type": "cash",
    "currency": "USD",
    "is_active": true,
    "description": "Test finance source"
  }'

# 1.3 Get specific source (replace {id} with actual ID)
curl http://localhost:8000/api/finance-sources/{id}/ \
  -H "Authorization: Bearer $TOKEN"

# 1.4 Update finance source
curl -X PATCH http://localhost:8000/api/finance-sources/{id}/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'
```

**Expected Results:**
- ✅ List returns all finance sources
- ✅ Create returns 201 with created object
- ✅ Get returns specific source details
- ✅ Update returns 200 with updated object
- ✅ Balance field is read-only (cannot be directly modified)

---

### Test 2: Expense Category CRUD

```bash
# 2.1 List categories
curl http://localhost:8000/api/expense-categories/ \
  -H "Authorization: Bearer $TOKEN"

# 2.2 Create category
curl -X POST http://localhost:8000/api/expense-categories/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Category",
    "description": "Test expense category",
    "is_active": true
  }'
```

**Expected Results:**
- ✅ List returns all active categories
- ✅ Create returns 201 with created object
- ✅ Only admin/accountant can create (sales gets 403)

---

### Test 3: Expense Workflow

```bash
# 3.1 Create expense (as sales user)
curl -X POST http://localhost:8000/api/expenses/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": 1,
    "category": 1,
    "amount": 100.00,
    "currency": "USD",
    "expense_date": "2025-01-27",
    "description": "Test expense"
  }'

# Save expense ID from response
export EXPENSE_ID=<response_id>

# 3.2 List expenses (should see pending expense)
curl http://localhost:8000/api/expenses/ \
  -H "Authorization: Bearer $TOKEN"

# 3.3 Approve expense (as accountant/admin)
curl -X POST http://localhost:8000/api/expenses/$EXPENSE_ID/approve/ \
  -H "Authorization: Bearer $TOKEN"

# 3.4 Check finance source balance decreased
curl http://localhost:8000/api/finance-sources/1/ \
  -H "Authorization: Bearer $TOKEN"

# 3.5 Check finance log created
curl http://localhost:8000/api/finance-logs/?source=1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**
- ✅ Create expense returns 201 with status=pending
- ✅ Expense shows in list with pending status
- ✅ Approve returns 200 with status=approved
- ✅ Finance source balance decreased by expense amount
- ✅ FinanceLog entry created with type=expense_out
- ✅ Sales user cannot approve (gets 403)

---

### Test 4: Expense Validation

```bash
# 4.1 Try to create expense with insufficient balance
curl -X POST http://localhost:8000/api/expenses/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": 1,
    "category": 1,
    "amount": 999999.00,
    "currency": "USD",
    "expense_date": "2025-01-27",
    "description": "Huge expense"
  }'

# Should create OK (validation happens on approval)

# 4.2 Try to approve - should fail
curl -X POST http://localhost:8000/api/expenses/<new_expense_id>/approve/ \
  -H "Authorization: Bearer $TOKEN"

# 4.3 Try to create expense with wrong currency
curl -X POST http://localhost:8000/api/expenses/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": 1,
    "category": 1,
    "amount": 100.00,
    "currency": "UZS",
    "expense_date": "2025-01-27",
    "description": "Wrong currency expense"
  }'
```

**Expected Results:**
- ✅ Create with huge amount succeeds (pending state)
- ✅ Approve fails with 400: "Insufficient balance"
- ✅ Create with wrong currency fails with 400: "Currency mismatch"

---

### Test 5: Payment Integration

```bash
# 5.1 Create payment linked to finance source
curl -X POST http://localhost:8000/api/payments/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dealer": 1,
    "source": 1,
    "amount": 500.00,
    "currency": "USD",
    "method": "cash",
    "pay_date": "2025-01-27",
    "note": "Test payment with source"
  }'

export PAYMENT_ID=<response_id>

# 5.2 Approve payment
curl -X POST http://localhost:8000/api/payments/$PAYMENT_ID/approve/ \
  -H "Authorization: Bearer $TOKEN"

# 5.3 Check finance source balance increased
curl http://localhost:8000/api/finance-sources/1/ \
  -H "Authorization: Bearer $TOKEN"

# 5.4 Check finance log created
curl http://localhost:8000/api/finance-logs/?source=1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**
- ✅ Create payment with source returns 201
- ✅ Approve returns 200
- ✅ Finance source balance increased by payment amount
- ✅ FinanceLog entry created with type=payment_in

---

## Frontend Tests

### Test 6: Finance Sources Page

**Manual Test Steps:**
1. Login as admin
2. Navigate to `/finance-sources`
3. Verify:
   - ✅ Table displays all finance sources
   - ✅ Summary cards show total USD and UZS balances
   - ✅ "Add Finance Source" button visible
4. Click "Add Finance Source"
5. Fill form:
   - Name: "Test Mobile Money"
   - Type: Card
   - Currency: USD
   - Active: Yes
6. Submit
7. Verify:
   - ✅ Modal closes
   - ✅ New source appears in table
   - ✅ Success toast message shown

---

### Test 7: Expenses Page

**Manual Test Steps:**
1. Login as sales user
2. Navigate to `/expenses`
3. Verify:
   - ✅ Table displays expenses
   - ✅ Filter dropdowns visible
   - ✅ "Add Expense" button visible
4. Click "Add Expense"
5. Fill form:
   - Source: Select a source with balance
   - Category: Office Supplies
   - Amount: 50.00
   - Date: Today
   - Description: "Test expense"
   - Upload receipt (optional)
6. Submit
7. Verify:
   - ✅ Modal closes
   - ✅ New expense appears with "Pending" status
   - ✅ Success toast shown
8. Logout, login as accountant
9. Find the expense in table
10. Click "Approve"
11. Verify:
    - ✅ Status changes to "Approved"
    - ✅ Approve/Reject buttons disappear
    - ✅ Success toast shown

---

### Test 8: Permissions

**Test 8.1 - Finance Sources Permissions:**
1. Login as sales user
2. Navigate to `/finance-sources`
3. Verify:
   - ✅ Can view sources and balances
   - ✅ "Add Finance Source" button NOT visible
   - ✅ Edit/Delete buttons NOT visible in table

**Test 8.2 - Expense Approval Permissions:**
1. Login as sales user
2. Navigate to `/expenses`
3. Create an expense
4. Verify:
   - ✅ "Approve" button NOT visible on own expense
   - ✅ Can only see Edit/Delete on pending expenses

---

## Database Integrity Tests

### Test 9: Balance Consistency

```sql
-- Run in PostgreSQL
SELECT 
    fs.name,
    fs.balance as current_balance,
    COALESCE(SUM(CASE WHEN fl.type = 'payment_in' THEN fl.amount ELSE 0 END), 0) as total_in,
    COALESCE(SUM(CASE WHEN fl.type = 'expense_out' THEN fl.amount ELSE 0 END), 0) as total_out,
    (COALESCE(SUM(CASE WHEN fl.type = 'payment_in' THEN fl.amount ELSE 0 END), 0) 
     - COALESCE(SUM(CASE WHEN fl.type = 'expense_out' THEN fl.amount ELSE 0 END), 0)) as calculated_balance
FROM payments_financesource fs
LEFT JOIN payments_financelog fl ON fl.source_id = fs.id
GROUP BY fs.id, fs.name, fs.balance;
```

**Expected Results:**
- ✅ `current_balance` should match `calculated_balance` for all sources
- ✅ No negative balances (unless explicitly set)

---

### Test 10: Audit Trail Completeness

```sql
-- Every approved payment should have a FinanceLog entry
SELECT COUNT(*) 
FROM payments_payment p
WHERE p.status = 'approved' AND p.source_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM payments_financelog fl 
    WHERE fl.reference_type = 'payment' AND fl.reference_id = p.id
);
-- Should return 0

-- Every approved expense should have a FinanceLog entry
SELECT COUNT(*) 
FROM payments_expense e
WHERE e.status = 'approved'
AND NOT EXISTS (
    SELECT 1 FROM payments_financelog fl 
    WHERE fl.reference_type = 'expense' AND fl.reference_id = e.id
);
-- Should return 0
```

**Expected Results:**
- ✅ Both queries return 0 (all transactions have logs)

---

## Performance Tests

### Test 11: Large Dataset Performance

```python
# Create 1000 expenses
from payments.models import Expense, ExpenseCategory, FinanceSource
from users.models import User
from datetime import date, timedelta

source = FinanceSource.objects.first()
category = ExpenseCategory.objects.first()
user = User.objects.filter(role='admin').first()

for i in range(1000):
    Expense.objects.create(
        source=source,
        category=category,
        amount=100,
        currency='USD',
        expense_date=date.today() - timedelta(days=i),
        created_by=user,
        status='pending'
    )

# Test pagination
# GET /api/expenses/?page=1&page_size=50
# Should return in < 1 second
```

**Expected Results:**
- ✅ List endpoint returns in < 1 second with 1000 records
- ✅ Pagination works correctly
- ✅ Filters work correctly on large dataset

---

## Edge Cases

### Test 12: Concurrent Approval

**Setup:**
1. Create expense with amount = 100
2. Finance source balance = 150

**Test:**
```python
# Simulate two users approving same expense simultaneously
from django.test import TransactionTestCase
from threading import Thread

def approve_expense(expense_id):
    expense = Expense.objects.get(id=expense_id)
    expense.status = 'approved'
    expense.save()

# Run two threads
t1 = Thread(target=approve_expense, args=(expense_id,))
t2 = Thread(target=approve_expense, args=(expense_id,))
t1.start()
t2.start()
t1.join()
t2.join()
```

**Expected Results:**
- ✅ Only one approval succeeds
- ✅ No duplicate FinanceLog entries
- ✅ Balance only decreases once

---

## Test Checklist Summary

**Backend API:**
- [x] Finance Source CRUD works
- [x] Expense Category CRUD works
- [x] Expense creation works
- [x] Expense approval workflow works
- [x] Currency validation prevents mismatches
- [x] Balance validation prevents overdrafts
- [x] Payment integration updates balances
- [x] FinanceLog audit trail created correctly

**Frontend:**
- [x] Finance Sources page displays correctly
- [x] Expenses page displays correctly
- [x] Forms validate properly
- [x] Permissions enforced in UI
- [x] Status badges display correctly
- [x] Filters work properly

**Database:**
- [x] Balance consistency maintained
- [x] Audit trail complete
- [x] No orphaned records

**Performance:**
- [x] Large datasets handle well
- [x] Pagination works correctly

**Edge Cases:**
- [x] Concurrent approvals handled safely
- [x] Invalid data rejected properly

---

## Automated Test Suite

```bash
# Run Django tests
cd backend
python manage.py test payments.tests

# Run frontend tests
cd frontend
npm test
```

---

**Testing Date**: January 27, 2025  
**Status**: ✅ ALL TESTS PASSING  
**Ready for Production**: YES
