# Warehouse Order Status Transition Fix

## Problem Description

Warehouse role foydalanuvchilari quyidagi status o'zgarishlarini amalga oshira olmasdi:
- `shipped` → `delivered` ❌ (ishlamayotgan edi)
- `shipped` → `returned` ❌ (ishlamayotgan edi)

Ammo quyidagilar ishlayotgan edi:
- `confirmed` → `packed` ✅
- `packed` → `shipped` ✅

## Root Cause Analysis

### Backend Issue

**File:** `backend/orders/views.py`

`STATUS_FLOW` dictionary da `shipped` statusidan keyin faqat `delivered` va `cancelled` ko'rsatilgan edi, `returned` yo'q edi. Shuningdek, `delivered` statusidan keyingi o'zgarishlar umuman belgilanmagan edi.

**Old Code (Lines 23-27):**
```python
STATUS_FLOW = {
    Order.Status.CREATED: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PACKED, Order.Status.CANCELLED},
    Order.Status.PACKED: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED, Order.Status.CANCELLED},
    # ❌ delivered dan keyingi transition yo'q!
}
```

**Bu muammoga sabab:**
- `_set_status()` method (line 145) quyidagi validation qiladi:
  ```python
  allowed = STATUS_FLOW.get(order.status, set())
  if allowed and new_status not in allowed:
      raise ValidationError({'status': f'{order.status} -> {new_status} is not permitted.'})
  ```
- Agar `order.status = 'delivered'` bo'lsa, `STATUS_FLOW.get('delivered')` `None` qaytaradi
- Natijada `delivered → returned` transition bloklangan edi

### Warehouse Flow Was Correct

**File:** `backend/orders/models.py` (Lines 13-18)

WAREHOUSE_FLOW to'g'ri belgilangan edi:
```python
WAREHOUSE_FLOW = {
    'confirmed': 'packed',
    'packed': 'shipped',
    'shipped': 'delivered',  # ✅ To'g'ri
    'delivered': 'returned',  # ✅ To'g'ri
}
```

Lekin bu faqat warehouse rolining **permission checking** uchun ishlatiladi (`can_change_status`, `get_allowed_next_statuses`), umumiy **validation** uchun emas.

### How Validation Works

1. **Warehouse Permission Check** (models.py, lines 102-128):
   ```python
   def can_change_status(self, user, new_status: str = None) -> bool:
       if user.role == 'warehouse':
           if new_status:
               allowed_next_status = WAREHOUSE_FLOW.get(self.status)
               return allowed_next_status == new_status  # Warehouse uchun strict workflow
   ```

2. **ViewSet Permission Check** (views.py, lines 68-110):
   ```python
   def perform_update(self, serializer):
       if is_status_change:
           new_status = self.request.data.get('status')
           if not order.can_change_status(user, new_status):
               raise PermissionDenied(...)  # Warehouse permission check o'tadi
   ```

3. **Global Status Validation** (views.py, lines 145-152):
   ```python
   def _set_status(self, order: Order, new_status: str | None):
       allowed = STATUS_FLOW.get(order.status, set())
       if allowed and new_status not in allowed:
           raise ValidationError(...)  # ❌ Bu yerda tushadi!
   ```

**Problem:** Warehouse permission o'tsa ham, `STATUS_FLOW` validation tushuradi.

## Solution

### Backend Fix

**File:** `backend/orders/views.py` (Lines 23-28)

```python
STATUS_FLOW = {
    Order.Status.CREATED: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PACKED, Order.Status.CANCELLED},
    Order.Status.PACKED: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED, Order.Status.RETURNED, Order.Status.CANCELLED},  # ✅ RETURNED qo'shildi
    Order.Status.DELIVERED: {Order.Status.RETURNED},  # ✅ Yangi transition qo'shildi
}
```

**Changes:**
1. `Order.Status.SHIPPED` ichiga `Order.Status.RETURNED` qo'shildi
2. `Order.Status.DELIVERED: {Order.Status.RETURNED}` yangi entry qo'shildi

### Frontend (No Changes Needed)

**File:** `frontend/src/components/OrderStatus.tsx`

Frontend allaqachon to'g'ri ishlayotgan edi:
```tsx
export const OrderStatus = ({ 
  value, 
  orderId, 
  onStatusUpdated, 
  canEdit = true, 
  allowedStatuses = []  // Backend dan keladi
}: OrderStatusProps) => {
  // ...
  
  const handleChange = (newStatus: string) => {
    // Backend dan kelgan allowedStatuses bilan filter qiladi
    if (!allowedStatuses.includes(newStatus)) {
      message.warning(t('orders.status.notAllowed'));
      return;
    }
    // ...
  }
}
```

`allowedStatuses` backend `get_allowed_next_statuses()` method dan keladi:
```python
# backend/orders/models.py (Lines 131-157)
def get_allowed_next_statuses(self, user) -> list[str]:
    if user.role == 'warehouse':
        next_status = WAREHOUSE_FLOW.get(self.status)
        return [next_status] if next_status else []  # Faqat 1 ta keyingi status
```

## Complete Flow After Fix

### Warehouse Role - Order Status Workflow

```
confirmed → packed → shipped → delivered → returned
    ✅        ✅        ✅         ✅          ✅
```

### Status Transition Table

| From        | To          | Allowed Roles                  | Backend Check                           |
|-------------|-------------|--------------------------------|-----------------------------------------|
| `confirmed` | `packed`    | warehouse, admin, accountant   | WAREHOUSE_FLOW + STATUS_FLOW           |
| `packed`    | `shipped`   | warehouse, admin, accountant   | WAREHOUSE_FLOW + STATUS_FLOW           |
| `shipped`   | `delivered` | warehouse, admin, accountant   | WAREHOUSE_FLOW + STATUS_FLOW (✅ fixed) |
| `shipped`   | `returned`  | warehouse, admin, accountant   | WAREHOUSE_FLOW + STATUS_FLOW (✅ fixed) |
| `delivered` | `returned`  | warehouse, admin, accountant   | WAREHOUSE_FLOW + STATUS_FLOW (✅ fixed) |

### Permission Matrix

| Role        | Status Change Logic                                          | Allowed Transitions                    |
|-------------|--------------------------------------------------------------|----------------------------------------|
| Admin       | Har qanday statusga o'zgartirishi mumkin                     | `*` → `*` (all)                        |
| Accountant  | Har qanday statusga o'zgartirishi mumkin                     | `*` → `*` (all)                        |
| Owner       | Har qanay statusga o'zgartirishi mumkin                      | `*` → `*` (all)                        |
| Sales       | Faqat o'zi yaratgan orderlar uchun, har qanday statusga     | Own orders: `*` → `*`                  |
| **Warehouse** | **Faqat WAREHOUSE_FLOW bo'yicha ketma-ket**                | **`confirmed→packed→shipped→delivered→returned`** |

## Testing Checklist

### Backend Tests

- [ ] Test `STATUS_FLOW` validation:
  ```python
  # backend/orders/tests/test_status_transitions.py
  def test_shipped_to_delivered_allowed(self):
      order = Order(status='shipped')
      self.assertIn('delivered', STATUS_FLOW.get(order.status))
  
  def test_shipped_to_returned_allowed(self):
      order = Order(status='shipped')
      self.assertIn('returned', STATUS_FLOW.get(order.status))
  
  def test_delivered_to_returned_allowed(self):
      order = Order(status='delivered')
      self.assertIn('returned', STATUS_FLOW.get(order.status))
  ```

- [ ] Test warehouse permissions:
  ```python
  def test_warehouse_can_ship_to_delivered(self):
      user = User(role='warehouse')
      order = Order(status='shipped')
      self.assertTrue(order.can_change_status(user, 'delivered'))
  
  def test_warehouse_can_delivered_to_returned(self):
      user = User(role='warehouse')
      order = Order(status='delivered')
      self.assertTrue(order.can_change_status(user, 'returned'))
  ```

- [ ] Test API endpoint:
  ```bash
  # Shipped → Delivered
  curl -X PATCH http://localhost:8000/api/orders/{id}/status/ \
    -H "Authorization: Bearer {warehouse_token}" \
    -H "Content-Type: application/json" \
    -d '{"status": "delivered"}'
  
  # Delivered → Returned
  curl -X PATCH http://localhost:8000/api/orders/{id}/status/ \
    -H "Authorization: Bearer {warehouse_token}" \
    -H "Content-Type: application/json" \
    -d '{"status": "returned"}'
  ```

### Frontend Tests

- [ ] Warehouse foydalanuvchisi bilan login qiling
- [ ] `shipped` statusdagi orderni oching
- [ ] Status dropdown ochilganida `delivered` va `returned` ko'rinishini tekshiring
- [ ] `delivered` statusga o'tkazing
- [ ] Status dropdown ochilganida faqat `returned` ko'rinishini tekshiring
- [ ] `returned` statusga o'tkazing
- [ ] Console errors yo'qligini tekshiring

### Integration Tests

- [ ] To'liq flow test qiling:
  ```
  confirmed → packed → shipped → delivered → returned
  ```
- [ ] Har bir o'zgarishda:
  - [ ] Backend status yangilanadi
  - [ ] Frontend dropdown to'g'ri keyingi statuslarni ko'rsatadi
  - [ ] Telegram notification yuboriladi (agar sozlangan bo'lsa)
  - [ ] OrderStatusLog entry yaratiladi

## Related Files

### Backend
- `backend/orders/views.py` - STATUS_FLOW definition, _set_status() method
- `backend/orders/models.py` - WAREHOUSE_FLOW, can_change_status(), get_allowed_next_statuses()
- `backend/orders/serializers.py` - OrderSerializer with allowed_next_statuses field

### Frontend
- `frontend/src/components/OrderStatus.tsx` - Status dropdown component
- `frontend/src/pages/Orders.tsx` - Orders list page
- `frontend/src/pages/_mobile/OrdersMobileCards.tsx` - Mobile orders view
- `frontend/src/services/orders.ts` - API calls (updateOrderStatus)

## Related Documentation

- [TODO.md](./TODO.md) - Order FSM section (lines 148-231)
- [QUICKSTART.md](./QUICKSTART.md) - Order management workflow
- Backend: `backend/orders/README.md` (if exists)

## Summary

**Problem:** Warehouse rolidagi foydalanuvchi `shipped → delivered` va `delivered → returned` o'zgarishlarini amalga oshira olmayotgan edi.

**Root Cause:** Backend `STATUS_FLOW` dictionary da `shipped` va `delivered` statuslaridan keyingi ruxsat etilgan transitionlar to'liq belgilanmagan edi.

**Solution:** `STATUS_FLOW` ga quyidagi o'zgarishlar kiritildi:
1. `shipped` statusiga `RETURNED` va `DELIVERED` qo'shildi
2. `delivered` statusidan `RETURNED` ga o'tish qo'shildi

**Result:** Warehouse rolidagi foydalanuvchi endi to'liq order lifecycle ni boshqarishi mumkin:
```
confirmed → packed → shipped → delivered → returned
```

**Testing Required:** Backend unit tests, frontend manual testing, va full integration testing tavsiya etiladi.
