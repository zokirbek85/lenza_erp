# TODO.md — Lenza ERP Comprehensive Analysis & Roadmap

**Generated:** November 10, 2025  
**Project:** Lenza ERP (Django 5.1.2 + DRF + React 19 + TypeScript + Vite + Ant Design)  
**Status:** Production-ready foundation with critical gaps requiring immediate attention

---

## 1. Snapshot va Top-findings (Qisqa xulosa)

### Current State
- **Backend:** Django 5.1.2, DRF 3.15.2, PostgreSQL/SQLite, Channels 4.1, JWT auth
- **Frontend:** React 19.1.1, Vite 7.1.7, Ant Design 5.28, TypeScript 5.9, Zustand, i18next
- **Apps:** users, dealers, catalog, orders, payments, inventory, kpis, notifications, telegram_bot, core
- **Authentication:** JWT (30min access, 1day refresh), RBAC (admin, owner, sales, warehouse, accountant)
- **Real-time:** Channels + WebSocket (notifications)
- **DB:** SQLite (dev), PostgreSQL (prod ready)

### ⚠️ Top 10 Critical Findings

1. **❌ NO ORDER FSM GUARDS** — Order status transitions are NOT validated; any role can force invalid state changes (e.g., `created` → `delivered`). **High risk of data corruption.**

2. **❌ INVENTORY RACE CONDITIONS** — `_adjust_inventory` uses `select_for_update()` but NOT wrapped in `transaction.atomic()` at ViewSet level. Concurrent order confirmations can create negative stock.

3. **⚠️ RETURNS DO NOT UPDATE INVENTORY** — `ReturnedProduct` signal exists but does NOT reverse order item stock. Need signal to increment `Product.stock_ok`/`stock_defect`.

4. **❌ MISSING UI NOTIFICATIONS** — Backend signals push to `push_global()` but frontend has NO WebSocket consumer component to display real-time alerts. Bell icon exists but not wired.

5. **⚠️ DAILY ORDER NUMBER RACE CONDITION** — `Order.save()` generates `ORD-xxx-dd.mm.yyyy` with loop retry but lacks DB-level uniqueness constraint on `(value_date, sequence)`.

6. **❌ NO PAGINATION ON CRITICAL ENDPOINTS** — `OrderViewSet`, `ProductViewSet` have DRF pagination but frontend often fetches `?limit=all`, bypassing pagination (performance risk).

7. **⚠️ RU I18N ENCODING FIXED** — Russian translations were mojibake; now corrected, but need runtime verification in browser.

8. **❌ 2FA DISABLED FOR ACCOUNTANT** — `REQUIRED_2FA_ROLES = set()` after user request, but security best practice requires 2FA for financial roles.

9. **⚠️ PDF/EXCEL EXPORTS LACK BRANDING** — `CompanyInfo` model exists but NOT integrated into PDF invoices/reports. Missing logo, company details.

10. **❌ NO AUDIT LOG UI** — `AuditMiddleware` logs actions but `AuditLogViewSet` has no frontend page. Accountability gap.

---

## 2. Arxitektura va Papka tuzilmalari

### Backend Apps (Django)
```
backend/
├── core/          # Settings, middleware (AuditMiddleware), utils, CompanyInfo model
├── users/         # User model (role field), JWT auth, 2FA (disabled)
├── dealers/       # Dealer, Region models; reconciliation, balance PDFs
├── catalog/       # Product, Brand, Category; barcode generation, import/export
├── orders/        # Order, OrderItem, OrderStatusLog, OrderReturn; FSM missing
├── payments/      # Payment, CurrencyRate; dealer balance tracking
├── inventory/     # ReturnedProduct; signal updates stock (good/defective)
├── kpis/          # KPIRecord, role-specific KPI views (owner, accountant, etc.)
├── notifications/ # Notification, SystemNotification; WebSocket consumer
├── telegram_bot/  # Signals to send Telegram alerts; assets/ folder for banners
├── services/      # Shared business logic (reconciliation)
└── bot/           # Legacy/admin bot (adm_bot.py)
```

### Frontend Structure
```
frontend/src/
├── app/           # router.tsx (React Router v7 DataAPIs), http.ts (axios)
├── auth/          # useAuthStore.ts (Zustand), Guard.tsx (RBAC)
├── components/    # Layout, Modal, ErrorBoundary, CollapsibleForm, PaginationControls
├── features/      # dashboard/, reconciliation/ (domain components)
├── pages/         # Products, Orders, Payments, Dealers, Returns, Login, TwoFactor
├── i18n/          # index.ts, locales/{en,ru,uz}/translation.json
├── hooks/         # usePageSize.ts
├── store/         # (empty; using Zustand in auth/)
└── utils/         # formatters.ts, download.ts, api.ts
```

### 🔧 Recommended Refactor
- **Service Layer:** Extract `orders/services/order_fsm.py` for FSM transitions with role guards.
- **Domain Modules:** Group `catalog` → `products` (brands/categories as sub-modules).
- **N+1 Queries:** Add `select_related('dealer', 'product__brand')` to all ViewSet `get_queryset()`.
- **DB Indexes:** See Section 3.

---

## 3. Ma'lumotlar bazasi va ERD

### Core Tables
| Table | Key Fields | Relationships | Status |
|-------|-----------|---------------|--------|
| `users_user` | id, username, role, otp_secret | FK to orders (created_by) | ✅ |
| `dealers_dealer` | id, name, region_id, balance_usd | FK region; has orders, payments | ✅ |
| `catalog_product` | id, sku (UNIQUE), name, brand_id, category_id, stock_ok, stock_defect, barcode (UNIQUE) | FK brand, category | ⚠️ Missing indexes |
| `orders_order` | id, display_no (UNIQUE), dealer_id, status, value_date, total_usd, is_reserve | FK dealer, created_by | ⚠️ No composite unique |
| `orders_orderitem` | id, order_id, product_id, qty, price_usd, status | FK order, product (PROTECT) | ✅ |
| `orders_orderstatuslog` | id, order_id, old_status, new_status, by_user_id, at | Audit trail | ✅ |
| `payments_payment` | id, dealer_id, amount, currency, pay_date, method | FK dealer, rate | ⚠️ No index on (dealer_id, pay_date) |
| `payments_currencyrate` | id, rate_date (UNIQUE), usd_to_uzs | — | ✅ |
| `inventory_returnedproduct` | id, dealer_id, product_id, quantity, return_type, created_at | FK dealer, product | ✅ |
| `notifications_notification` | id, user_id, title, message, is_read, created_at | FK user | ✅ |
| `core_auditlog` | id, user_id, action, model, object_id, ip, at | Middleware-generated | ⚠️ No UI |

### ⚠️ Required Database Constraints & Indexes

#### Migration Additions Needed
```python
# Migration: Add composite unique on orders
class Migration(migrations.Migration):
    operations = [
        migrations.AddConstraint(
            model_name='order',
            constraint=models.UniqueConstraint(
                fields=['value_date', 'display_no'],
                name='unique_order_per_day'
            ),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['dealer', 'status', '-created_at'], name='order_dealer_status_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['brand', 'category', 'is_active'], name='product_brand_cat_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['dealer', '-pay_date'], name='payment_dealer_date_idx'),
        ),
        migrations.AddIndex(
            model_name='orderstatuslog',
            index=models.Index(fields=['order', '-at'], name='statuslog_order_at_idx'),
        ),
    ]
```

**Verification:**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py dbshell  # then: \d orders_order (PostgreSQL) or .schema orders_order (SQLite)
```

---

## 4. Biznes logika bo'shliqlari

### 4.1 Order FSM (Finite State Machine) — CRITICAL ❌

**Current:** `OrderViewSet.update()` allows ANY status change without validation.

**Required Transitions Table:**
| From          | To            | Allowed Roles         | Condition |
|---------------|---------------|-----------------------|-----------|
| `created`     | `confirmed`   | sales, admin, owner   | Items exist, stock available |
| `created`     | `cancelled`   | sales, admin, owner   | — |
| `confirmed`   | `packed`      | warehouse, admin      | — |
| `confirmed`   | `cancelled`   | admin, owner          | Refund stock |
| `packed`      | `shipped`     | warehouse, admin      | — |
| `shipped`     | `delivered`   | warehouse, admin      | — |
| `delivered`   | `returned`    | admin, accountant     | Create OrderReturn |
| ANY           | `cancelled`   | admin, owner          | Emergency override |

**Implementation:**
```python
# backend/orders/services/order_fsm.py
from rest_framework.exceptions import PermissionDenied, ValidationError

VALID_TRANSITIONS = {
    'created': {'confirmed', 'cancelled'},
    'confirmed': {'packed', 'cancelled'},
    'packed': {'shipped'},
    'shipped': {'delivered'},
    'delivered': {'returned'},
    # cancelled/returned are terminal
}

ROLE_PERMISSIONS = {
    'created→confirmed': {'sales', 'admin', 'owner'},
    'created→cancelled': {'sales', 'admin', 'owner'},
    'confirmed→packed': {'warehouse', 'admin', 'owner'},
    'confirmed→cancelled': {'admin', 'owner'},
    'packed→shipped': {'warehouse', 'admin', 'owner'},
    'shipped→delivered': {'warehouse', 'admin', 'owner'},
    'delivered→returned': {'admin', 'accountant', 'owner'},
}

def validate_status_transition(order, new_status, user):
    old_status = order.status
    if old_status == new_status:
        return  # No-op
    
    # Check valid transition
    if new_status not in VALID_TRANSITIONS.get(old_status, set()):
        # Emergency override: admin/owner can cancel from any state
        if new_status == 'cancelled' and user.role in {'admin', 'owner'}:
            return
        raise ValidationError({
            'status': f"Cannot transition from {old_status} to {new_status}"
        })
    
    # Check role permission
    transition_key = f"{old_status}→{new_status}"
    allowed_roles = ROLE_PERMISSIONS.get(transition_key, set())
    if user.role not in allowed_roles:
        raise PermissionDenied(f"Role {user.role} cannot perform {transition_key}")
```

**Update OrderViewSet:**
```python
# backend/orders/views.py
from .services.order_fsm import validate_status_transition

class OrderViewSet(viewsets.ModelViewSet):
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        if new_status and new_status != instance.status:
            validate_status_transition(instance, new_status, request.user)
        
        # Store actor for signal
        instance._status_actor = request.user
        return super().update(request, *args, **kwargs)
```

**Tests:**
```python
# backend/orders/tests/test_fsm.py
from django.test import TestCase
from orders.services.order_fsm import validate_status_transition
from rest_framework.exceptions import ValidationError, PermissionDenied

class OrderFSMTestCase(TestCase):
    def test_valid_transition_created_to_confirmed(self):
        order = Order(status='created')
        user = User(role='sales')
        validate_status_transition(order, 'confirmed', user)  # Should pass
    
    def test_invalid_transition_created_to_delivered(self):
        order = Order(status='created')
        user = User(role='sales')
        with self.assertRaises(ValidationError):
            validate_status_transition(order, 'delivered', user)
    
    def test_warehouse_cannot_confirm(self):
        order = Order(status='created')
        user = User(role='warehouse')
        with self.assertRaises(PermissionDenied):
            validate_status_transition(order, 'confirmed', user)
```

**Verification:**
```bash
# Run tests
cd backend
python manage.py test orders.tests.test_fsm

# Manual API test
curl -X PATCH http://localhost:8000/api/orders/123/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered"}' 
# Should return 400 if order is 'created'
```

---

### 4.2 Inventory Atomicity — CRITICAL ❌

**Current Issue:** `_adjust_inventory` in `orders/signals.py` uses `select_for_update()` inside loop but signal is NOT wrapped in `transaction.atomic()` at the ViewSet level.

**Fix:**
```python
# backend/orders/views.py
from django.db import transaction

class OrderViewSet(viewsets.ModelViewSet):
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        # Ensure status changes + inventory adjustments are atomic
        return super().update(request, *args, **kwargs)
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
```

**Additional:** Confirm signal already wraps in transaction:
```python
# backend/orders/signals.py (line 13) — ALREADY CORRECT ✅
def _adjust_inventory(order: Order, multiplier: int):
    with transaction.atomic():  # ✅ Good
        for item in order.items.select_related('product'):
            product = Product.objects.select_for_update().get(pk=item.product_id)
            # ...
```

**Test:**
```python
# Concurrency test
from threading import Thread
from orders.models import Order

def confirm_order(order_id):
    order = Order.objects.get(pk=order_id)
    order.status = 'confirmed'
    order.save()

threads = [Thread(target=confirm_order, args=(1,)) for _ in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()

# Product stock should decrement exactly once
```

---

### 4.3 Returns Signal — ⚠️ PARTIAL

**Current:** `inventory/signals.py` updates `Product.stock_ok`/`stock_defect` on `ReturnedProduct` creation. ✅

**Missing:** No reverse for `OrderReturn` (orders app). Need to ensure `OrderReturn` also triggers stock increment.

**Recommendation:** Consolidate returns logic:
```python
# backend/orders/signals.py
@receiver(post_save, sender=OrderReturn)
def handle_order_return_stock(sender, instance: OrderReturn, created, **kwargs):
    if not created:
        return
    item = instance.item
    product = item.product
    qty = instance.quantity
    
    with transaction.atomic():
        product = Product.objects.select_for_update().get(pk=product.pk)
        if instance.is_defect:
            product.stock_defect += qty
        else:
            product.stock_ok += qty
        product.save(update_fields=['stock_ok', 'stock_defect'])
```

---

### 4.4 Daily Order Number — ⚠️ RACE CONDITION

**Current:** `Order.save()` loops to find next sequence if collision. Works but inefficient under load.

**Better Approach:** Use DB sequence or Redis atomic counter.

**Immediate Fix:** Add DB constraint (already in Section 3).

---

### 4.5 Pricing & Currency

**Current:** ✅ `Order.total_usd` primary; `total_uzs` calculated via `rate_on(value_date)`.  
**Status:** Working as designed. Currency history preserved in `CurrencyRate`.

**Enhancement:** Add volatility alerts (Section 12).

---

## 5. API (DRF) tekshiruvlari

### 5.1 Pagination — ⚠️ INCONSISTENT

**Settings:** `PAGE_SIZE=25`, `MAX_PAGE_SIZE=200` ✅

**Issue:** Frontend often bypasses with `?limit=all` (e.g., dealers, products dropdowns).

**Fix:**
```python
# backend/catalog/views.py
class ProductViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        # Enforce pagination; no ?limit=all
        return qs.select_related('brand', 'category')  # Also fix N+1
```

**Frontend:** Use server-side search for dropdowns (Section 8).

---

### 5.2 OrderSerializer — ✅ GOOD

**Current:**
```python
# backend/orders/serializers.py includes nested dealer, items
```

**Verification:** Check API response includes `dealer.name`, `dealer.region.name`, `items[]`.

---

### 5.3 Products Filter — ⚠️ NEEDS SERVER SEARCH

**Current:** `ProductViewSet` has `search_fields = ['sku', 'name']` but frontend loads all for dropdown.

**Fix:** Add dedicated search endpoint:
```python
# backend/catalog/views.py
from rest_framework.decorators import action

class ProductViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
        qs = self.get_queryset().filter(
            Q(sku__icontains=q) | Q(name__icontains=q)
        )[:20]
        return Response(self.get_serializer(qs, many=True).data)
```

**Frontend:** Debounced autocomplete (Section 8.3).

---

### 5.4 Returns List Empty — ✅ FIXED

**Was:** `fetchReturns` didn't handle paginated `{ results: [...] }` response.  
**Fixed:** `ReturnsPage.tsx` now checks `payload.results ?? payload`.

---

### 5.5 Performance — ⚠️ N+1 QUERIES

**Add to all ViewSets:**
```python
class OrderViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Order.objects.select_related('dealer', 'created_by').prefetch_related('items__product')

class ProductViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Product.objects.select_related('brand', 'category', 'dealer')

class PaymentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Payment.objects.select_related('dealer', 'rate')
```

**Verification:**
```python
# Install django-debug-toolbar (dev only)
# Check /api/orders/ → SQL queries should be <10
```

---

## 6. RBAC va Auth

### 6.1 Permission Matrix

| Endpoint | admin | owner | sales | warehouse | accountant |
|----------|-------|-------|-------|-----------|------------|
| Users CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dealers CRUD | ✅ | ✅ | ✅ | ❌ | ✅ (read) |
| Products CRUD | ✅ | ❌ | ✅ | ✅ (adjust) | ❌ |
| Orders create | ✅ | ✅ | ✅ | ❌ | ❌ |
| Orders confirm | ✅ | ✅ | ✅ | ❌ | ❌ |
| Orders pack/ship | ✅ | ✅ | ❌ | ✅ | ❌ |
| Payments CRUD | ✅ | ✅ | ❌ | ❌ | ✅ |
| Currency CRUD | ✅ | ✅ | ❌ | ❌ | ✅ |
| KPIs | ✅ | ✅ | Role-specific | Role-specific | ✅ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |

**Implementation:** Use DRF `core/permissions.py` (already exists but not documented).

---

### 6.2 JWT & Security

**Current:**
- ✅ Access: 30min (env: `JWT_ACCESS_MINUTES`)
- ✅ Refresh: 1 day (env: `JWT_REFRESH_DAYS`)
- ✅ Token blacklist installed (`rest_framework_simplejwt.token_blacklist`)
- ⚠️ CORS: `CORS_ALLOW_ALL_ORIGINS=true` in dev — **disable in prod**
- ⚠️ CSRF: Enabled but `CORS_ALLOW_CREDENTIALS=False` — **set True if using cookies**

**Recommendation:**
```python
# .env.production
DJANGO_CORS_ALLOW_ALL=false
DJANGO_CORS_ALLOWED_ORIGINS=https://erp.lenza.uz
JWT_ACCESS_MINUTES=15  # Shorter in prod
```

---

### 6.3 2FA Status — ⚠️ DISABLED

**Was:** `REQUIRED_2FA_ROLES = {'accountant'}`  
**Now:** `REQUIRED_2FA_ROLES = set()`  

**Recommendation:** Re-enable for `accountant` and `admin`:
```python
# backend/users/auth.py
REQUIRED_2FA_ROLES = {'admin', 'accountant'}
```

**Verification:** Login as accountant → should redirect to `/2fa` page.

---

## 7. Bildirishnomalar (Telegram + UI)

### 7.1 UI Notifications — ❌ NOT WIRED

**Backend:**
- ✅ `notifications/signals.py` creates `SystemNotification` on order/payment/return.
- ✅ `push_global()` sends to WebSocket.
- ✅ `notifications/consumers.py` exists.

**Frontend:**
- ⚠️ `components/Layout.tsx` has bell icon but NO WebSocket client.
- ❌ No `NotificationBell.tsx` component.

**Implementation Needed:**
```tsx
// frontend/src/components/NotificationBell.tsx
import { useEffect, useState } from 'react';
import { Badge, Popover, List } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import http from '../app/http';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Fetch initial
    http.get('/api/notifications/').then(res => {
      setNotifications(res.data.results || res.data);
      setUnreadCount(res.data.results?.filter(n => !n.is_read).length || 0);
    });

    // WebSocket
    const token = localStorage.getItem('lenza_access_token');
    const wsUrl = `ws://localhost:8000/ws/notifications/?token=${token}`;
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setNotifications(prev => [data.payload, ...prev]);
        setUnreadCount(c => c + 1);
      }
    };
    
    setWs(socket);
    return () => socket.close();
  }, []);

  const markAllRead = async () => {
    await http.post('/api/notifications/mark-all-read/');
    setUnreadCount(0);
  };

  return (
    <Popover
      content={
        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Notifications</span>
            <button onClick={markAllRead}>Mark all read</button>
          </div>
          <List
            dataSource={notifications.slice(0, 10)}
            renderItem={n => (
              <List.Item>{n.title}: {n.message}</List.Item>
            )}
          />
        </div>
      }
      trigger="click"
    >
      <Badge count={unreadCount}>
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
}
```

**Update Layout:**
```tsx
// frontend/src/components/Layout.tsx
import NotificationBell from './NotificationBell';

// In header:
<NotificationBell />
```

**Backend:** Add `mark-all-read` action:
```python
# backend/notifications/views.py
class NotificationViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        request.user.notifications.update(is_read=True)
        return Response({'status': 'ok'})
```

---

### 7.2 Telegram — ✅ WORKING

**Current:** Signals in `telegram_bot/signals.py` send messages on order status change, payment, currency, return.

**Assets:** Check `backend/telegram_bot/assets/` for banner images:
```bash
ls backend/telegram_bot/assets/
# Should have: order.png, payment.png, return.png, currency.png
```

**If missing:** Create placeholder images or download from design team.

---

### 7.3 Triggers Summary

| Event | UI Notification | Telegram | Recipients |
|-------|----------------|----------|------------|
| Order created | ✅ SystemNotification | ✅ | Warehouse role |
| Order confirmed | ✅ | ✅ | — |
| Order packed | ✅ | ✅ | — |
| Order shipped | ✅ | ✅ | — |
| Order delivered | ✅ | ✅ | — |
| Payment created | ✅ | ✅ | Accountant |
| Currency added | ✅ | ✅ | — |
| Return created | ✅ | ✅ | Warehouse |

**Verification:**
1. Sales manager creates order → Warehouse users see UI notification + Telegram alert.
2. Check browser console for WebSocket connection: `ws://localhost:8000/ws/notifications/`.

---

## 8. Frontend UX/Dev

### 8.1 Collapsible Forms — ✅ DONE

**Status:** `Products.tsx` and `Payments.tsx` already have `CollapsibleForm` with toggle button.

**Remaining:** Apply to `Orders.tsx`, `Dealers.tsx`, `Users.tsx`.

---

### 8.2 Auto-hide Sidebar — ✅ DONE

**Status:** `Layout.tsx` persists sidebar state to `localStorage`.

---

### 8.3 Product Dropdown Search — ❌ TODO

**Current:** Loads all products (`?limit=all`) for dropdown.

**Fix:**
```tsx
// frontend/src/pages/Orders.tsx (or shared hook)
import { useState, useEffect } from 'react';
import { Select } from 'antd';
import { debounce } from 'lodash-es';  // or custom debounce
import http from '../app/http';

function ProductSearch({ value, onChange }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = debounce(async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const res = await http.get('/api/products/search/', { params: { q: searchText } });
    setOptions(res.data.map(p => ({ label: `${p.sku} - ${p.name}`, value: p.id })));
    setLoading(false);
  }, 400);

  return (
    <Select
      showSearch
      value={value}
      onSearch={fetchProducts}
      onChange={onChange}
      options={options}
      loading={loading}
      filterOption={false}
      placeholder="Search product by SKU or name"
    />
  );
}
```

**Backend:** Already described in Section 5.3.

---

### 8.4 RU I18N UTF-8 — ✅ FIXED

**Status:** `frontend/src/i18n/locales/ru/translation.json` corrected from mojibake to proper UTF-8.

**Verification:** Open frontend in browser, switch to Russian → check characters display correctly (Привет, not Р РёРІРµС‚).

---

### 8.5 Returns Table — ✅ FIXED

**Status:** `ReturnsPage.tsx` now handles `payload.results ?? payload`.

**Enhancement:** Add pagination controls (similar to `Products.tsx`).

---

### 8.6 Global Pagination — ⚠️ PARTIAL

**Current:** `PaginationControls.tsx` exists, used in `Payments.tsx`.

**TODO:** Apply to `Orders.tsx`, `Dealers.tsx`, `Users.tsx`, `ReturnsPage.tsx`.

---

## 9. PDF/Excel va Brending

### 9.1 CompanyInfo Integration — ❌ NOT USED

**Model:** `core/models.py` has `CompanyInfo` (name, logo, slogan, address, etc.).

**Current PDFs:** Use hardcoded strings (e.g., `orders/views_pdf.py`).

**Fix:**
```python
# backend/orders/views_pdf.py
from core.models import CompanyInfo

class OrderInvoiceView(APIView):
    def get(self, request, pk):
        order = Order.objects.get(pk=pk)
        company = CompanyInfo.objects.first()  # Singleton
        
        context = {
            'order': order,
            'company': {
                'name': company.name if company else 'Lenza',
                'logo_url': request.build_absolute_uri(company.logo.url) if company and company.logo else None,
                'address': company.address if company else '',
                # ...
            }
        }
        # Render PDF with WeasyPrint
```

**Frontend:** Admin UI to manage `CompanyInfo` (create `/settings/company` page).

---

### 9.2 PDF Generator Choice — ⚠️ MIXED

**Current:**
- Backend: WeasyPrint (Django templates → HTML → PDF) ✅
- Frontend: `@react-pdf/renderer` installed but NOT used.

**Recommendation:** **Use backend WeasyPrint** for all server-generated reports. Remove `@react-pdf/renderer` if unused:
```bash
cd frontend
npm uninstall @react-pdf/renderer
```

---

### 9.3 Export/Import Validation — ⚠️ MINIMAL

**Current:** `ProductImportExcelView` reads Excel, creates/updates products. No validation UI feedback.

**Enhancement:**
```python
# backend/catalog/views.py
class ProductImportExcelView(APIView):
    def post(self, request):
        # ... existing logic
        errors = []
        for idx, row in enumerate(df.itertuples(), start=2):
            try:
                # validate SKU unique, price > 0, etc.
                if not row.sku:
                    errors.append(f"Row {idx}: SKU missing")
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
        
        if errors:
            return Response({'errors': errors}, status=400)
        
        # Process import
        return Response({'imported': count, 'updated': updated_count})
```

**Frontend:** Display `errors[]` in modal/alert.

---

## 10. Monitoring, Audit, Security

### 10.1 Audit Logs — ✅ BACKEND, ❌ FRONTEND

**Backend:** `core/middleware.py` `AuditMiddleware` logs all POST/PUT/PATCH/DELETE to `AuditLog` model.

**Frontend:** NO UI page. Create `/admin/audit` page:
```tsx
// frontend/src/pages/AuditLogs.tsx
import { Table } from 'antd';
import http from '../app/http';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    http.get('/api/audit/').then(res => setLogs(res.data.results || res.data));
  }, []);

  const columns = [
    { title: 'User', dataIndex: ['user', 'username'] },
    { title: 'Action', dataIndex: 'action' },
    { title: 'Model', dataIndex: 'model' },
    { title: 'Object ID', dataIndex: 'object_id' },
    { title: 'IP', dataIndex: 'ip_address' },
    { title: 'Timestamp', dataIndex: 'timestamp', render: (t) => new Date(t).toLocaleString() },
  ];

  return <Table dataSource={logs} columns={columns} rowKey="id" />;
}
```

**Router:**
```tsx
// frontend/src/app/router.tsx
import AuditLogsPage from '../pages/AuditLogs';

// Add route:
{
  path: 'audit',
  element: <Guard roles={['admin', 'owner']}><AuditLogsPage /></Guard>,
}
```

---

### 10.2 Session Tracking — ✅ DONE

**Current:** `AuditLog` includes `ip_address`, `user_agent`. ✅

---

### 10.3 2FA — ⚠️ DISABLED

**See Section 6.3.**

---

### 10.4 Rate Limiting — ✅ CONFIGURED

**Settings:** `DEFAULT_THROTTLE_RATES = {'anon': '200/day'}` ✅

**Enhancement:** Add per-user throttling:
```python
# backend/core/settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/day',
        'user': '10000/day',
    },
}
```

---

### 10.5 File Upload Security — ⚠️ BASIC

**Current:** `MEDIA_ROOT = BASE_DIR / 'media'`. No size limit validation.

**Add:**
```python
# backend/core/settings.py
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
```

**Validation in views:**
```python
# Example: ProductImportExcelView
if request.FILES['file'].size > 5 * 1024 * 1024:
    return Response({'error': 'File too large (max 5MB)'}, status=400)
```

---

### 10.6 ErrorBoundary Frontend — ✅ DONE

**Status:** `ErrorBoundary.tsx` exists and wraps `<App />` in `main.tsx`. ✅

---

### 10.7 Sentry — ❌ NOT CONFIGURED

**Optional:** Add Sentry for production error tracking.

---

## 11. Performance & Tests

### 11.1 Database Indexes — See Section 3

---

### 11.2 Heavy Query Profiling

**Install django-debug-toolbar (dev):**
```bash
pip install django-debug-toolbar
```

```python
# backend/core/settings.py (if DEBUG)
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
    INTERNAL_IPS = ['127.0.0.1']
```

**Verify:** Visit `/api/orders/` → Check SQL panel → should be <15 queries.

---

### 11.3 Pytest — ❌ NO TESTS

**Critical Tests Needed:**

#### Order FSM Tests
```python
# backend/orders/tests/test_fsm.py
from django.test import TestCase
from orders.models import Order
from orders.services.order_fsm import validate_status_transition
from users.models import User

class OrderFSMTestCase(TestCase):
    def setUp(self):
        self.sales_user = User.objects.create(username='sales1', role='sales')
        self.warehouse_user = User.objects.create(username='wh1', role='warehouse')
        self.order = Order.objects.create(status='created', dealer=...)
    
    def test_sales_can_confirm(self):
        validate_status_transition(self.order, 'confirmed', self.sales_user)
    
    def test_warehouse_cannot_confirm(self):
        with self.assertRaises(PermissionDenied):
            validate_status_transition(self.order, 'confirmed', self.warehouse_user)
    
    def test_invalid_skip_to_delivered(self):
        with self.assertRaises(ValidationError):
            validate_status_transition(self.order, 'delivered', self.sales_user)
```

#### Inventory Concurrency Test
```python
# backend/orders/tests/test_inventory.py
from django.test import TransactionTestCase
from threading import Thread
from orders.models import Order
from catalog.models import Product

class InventoryConcurrencyTestCase(TransactionTestCase):
    def test_concurrent_order_confirm_no_negative_stock(self):
        product = Product.objects.create(sku='TEST', stock_ok=10)
        order = Order.objects.create(status='created', ...)
        OrderItem.objects.create(order=order, product=product, qty=5)
        
        def confirm():
            o = Order.objects.get(pk=order.pk)
            o.status = 'confirmed'
            o.save()
        
        threads = [Thread(target=confirm) for _ in range(3)]
        for t in threads: t.start()
        for t in threads: t.join()
        
        product.refresh_from_db()
        self.assertGreaterEqual(product.stock_ok, 0, "Stock went negative!")
```

#### Returns Signal Test
```python
# backend/inventory/tests/test_returns.py
from django.test import TestCase
from inventory.models import ReturnedProduct
from catalog.models import Product

class ReturnsSignalTestCase(TestCase):
    def test_good_return_increments_stock_ok(self):
        product = Product.objects.create(sku='RET1', stock_ok=5)
        ReturnedProduct.objects.create(
            product=product,
            quantity=2,
            return_type='good'
        )
        product.refresh_from_db()
        self.assertEqual(product.stock_ok, 7)
    
    def test_defective_return_increments_stock_defect(self):
        product = Product.objects.create(sku='RET2', stock_defect=1)
        ReturnedProduct.objects.create(
            product=product,
            quantity=3,
            return_type='defective'
        )
        product.refresh_from_db()
        self.assertEqual(product.stock_defect, 4)
```

#### Daily Number Generator Test
```python
# backend/core/tests/test_order_numbers.py
from django.test import TestCase
from datetime import date
from orders.models import Order

class OrderNumberTestCase(TestCase):
    def test_daily_sequence_format(self):
        today = date.today()
        order = Order.objects.create(value_date=today, dealer=...)
        self.assertRegex(order.display_no, r'^ORD-\d{3}-\d{2}\.\d{2}\.\d{4}$')
    
    def test_sequence_increments_per_day(self):
        today = date.today()
        o1 = Order.objects.create(value_date=today, dealer=...)
        o2 = Order.objects.create(value_date=today, dealer=...)
        # Extract sequence numbers and verify o2 > o1
        seq1 = int(o1.display_no.split('-')[1])
        seq2 = int(o2.display_no.split('-')[1])
        self.assertEqual(seq2, seq1 + 1)
```

**Run Tests:**
```bash
cd backend
python manage.py test
```

---

### 11.4 Frontend Tests — ❌ NONE

**Setup Vitest:**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

**Example Test:**
```typescript
// frontend/src/auth/__tests__/useAuthStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../useAuthStore';

test('login sets authentication', async () => {
  const { result } = renderHook(() => useAuthStore());
  
  await act(async () => {
    await result.current.login({ username: 'test', password: 'pass' });
  });
  
  expect(result.current.isAuthenticated).toBe(true);
});
```

---

## 12. KPI/Dashboard kengaytmalari

### 12.1 Owner Panel Enhancements

**Current:** `OwnerKPIView` returns basic metrics.

**Add:**
- Top 10 products by revenue
- Regional growth (sales per region)
- Unpaid dealer balances
- Net profit trend (7/30/90 days)

```python
# backend/kpis/views.py
class OwnerKPIView(APIView):
    def get(self, request):
        # ... existing
        
        # Top products
        top_products = OrderItem.objects.filter(
            order__status__in=Order.Status.active_statuses()
        ).values('product__name').annotate(
            revenue=Sum(F('qty') * F('price_usd'))
        ).order_by('-revenue')[:10]
        
        # Regional sales
        regional_sales = Order.objects.filter(
            status__in=Order.Status.active_statuses()
        ).values('dealer__region__name').annotate(
            total=Sum('total_usd')
        )
        
        # Unpaid balances
        unpaid = Dealer.objects.filter(balance_usd__lt=0).aggregate(
            total=Sum('balance_usd')
        )
        
        return Response({
            # ... existing
            'top_products': top_products,
            'regional_sales': regional_sales,
            'unpaid_balances': abs(unpaid['total'] or 0),
        })
```

---

### 12.2 Alerts

**Low Stock:**
```python
# Add to WarehouseKPIView
low_stock = Product.objects.filter(stock_ok__lt=10, is_active=True).count()
```

**Aged Inventory (60+ days no sales):**
```python
from datetime import timedelta
from django.utils import timezone

cutoff = timezone.now() - timedelta(days=60)
aged = Product.objects.filter(
    order_items__order__created_at__lt=cutoff
).distinct().count()
```

**Currency Volatility:**
```python
# Compare last rate vs 7-day average
last_rate = CurrencyRate.objects.latest('rate_date')
avg_rate = CurrencyRate.objects.filter(
    rate_date__gte=timezone.now().date() - timedelta(days=7)
).aggregate(avg=Avg('usd_to_uzs'))['avg']

volatility = abs(last_rate.usd_to_uzs - avg_rate) / avg_rate * 100
if volatility > 5:
    # Alert
```

---

### 12.3 Filters

**Add date range, brand/category, region filters to KPI endpoints:**
```python
# Example
class OwnerKPIView(APIView):
    def get(self, request):
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        qs = Order.objects.filter(status__in=Order.Status.active_statuses())
        if from_date:
            qs = qs.filter(value_date__gte=from_date)
        if to_date:
            qs = qs.filter(value_date__lte=to_date)
        # ...
```

---

## 13. Deploy/Config

### 13.1 .env.example

**Create:**
```bash
# backend/.env.example
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=erp.lenza.uz,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=https://erp.lenza.uz
DJANGO_CORS_ALLOWED_ORIGINS=https://erp.lenza.uz
DJANGO_CORS_ALLOW_ALL=false

POSTGRES_DB=lenza_erp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7

TELEGRAM_BOT_TOKEN=123456:ABC-DEF
TELEGRAM_GROUP_CHAT_ID=-100123456789

SITE_URL=https://erp.lenza.uz
```

---

### 13.2 Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit .env
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env  # Create: VITE_API_URL=http://localhost:8000
npm run dev
```

**WebSocket (Channels):**
```bash
# Run Daphne for WebSocket support
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

---

### 13.3 Production (Nginx)

**Nginx config:**
```nginx
# /etc/nginx/sites-available/lenza_erp
upstream django_backend {
    server 127.0.0.1:8000;
}

upstream daphne_websocket {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name erp.lenza.uz;
    
    charset utf-8;
    client_max_body_size 10M;
    
    # Frontend (Vite build)
    location / {
        root /var/www/lenza_erp/frontend/dist;
        try_files $uri /index.html;
        
        # Charset & compression
        charset utf-8;
        gzip on;
        gzip_types text/css application/javascript application/json;
    }
    
    # API
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://daphne_websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Static/Media
    location /static/ {
        alias /var/www/lenza_erp/backend/staticfiles/;
    }
    location /media/ {
        alias /var/www/lenza_erp/backend/media/;
    }
}
```

**Systemd services:**
```ini
# /etc/systemd/system/lenza_django.service
[Unit]
Description=Lenza ERP Django (Gunicorn)
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/lenza_erp/backend
ExecStart=/var/www/lenza_erp/backend/.venv/bin/gunicorn core.wsgi:application --bind 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/lenza_daphne.service
[Unit]
Description=Lenza ERP Daphne (WebSocket)
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/lenza_erp/backend
ExecStart=/var/www/lenza_erp/backend/.venv/bin/daphne -b 127.0.0.1 -p 8001 core.asgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

**Start:**
```bash
sudo systemctl enable lenza_django lenza_daphne
sudo systemctl start lenza_django lenza_daphne
sudo systemctl restart nginx
```

---

## 14. Yo'l xaritasi (Roadmap)

### Week 1 (Critical Bugfixes + Core Features)
- [ ] Implement Order FSM guards (`orders/services/order_fsm.py`) + tests
- [ ] Fix UI notifications WebSocket (`NotificationBell.tsx`)
- [ ] Add database indexes (Section 3)
- [ ] Create `AuditLogsPage.tsx` frontend
- [ ] Re-enable 2FA for accountant/admin
- [ ] Add server-side product search endpoint

### Week 2-3 (Enhancements)
- [ ] Integrate `CompanyInfo` into PDFs (invoices, reconciliation)
- [ ] KPI dashboard enhancements (top products, regional sales, alerts)
- [ ] Product dropdown debounced search in frontend
- [ ] Pagination rollout to all tables (Orders, Dealers, Users, Returns)
- [ ] Import/Export validation error UI
- [ ] Add collapsible forms to remaining pages

### Week 4+ (Polish & Scale)
- [ ] Write comprehensive pytest suite (FSM, inventory, returns, order numbers)
- [ ] Frontend Vitest tests (auth store, order flow)
- [ ] Performance profiling with django-debug-toolbar
- [ ] Sentry integration (optional)
- [ ] Celery for background reports (optional)
- [ ] Mobile-responsive improvements

---

## 15. Acceptance Check-list

### Critical Paths

#### ✅ Sales Manager Order Creation Flow
- [ ] Sales manager logs in → `/orders`
- [ ] Click "+ Yangi buyurtma yaratish" → Form slides down
- [ ] Select dealer, add products, submit
- [ ] **Verify:** Warehouse users see **UI notification** (bell icon badge increments)
- [ ] **Verify:** Telegram group receives message with order banner image
- [ ] Order appears in list with status `created`

#### ✅ Warehouse Order Processing Flow
- [ ] Warehouse user sees notification "Yangi buyurtma: ORD-001-10.11.2025"
- [ ] Open order detail → Change status `created` → `confirmed`
- [ ] **Verify:** Product `stock_ok` decrements by order item quantities
- [ ] Change status `confirmed` → `packed` → `shipped` → `delivered`
- [ ] **Verify:** Each transition sends Telegram notification
- [ ] **Verify:** Invalid transition (e.g., `created` → `delivered`) returns **409 error**

#### ✅ Returns Processing
- [ ] Create return via `/returns` → Select dealer, product, quantity, type (good/defective)
- [ ] **Verify:** `Product.stock_ok` OR `stock_defect` increments immediately
- [ ] **Verify:** Telegram notification sent
- [ ] Returns table shows new entry; export PDF/Excel includes it

#### ✅ Product Search
- [ ] Go to `/orders/create`
- [ ] Type "AB" in product search → **Verify:** Dropdown shows max 20 results from server
- [ ] Select product → Quantity field appears
- [ ] Change filter (brand/category) → **Verify:** Selected product persists

#### ✅ Daily Order Number Format
- [ ] Create 3 orders on same day
- [ ] **Verify:** `display_no` = `ORD-001-10.11.2025`, `ORD-002-10.11.2025`, `ORD-003-10.11.2025`
- [ ] Next day → First order = `ORD-001-11.11.2025`

#### ✅ USD/UZS Display
- [ ] Add currency rate: `2025-11-10` → `12,500 UZS/USD`
- [ ] Create order with `value_date=2025-11-10`, `total_usd=100`
- [ ] **Verify:** Order detail shows `total_uzs=1,250,000` (or formatted)
- [ ] Currency rate history page shows chart

#### ✅ PDF Branding
- [ ] Upload logo to `/settings/company` (admin page to create)
- [ ] Generate invoice PDF for order
- [ ] **Verify:** PDF includes logo, company name, address, phone

#### ✅ Audit Logs
- [ ] Admin creates user → Go to `/admin/audit`
- [ ] **Verify:** Log entry shows: `admin` | `POST` | `users.User` | object ID | IP | timestamp

#### ✅ Russian i18n
- [ ] Switch language to RU
- [ ] **Verify:** No mojibake (e.g., "Добро пожаловать" not "Р"РѕР±СЂРѕ")
- [ ] Check all pages render correctly

#### ✅ Concurrency Safety
- [ ] Use 2 browser tabs → Both confirm same order simultaneously
- [ ] **Verify:** Stock decrements exactly once (no negative stock)
- [ ] Check `OrderStatusLog` has 2 entries (one per tab)

---

## 16. Code Snippets Index

**Quick reference for immediate implementation:**

### Order FSM Service
**File:** `backend/orders/services/order_fsm.py`
```python
# See Section 4.1
```

### NotificationBell Component
**File:** `frontend/src/components/NotificationBell.tsx`
```tsx
# See Section 7.1
```

### Product Search Endpoint
**File:** `backend/catalog/views.py`
```python
# See Section 5.3
```

### Database Migrations
**File:** `backend/orders/migrations/000X_add_indexes.py`
```python
# See Section 3
```

### CompanyInfo PDF Integration
**File:** `backend/orders/views_pdf.py`
```python
# See Section 9.1
```

### Pytest Examples
**File:** `backend/orders/tests/test_fsm.py`
```python
# See Section 11.3
```

---

## 17. Contact & Support

**Maintainer:** Lenza ERP Team  
**Documentation:** This TODO.md (keep updated as tasks complete)  
**Issue Tracking:** Use checkbox `- [x]` to mark completed tasks  

**Next Review:** Weekly sprint planning (update roadmap sections based on completion)

---

**END OF TODO.md**
