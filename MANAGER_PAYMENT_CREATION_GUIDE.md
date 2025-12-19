# Manager Payment Creation Feature - Implementation Guide

## Overview
Sales managers uchun cheklangan to'lov yaratish funksiyasi. Managerlar faqat o'zlariga biriktirilgan dilerlar uchun kirim (income) to'lovlarini yaratishi mumkin. Barcha to'lovlar kutish (pending) holatida yaratiladi va admin/buxgalter tomonidan tasdiqlash talab qilinadi.

## Features

### 1. Permission System
- **Sales Manager**: Faqat POST (create) huquqi
- **Admin/Accountant**: Full CRUD huquqlari
- **Automatic Validation**: Dealer ownership backend da tekshiriladi

### 2. Manager Restrictions
- ❌ `/finance` sahifasiga kirish yo'q
- ✅ Orders sahifasida "To'lov yaratish" tugmasi
- ✅ Faqat biriktirilgan dilerlar ro'yxati
- ✅ Faqat kirim (income) turi
- ✅ Status avtomatik `pending` qilib o'rnatiladi

### 3. Approval Workflow
```
Sales Manager creates → Status: PENDING → Admin/Accountant approves/rejects
```

## Backend Implementation

### Database Changes
**Migration**: `0020_add_pending_rejected_status.py`
```python
# New transaction statuses
PENDING = 'pending'    # Manager tomonidan yaratilgan, kutish holatida
REJECTED = 'rejected'  # Admin tomonidan rad etilgan
```

### Permission Class
**File**: `backend/core/permissions.py`
```python
class IsSalesCanCreateTransaction(BasePermission):
    """Sales manager faqat POST qilishi mumkin"""
    
    def has_permission(self, request, view):
        user = request.user
        if user.role == 'sales' and request.method == 'POST':
            return True
        return False
    
    def has_object_permission(self, request, view, obj):
        # Sales manager object-level permissions yo'q
        return False
```

### API Endpoints

#### 1. Manager Dealers List
```
GET /api/finance/manager-dealers/
```
**Response**:
```json
[
  {"id": 1, "name": "Diler ABC", "region": "Tashkent"},
  {"id": 2, "name": "Diler XYZ", "region": "Samarkand"}
]
```

#### 2. Create Transaction
```
POST /api/finance/transactions/
```
**Request Body**:
```json
{
  "type": "income",
  "dealer": 1,
  "account": 5,
  "date": "2024-01-15",
  "currency": "UZS",
  "amount": 5000000,
  "comment": "To'lov #123"
}
```
**Automatic Fields**:
- `status`: Auto-set to `"pending"`
- `created_by`: Current user

**Validations**:
- ✅ Type must be `"income"`
- ✅ Dealer must be provided
- ✅ Dealer must belong to manager
- ✅ Status auto-set to `"pending"`

### Views Implementation
**File**: `backend/finance/views.py`

```python
def get_permissions(self):
    if self.action == 'create' and self.request.user.role == 'sales':
        return [IsSalesCanCreateTransaction()]
    # ... other permissions

def create(self, request, *args, **kwargs):
    if request.user.role == 'sales':
        # Type validation
        if request.data.get('type') != 'income':
            return Response({'error': 'Sales can only create income'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Dealer validation
        dealer_id = request.data.get('dealer')
        if not dealer_id:
            return Response({'error': 'Dealer required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Ownership check
        dealer = Dealer.objects.filter(
            id=dealer_id, 
            manager_user_id=request.user.id
        ).first()
        
        if not dealer:
            return Response({'error': 'Invalid dealer'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Auto-set status
        request.data['status'] = 'pending'
    
    return super().create(request, *args, **kwargs)
```

## Frontend Implementation

### Orders Page Integration
**File**: `frontend/src/pages/Orders.tsx`

#### 1. State Management
```typescript
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [managerDealers, setManagerDealers] = useState<DealerOption[]>([]);
const [accounts, setAccounts] = useState<Array<{id: number; name: string}>>([]);
const [paymentFormData, setPaymentFormData] = useState({
  dealer: '',
  account: '',
  date: new Date().toISOString().split('T')[0],
  currency: 'UZS',
  amount: '',
  comment: '',
});
```

#### 2. Data Loading
```typescript
// Load manager dealers and accounts
if (isSalesManager) {
  const managerDealersResponse = await http.get('/finance/manager-dealers/');
  setManagerDealers(managerDealersResponse.data);
  
  const accountsResponse = await http.get('/finance/accounts/');
  setAccounts(accountsResponse.data);
}
```

#### 3. Payment Creation Button
```typescript
{isSalesManager && (
  <button
    onClick={() => setShowPaymentModal(true)}
    className="btn btn-primary btn-sm"
  >
    💳 {t('orders.createPayment')}
  </button>
)}
```

#### 4. Submit Handler
```typescript
const handleCreatePayment = async () => {
  // Validation
  if (!paymentFormData.dealer || !paymentFormData.account || !paymentFormData.amount) {
    toast.error(t('finance.form.fillRequired'));
    return;
  }

  const payload = {
    type: 'income',
    status: 'pending',  // Auto-set
    dealer: Number(paymentFormData.dealer),
    account: Number(paymentFormData.account),
    date: paymentFormData.date,
    currency: paymentFormData.currency,
    amount: Number(paymentFormData.amount),
    comment: paymentFormData.comment || '',
  };

  await http.post('/finance/transactions/', payload);
  toast.success(t('finance.messages.createdSuccess'));
  setShowPaymentModal(false);
};
```

### Translation Keys
**Files**: 
- `frontend/src/i18n/locales/uz/translation.json`
- `frontend/src/i18n/locales/uz/finance.json`

```json
{
  "orders": {
    "createPayment": "To'lov yaratish"
  },
  "finance": {
    "form": {
      "dealer": "Diler",
      "selectDealer": "Dilerni tanlang",
      "account": "Hisob",
      "selectAccount": "Hisobni tanlang",
      "date": "Sana",
      "currency": "Valyuta",
      "amount": "Summa",
      "comment": "Izoh",
      "fillRequired": "Barcha majburiy maydonlarni to'ldiring",
      "pendingNote": "To'lov tasdiqlash uchun yuboriladi"
    },
    "messages": {
      "createdSuccess": "To'lov muvaffaqiyatli yaratildi",
      "createError": "To'lovni yaratishda xatolik"
    }
  }
}
```

## Security Features

### 1. Backend Validations
✅ Permission class enforces POST-only for sales
✅ Type must be 'income'
✅ Dealer ownership validated at database level
✅ Status forced to 'pending'
✅ Cannot access edit/delete endpoints

### 2. Frontend Restrictions
✅ Button only visible to sales role
✅ Dealer dropdown filtered by manager assignment
✅ Currency limited to UZS/USD
✅ Date cannot be future
✅ Form validation before submission

### 3. Audit Trail
All transactions include:
- `created_by`: Manager who created
- `approved_by`: Admin who approved (null initially)
- `approved_at`: Approval timestamp
- `status`: PENDING → APPROVED/REJECTED

## Testing Guide

### 1. As Sales Manager
1. Login as sales manager
2. Go to Orders page
3. Click "To'lov yaratish" button
4. Select dealer from filtered list (only assigned dealers)
5. Fill form: account, date, amount, comment
6. Submit
7. Verify:
   - ✅ Success toast appears
   - ✅ Transaction created with status=pending
   - ✅ Cannot access /finance page

### 2. As Admin/Accountant
1. Login as admin/accountant
2. Go to Finance → Transactions
3. Filter by status=pending
4. Find manager's transaction
5. Approve or reject
6. Verify audit trail (created_by, approved_by fields)

### 3. Permission Tests
Test these should fail:
- ❌ Sales manager tries to edit transaction
- ❌ Sales manager tries to delete transaction
- ❌ Sales manager creates expense (not income)
- ❌ Sales manager creates for unassigned dealer
- ❌ Sales manager accesses /finance page

## Deployment

### Git Commits
1. **Backend**: `859ec0b` - Backend implementation
2. **Frontend**: `573c13f` - Frontend implementation

### Deploy Command
```bash
# Backend
cd backend
python manage.py migrate
sudo systemctl restart gunicorn

# Frontend
cd frontend
npm run build
# Copy dist/ to web server
```

### Database Migration
```bash
python manage.py migrate finance 0020_add_pending_rejected_status
```

## Future Enhancements

### Possible Improvements
1. **Email Notifications**: Notify admin when pending transaction created
2. **Rejection Reason**: Allow admin to add comment when rejecting
3. **Bulk Approval**: Approve multiple pending transactions at once
4. **Transaction History**: Show manager's transaction history in Orders page
5. **Statistics**: Dashboard widget showing pending transactions count
6. **Mobile UI**: Optimize modal for mobile screens

### Additional Validations
- Amount limits per manager
- Daily/monthly transaction limits
- Multi-level approval for large amounts
- Document attachment support (receipts, invoices)

## Troubleshooting

### Common Issues

**Issue**: Button not visible for sales manager
**Solution**: Check `role === 'sales'` in useAuthStore

**Issue**: Dealer dropdown empty
**Solution**: Verify dealers assigned to manager in database

**Issue**: 403 Forbidden on submit
**Solution**: Check dealer ownership (dealer.manager_user_id = current_user.id)

**Issue**: Status not pending
**Solution**: Backend forces status='pending' in create() method

## API Documentation

### Transaction Statuses
```python
DRAFT = 'draft'          # Initial state
PENDING = 'pending'      # Awaiting approval (manager created)
APPROVED = 'approved'    # Admin approved
REJECTED = 'rejected'    # Admin rejected
CANCELLED = 'cancelled'  # User cancelled
```

### Status Transitions
```
DRAFT → APPROVED (normal flow)
PENDING → APPROVED (manager flow)
PENDING → REJECTED (manager flow)
APPROVED → CANCELLED (refund/correction)
```

## Conclusion

Feature to'liq implementatsiya qilindi va test qilishga tayyor. Backend va frontend o'zgarishlar repository ga commit va push qilindi.

**Commit IDs**:
- Backend: `859ec0b`
- Frontend: `573c13f`

**Changed Files**:
- Backend: 6 files (models, views, permissions, urls, settings, migration)
- Frontend: 3 files (Orders.tsx, translation.json, finance.json)

**Total Changes**: +387 lines, -24 lines
