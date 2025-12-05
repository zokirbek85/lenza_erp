# Import Orderlar Izolatsiyasi - Implementation Summary

## 📋 Muammo

Excel orqali tarixiy orderlar import qilinganda, ular real biznes operatsiyalariga ta'sir qilib, quyidagi muammolar yuzaga kelardi:

1. **Inventar buzilishi**: Import qilingan orderlar mahsulot stock'ini kamaytirardi
2. **Diler balans xatosi**: Import orderlar diler qarziga qo'shilib, noto'g'ri balans ko'rsatilardi
3. **KPI xatosi**: Import orderlar dashboard statistikalariga qo'shilib, noto'g'ri KPI ko'rsatkichlar berardi
4. **Sverka xatosi**: Diler akt svekalarida tarixiy orderlar aralashib, hisob-kitob to'g'ri emasligi
5. **Notificationlar spam**: Har bir import order uchun keraksiz bildirishnomalar yuborilardi
6. **Statistika xatosi**: Umumiy hisobotlar va qidiruvlarda tarixiy orderlar chiqib, operatsion ma'lumotlar aralashardi

## ✅ Yechim (Variant 1 - Minimal O'zgarishlar)

Order modelidagi `is_imported` flag barcha query joylarda filter sifatida qo'shildi:
- `is_imported=False` - Faqat real operatsion orderlarni olish
- Import qilingan orderlar faqat statistika uchun bazada saqlanadi
- Barcha biznes logikadan to'liq izolatsiya qilingan

---

## 🔧 Backend O'zgarishlar

### 1. Order Model (orders/models.py)
```python
# Line 48: Yangi field qo'shildi
is_imported = models.BooleanField(default=False)
```

**Natija**: Har bir order endi imported yoki real ekanligini bildirib turadi.

---

### 2. Signal Guards (orders/signals.py)

#### _adjust_inventory Function (Line 14)
```python
def _adjust_inventory(order: Order, multiplier: int):
    # Skip inventory adjustment for imported orders
    if order.is_imported:
        return
    
    with transaction.atomic():
        # existing stock adjustment logic...
```

**Natija**: Import orderlar mahsulot stock'iga ta'sir qilmaydi.

#### order_status_logging Signal (Line 49)
```python
# Skip inventory adjustment for imported orders
if instance.is_imported:
    return

if previous in Order.Status.active_statuses() and instance.status not in Order.Status.active_statuses():
    _adjust_inventory(instance, 1)
elif (previous not in Order.Status.active_statuses()) and instance.status in Order.Status.active_statuses():
    _adjust_inventory(instance, -1)
```

**Natija**: Import orderlarning status o'zgarishi inventory'ga ta'sir qilmaydi.

---

### 3. Dealer Balance Calculation (dealers/models.py)

#### orders_total Filter (Line 56)
```python
orders_total = (
    Order.objects.filter(
        dealer=self, 
        status__in=Order.Status.active_statuses(),
        is_imported=False  # NEW FILTER
    )
    .aggregate(total=Sum('total_usd'))
    .get('total')
    or Decimal('0')
)
```

#### returns_total Filter (Line 67)
```python
returns_total = (
    OrderReturn.objects.filter(
        order__dealer=self, 
        order__is_imported=False  # NEW FILTER
    )
    .aggregate(total=Sum('amount_usd'))
    .get('total')
    or Decimal('0')
)
```

**Natija**: Diler balansi faqat real orderlar va returnlarni hisoblaydi.

---

---

### 4. KPI Views (kpis/views.py) - ✅ YANGI QO'SHILDI

#### OwnerKPIView (Line 46)
```python
# OLDIN
active_orders = Order.objects.filter(status__in=Order.Status.active_statuses())

# KEYIN
active_orders = Order.objects.filter(
    status__in=Order.Status.active_statuses(),
    is_imported=False
)
```

#### SalesManagerKPIView (Line 102)
```python
# OLDIN
user_orders = Order.objects.filter(
    created_by=user,
    status__in=Order.Status.active_statuses()
)

# KEYIN
user_orders = Order.objects.filter(
    created_by=user,
    status__in=Order.Status.active_statuses(),
    is_imported=False
)
```

#### AccountantKPIView (Lines 137, 139)
```python
# OLDIN
active_orders = Order.objects.filter(status__in=Order.Status.active_statuses())
returns_total = OrderReturn.objects.aggregate(total=Sum('amount_usd'))

# KEYIN
active_orders = Order.objects.filter(
    status__in=Order.Status.active_statuses(),
    is_imported=False
)
returns_total = OrderReturn.objects.filter(
    order__is_imported=False
).aggregate(total=Sum('amount_usd'))
```

**Natija**: Owner, Sales Manager va Accountant dashboard'lari endi faqat real operatsion orderlarni ko'rsatadi.

---

### 5. Reconciliation Service (services/reconciliation.py) - ✅ YANGI QO'SHILDI

#### _aggregate_totals Function (Line 56)
```python
# OLDIN
orders_total = Order.objects.filter(
    dealer=dealer,
    value_date__gte=start,
    value_date__lte=end,
    status__in=Order.Status.active_statuses(),
).aggregate(total=Sum('total_usd'))

# KEYIN
orders_total = Order.objects.filter(
    dealer=dealer,
    value_date__gte=start,
    value_date__lte=end,
    status__in=Order.Status.active_statuses(),
    is_imported=False,
).aggregate(total=Sum('total_usd'))
```

#### build_reconciliation - orders list (Line 125)
```python
# OLDIN
orders = list(
    Order.objects.filter(
        dealer=dealer,
        value_date__gte=start,
        value_date__lte=end,
        status__in=Order.Status.active_statuses(),
    )
    .order_by('value_date', 'display_no')
    .values('value_date', 'display_no', 'total_usd')
)

# KEYIN
orders = list(
    Order.objects.filter(
        dealer=dealer,
        value_date__gte=start,
        value_date__lte=end,
        status__in=Order.Status.active_statuses(),
        is_imported=False,
    )
    .order_by('value_date', 'display_no')
    .values('value_date', 'display_no', 'total_usd')
)
```

#### build_reconciliation - detailed orders (Line 311)
```python
# OLDIN
detailed_orders_qs = Order.objects.filter(
    dealer=dealer,
    value_date__gte=start,
    value_date__lte=end,
    status__in=Order.Status.active_statuses(),
).order_by('value_date', 'display_no')

# KEYIN
detailed_orders_qs = Order.objects.filter(
    dealer=dealer,
    value_date__gte=start,
    value_date__lte=end,
    status__in=Order.Status.active_statuses(),
    is_imported=False,
).order_by('value_date', 'display_no')
```

**Natija**: Diler sverkalari (akt sverka) endi faqat real operatsion orderlarni ko'rsatadi.

---

### 6. Core Views (core/views.py) - ✅ YANGI QO'SHILDI

#### Search View (Line 76)
```python
# OLDIN
orders = Order.objects.filter(display_no__icontains=query)[:10]

# KEYIN
orders = Order.objects.filter(
    display_no__icontains=query,
    is_imported=False
)[:10]
```

#### ReportView (Line 156)
```python
# OLDIN
orders_qs = Order.objects.filter(order_filter).exclude(status=Order.Status.CANCELLED)

# KEYIN
orders_qs = Order.objects.filter(order_filter).exclude(
    status=Order.Status.CANCELLED
).filter(is_imported=False)
```

#### DealerListView order_subquery (Line 243)
```python
# OLDIN
order_subquery = Order.objects.filter(dealer=OuterRef('pk'))
    .values('dealer')
    .annotate(total=Sum('total_usd'))

# KEYIN
order_subquery = Order.objects.filter(
    dealer=OuterRef('pk'),
    is_imported=False
).values('dealer')
    .annotate(total=Sum('total_usd'))
```

#### MonthlyStatsView (Line 311)
```python
# OLDIN
orders_monthly = Order.objects.filter(
    dealer_id__in=dealer_ids,
    value_date__gte=start_date
).annotate(month=TruncMonth('value_date'))

# KEYIN
orders_monthly = Order.objects.filter(
    dealer_id__in=dealer_ids,
    value_date__gte=start_date,
    is_imported=False
).annotate(month=TruncMonth('value_date'))
```

**Natija**: Qidiruv natijalari, hisobotlar, diler ro'yxatlari va oylik statistikalar endi faqat real orderlarni ko'rsatadi.

---

### 7. Telegram Bot (bot/handlers.py) - ✅ YANGI QO'SHILDI

#### today_orders_command (Line 93)
```python
# OLDIN
stats = await sync_to_async(list)(
    Order.objects.filter(created_at__date=today)
    .values('status')
    .annotate(total=Count('id'))
)

# KEYIN
stats = await sync_to_async(list)(
    Order.objects.filter(
        created_at__date=today,
        is_imported=False
    )
    .values('status')
    .annotate(total=Count('id'))
)
```

**Natija**: Telegram bot bugungi orderlar statistikasida faqat real orderlarni ko'rsatadi.

---

### 8. Import Function (orders/utils/excel_tools.py)

#### Order Creation (Line 295)
```python
order = Order.objects.create(
    dealer=dealer,
    created_by=created_by,
    status=Order.Status.DELIVERED,
    note=note,
    value_date=value_date,
    is_reserve=is_reserve,
    is_imported=True,  # Mark as imported - will not affect stock/balance
)
```

**Natija**: Excel orqali yaratilgan barcha orderlar avtomatik `is_imported=True` bilan belgilanadi.

---

### 5. Notification Signal (notifications/signals.py)

#### notify_order_created (Line 29)
```python
@receiver(post_save, sender=Order)
def notify_order_created(sender, instance: Order, created, **kwargs):
    # Skip notifications for imported orders
    if created and not instance.is_imported:
        _create_notification(
            'Yangi buyurtma', 
            f'{instance.display_no} uchun buyurtma yaratildi.',
            notification_type='order',
            link=f'/orders'
        )
```

**Natija**: Import orderlar uchun notification yuborilmaydi.

---

### 6. API Serializer (orders/serializers.py)

#### OrderSerializer Fields (Line 95)
```python
fields = (
    'id',
    'display_no',
    'dealer',
    'dealer_id',
    'created_by',
    'status',
    'note',
    'created_at',
    'updated_at',
    'value_date',
    'total_usd',
    'total_uzs',
    'is_reserve',
    'is_imported',  # NEW FIELD
    'items',
    'status_logs',
    'returns',
)
```

**Natija**: Frontend `is_imported` flag'ini API orqali ko'ra oladi.

---

## 📊 O'zgarishlar Xulosasi

### Fayllar Ro'yxati

| Fayl | O'zgarishlar | Joylashuvlar | Ta'sir Darajasi |
|------|-------------|-------------|----------------|
| `backend/kpis/views.py` | ✅ 3 filter qo'shildi | OwnerKPIView, SalesManagerKPIView, AccountantKPIView | **YUQORI** - Dashboard KPIs |
| `backend/services/reconciliation.py` | ✅ 3 filter qo'shildi | _aggregate_totals, orders list, detailed orders | **YUQORI** - Moliyaviy hisobotlar |
| `backend/core/views.py` | ✅ 4 filter qo'shildi | Search, ReportView, DealerList, MonthlyStats | **O'RTA** - Umumiy statistika |
| `backend/bot/handlers.py` | ✅ 1 filter qo'shildi | today_orders_command | **PAST** - Bot xabarnomalar |
| `backend/orders/signals.py` | ✅ Oldindan mavjud | inventory guards | **YUQORI** - Ombor harakati |
| `backend/dealers/models.py` | ✅ Oldindan mavjud | balance calculations | **YUQORI** - Diler balanslari |

**Jami**: 4 yangi fayl o'zgartirildi, 11 filter qo'shildi

### Query Pattern

Barcha o'zgarishlar bir xil pattern bo'yicha:
```python
# Standart filter qo'shish
Order.objects.filter(...existing_filters..., is_imported=False)

# OrderReturn relationship orqali
OrderReturn.objects.filter(order__is_imported=False)
```

### Tekshirish Natijalari

#### Django Check
```bash
python manage.py check
# ✅ System check identified no issues (0 silenced).
```

#### Syntax Validation
```bash
python -m py_compile kpis/views.py services/reconciliation.py core/views.py bot/handlers.py
# ✅ All files compiled successfully without errors
```

---

## 🗃️ Database Migration

### Migration File: orders/migrations/0007_order_is_imported.py

**Holat**: ✅ Allaqachon deploy qilingan

```bash
# Oldingi sessiyada yaratilgan va migrate qilingan
python manage.py makemigrations orders
python manage.py migrate orders
```

**Muhim**: Yangi o'zgarishlar uchun migration kerak emas - faqat query filter qo'shildi.

---

## 🔒 Izolatsiya Mexanizmi

### Import Order Flow
```
Excel File → import_orders_from_excel()
    ↓
Order.objects.create(is_imported=True)
    ↓
post_save signal fires → order_status_logging
    ↓
Check: if instance.is_imported → return (SKIP)
    ↓
_adjust_inventory NOT CALLED ✓
notify_order_created NOT CALLED ✓
```

### Dealer Balance Calculation
```
Dealer.balance_usd property called
    ↓
Order.objects.filter(
    dealer=self,
    status__in=active_statuses,
    is_imported=False  ← FILTER
)
    ↓
Only real orders counted ✓
```

---

## ✅ Ta'sir Qilingan Komponentlar

| Komponent | Fayl | O'zgarish | Natija |
|-----------|------|----------|--------|
| Order Model | `orders/models.py` | `is_imported` field qo'shildi | Database darajasida flag |
| Stock Adjustment | `orders/signals.py` | Guard qo'shildi | Import orderlar stock'ga ta'sir qilmaydi |
| Status Change | `orders/signals.py` | Guard qo'shildi | Import order status o'zgarishi inventory'ga ta'sir qilmaydi |
| Dealer Balance | `dealers/models.py` | Filter qo'shildi | Faqat real orderlar balansga kiradi |
| Returns Balance | `dealers/models.py` | Filter qo'shildi | Import order returnlari balansga ta'sir qilmaydi |
| Import Function | `orders/utils/excel_tools.py` | `is_imported=True` | Barcha import orderlar belgilanadi |
| Notification | `notifications/signals.py` | Guard qo'shildi | Import orderlar uchun notification yo'q |
| API | `orders/serializers.py` | Field qo'shildi | Frontend flag'ni ko'ra oladi |

---

## 🧪 Testing Checklist

### Backend Tests (Manual)
- [ ] Import Excel file orqali order yarating
- [ ] Import qilingan orderlar `is_imported=True` ekanligini tekshiring
- [ ] Quyidagi joylardan import orderlar YO'QLIGINI tasdiqlang:
  - [ ] Owner KPI dashboard totals
  - [ ] Sales Manager KPI statistics  
  - [ ] Accountant KPI reports
  - [ ] Diler reconciliation (sverka) hujjatlari
  - [ ] Umumiy qidiruv natijalari (search)
  - [ ] Oylik statistika graflari (monthly stats)
  - [ ] Telegram bot bugungi orderlar statistikasi
- [ ] Import orderlar quyidagilarga TA'SIR QILMAGANINI tekshiring:
  - [ ] Diler balans hisoblari (balance_usd, balance_uzs)
  - [ ] Ombor stock miqdorlari (Product stock)
  - [ ] Mahsulot availability holati (stock_ok)
  - [ ] Notification bildirishnomalar (hech qanday spam yo'q)

### Automated Tests (Kelajak)
```python
# Tavsiya qilingan test case'lar
def test_imported_orders_excluded_from_kpis():
    # Import order yaratish
    order = Order.objects.create(is_imported=True, ...)
    # KPI viewlardan chiqmaganligini assert qilish
    
def test_imported_orders_excluded_from_reconciliation():
    # Import order yaratish
    # Sverka hisobotidan chiqmaganligini assert qilish
    
def test_imported_orders_no_inventory_adjustment():
    # Import order yaratish
    # Mahsulot stock o'zgarmaganligini assert qilish
```

---

## 🚀 Deployment

### VPS Deploy Process
```bash
# 1. Git push
git add .
git commit -m "feat: Add is_imported flag to isolate historical orders"
git push origin main

# 2. VPS da pull
cd /var/www/lenza_erp
git pull origin main

# 3. Backend migration
cd backend
source venv/bin/activate
python manage.py migrate orders

# 4. Restart services
sudo systemctl restart gunicorn
sudo systemctl restart nginx

# 5. Frontend rebuild (if needed)
cd ../frontend
npm run build
```

---

## 📊 Data Integrity

### Eski Import Orderlar
Agar deploy oldidan import qilingan orderlar mavjud bo'lsa:

```python
# Django shell orqali
python manage.py shell

from orders.models import Order

# Import orders detection - DELIVERED status, created_at == value_date
# (This is a heuristic, adjust as needed)
suspected = Order.objects.filter(
    status='delivered',
    created_at__date=F('value_date')
)

# Manual review recommended
for order in suspected:
    print(f"{order.display_no} - {order.dealer.name} - {order.value_date}")
    # If confirmed as imported:
    # order.is_imported = True
    # order.save()
```

---

## 🎯 Xulosa

✅ **Import qilingan orderlar endi to'liq izolyatsiya qilindi:**
- Stock'ga TA'SIR QILMAYDI
- Diler balansiga TA'SIR QILMAYDI  
- Returnlar balansiga TA'SIR QILMAYDI
- Notificationlar yuborilmaydi
- Real biznes operatsiyalari bilan ARALASHMAYDI

✅ **Kod sifati:**
- Hech qanday syntax error yo'q
- Migration tayyor
- Signal guardlari to'g'ri joyga o'rnatilgan
- API serializer yangilangan

✅ **Keyingi qadamlar:**
- VPS ga deploy qilish
- Migration ishga tushirish
- Test import bilan tekshirish
- Frontend UI badge qo'shish (optional)

---

## 📝 Muallif
Implementation: GitHub Copilot (Claude Sonnet 4.5)  
Sana: 2025  
Fayl: `IMPORT_ORDERS_ISOLATION_SUMMARY.md`
