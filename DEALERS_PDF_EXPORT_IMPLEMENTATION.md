# Dealers PDF Export Implementation

## O'zgarishlar Xulasasi

Lenza ERP tizimida Dealers sahifasiga date filter va yangi PDF export funksiyasi qo'shildi.

## Yangi Funksiyalar

### 1. Date Filter (Frontend)
- **Joylashuv**: Dealers sahifasi header va filters drawer
- **Maydonlar**:
  - `start_date` - Boshlanish sanasi
  - `end_date` - Tugash sanasi
- **Default qiymat**: Joriy oyning 1-kunidan oxirgi kunigacha
- **Ishlashi**: Filter avtomatik saqlanadi va PDF export'ga ta'sir qiladi

### 2. PDF Export Funksiyasi

#### Frontend Changes
**Fayl**: `frontend/src/pages/Dealers.tsx`

Yangi funksiyalar:
- `handleExportPDF()` - PDF yuklab olish uchun
- Date filter state management
- PDF export tugmasi header'da

#### Backend Changes
**Fayl**: `backend/dealers/views.py`

Yangi class: `DealerExportPDFView`
- **URL**: `/api/dealers/export/pdf/`
- **Query params**: 
  - `start_date` (YYYY-MM-DD format)
  - `end_date` (YYYY-MM-DD format)

#### Hisob-kitob Logikasi

PDF'da har bir diller uchun:

1. **Orderlar summasi** (tanlangan davr):
   - Faqat completed/shipped statusdagi orderlar
   - Returns va refunds ayirilgan (OrderReturn, ReturnItem)
   - USD'da

2. **Tushum bo'yicha ajratish**:
   - **Cash (Naqd)**: `payment_type='cash'`
   - **Card (Karta)**: `payment_type='card'`
   - **Bank**: `payment_type='bank'` yoki `'bank_transfer'`
   - Barcha tushum `FinanceTransaction` (type=INCOME, status=APPROVED)
   - USD'ga avtomatik konvertatsiya (`amount_usd` ishlatiladi)

3. **Jami tushum**: Cash + Card + Bank

4. **Yakuniy qarzdorlik**: 
   - Formula: `Orderlar summasi - Jami tushum`
   - Musbat qiymat (qizil rang) = diller qarzdor
   - Manfiy qiymat (yashil rang) = ortiqcha to'lov

#### Template
**Fayl**: `backend/templates/reports/dealers_export.html`

PDF strukturasi:
| № | Diller nomi | Orderlar (USD) | Naqd (USD) | Karta (USD) | Bank (USD) | Jami tushum (USD) | Qarzdorlik (USD) |
|---|-------------|----------------|------------|-------------|------------|-------------------|------------------|

**Formatlash**:
- 2 xonali aniqlik
- Minglik ajratgich (1,234.56 formatda)
- Rang kodlash: musbat qarzdorlik qizil, ortiqcha to'lov yashil
- Sahifa pastida: davr va generatsiya sanasi

#### URL Routing
**Fayl**: `backend/core/urls.py`

```python
path('api/dealers/export/pdf/', DealerExportPDFView.as_view(), name='dealers-export-pdf'),
```

## Edge Cases

1. **Ma'lumot yo'q**: Agar dillerda tanlangan davrda order yoki tushum bo'lmasa, barcha ustunlar 0 ko'rsatiladi
2. **Sana kiritilmasa**: Default joriy oy ishlatiladi
3. **Noma'lum payment type**: Default `cash` sifatida hisoblanadi
4. **Valyuta konvertatsiyasi**: Backend `amount_usd` field'dan foydalanadi (FinanceTransaction model'da mavjud)

## Foydalanish

### Frontend'dan
1. Dealers sahifasiga o'ting
2. Kerakli davrni tanlang (start_date, end_date)
3. "📄 PDF" tugmasini bosing
4. PDF avtomatik yuklab olinadi

### API orqali
```bash
GET /api/dealers/export/pdf/?start_date=2025-11-01&end_date=2025-11-30
```

Response: PDF fayl (`dealers_report_20251101_20251130.pdf`)

## Texnik Tafsilotlar

### Dependencies
- Django ORM (Dealer, Order, FinanceTransaction, OrderReturn, ReturnItem)
- ExportMixin (PDF generation)
- Template system (WeasyPrint)

### Permissions
- `IsAdmin | IsAccountant | IsOwner` - faqat bu rollar export qila oladi

### Performance
- Select_related ishlatilgan (region, manager_user)
- Aggregate queries (Sum) barcha hisob-kitoblar uchun
- Davr filtri index'langan `value_date` va `date` fieldlariga qo'llanadi

## Test Qilish

1. Dealers sahifasini oching
2. Turli davrlarni tanlang
3. PDF'ni yuklab oling
4. Tekshiring:
   - Orderlar to'g'ri hisoblanganmi
   - Payment type'lar to'g'ri ajratilganmi
   - Qarzdorlik to'g'ri (Orders - Tushumlar)
   - Formatlash (minglik ajratgich, 2 xonali aniqlik)
   - Rang kodlash (musbat qizil, manfiy yashil)

## Kelajakdagi Yaxshilashlar

- [ ] Region bo'yicha filtr (faqat tanlangan region dillerlarini export qilish)
- [ ] Manager bo'yicha filtr
- [ ] Excel export (shu format bilan)
- [ ] Summary statistikasi (jami orderlar, jami tushumlar, jami qarzdorlik)
- [ ] Email orqali jo'natish

## Muallif
Lenza ERP Development Team - December 2025
