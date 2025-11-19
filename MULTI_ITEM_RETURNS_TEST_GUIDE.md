# Multi-Item Returns Feature - Test Guide

## O'zgarishlar xulosasi

### Backend O'zgarishlari

1. **Yangi `returns` ilovasi yaratildi**:
   - `backend/returns/models.py`: `Return` va `ReturnItem` modellari
   - `backend/returns/serializers.py`: Multi-item qaytarish uchun serializerlar
   - `backend/returns/views.py`: `ReturnViewSet` API endpoint
   - Migratsiya: `backend/returns/migrations/0001_initial.py`

2. **Asosiy xususiyatlar**:
   - Bir buyurtmadan bir nechta mahsulotni qaytarish
   - Har mahsulot uchun miqdor va izoh
   - Qaytarilgan mahsulotlar avtomatik ravishda omborga qaytadi (stock yangilanadi)
   - Validatsiya: qaytarish miqdori buyurtma miqdoridan oshmasligi kerak
   - Dublikat mahsulot tanlanmasligi

### Frontend O'zgarishlari

1. **Yangi komponent**:
   - `frontend/src/components/returns/ReturnItemRow.tsx`: Dinamik mahsulot qatori

2. **Yangilangan sahifa**:
   - `frontend/src/pages/ReturnsPage.tsx`: Multi-item qaytarish interfeysiga o'tkazildi

3. **Lokalizatsiya**:
   - `frontend/src/i18n/locales/en/translation.json`
   - `frontend/src/i18n/locales/ru/translation.json`
   - `frontend/src/i18n/locales/uz/translation.json`

## Test Qilish Jarayoni

### 1. Backend'ni test qilish

#### 1.1. Migratsiyalarni tekshirish

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

Natija: `returns` ilovasi uchun migratsiyalar muvaffaqiyatli qo'llanishi kerak.

#### 1.2. Django Admin panel orqali test

1. Admin panelga kiring: http://localhost:8000/admin/
2. `Returns` → `Returns` bo'limiga o'ting
3. Yangi qaytarish yarating (lekin frontend orqali test qilish tavsiya etiladi)

#### 1.3. API endpoint'ni to'g'ridan-to'g'ri test qilish

**Buyurtmalar ro'yxatini olish:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/orders/
```

**Bitta buyurtmaning tafsilotlarini olish:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/orders/{order_id}/
```

**Yangi qaytarish yaratish:**
```bash
curl -X POST http://localhost:8000/api/returns/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "comment": "Test qaytarish",
    "items": [
      {
        "product_id": 2,
        "quantity": 1.5,
        "comment": "Nuqsonli"
      },
      {
        "product_id": 3,
        "quantity": 2,
        "comment": "Ortiqcha"
      }
    ]
  }'
```

**Qaytarishlar ro'yxatini olish:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/returns/
```

### 2. Frontend'ni test qilish

#### 2.1. Development server'ni ishga tushirish

```bash
cd frontend
npm run dev
```

#### 2.2. Qaytarish sahifasiga o'tish

1. Brauzerni oching: http://localhost:5173
2. Tizimga kiring
3. "Returns" (Qaytarishlar) bo'limiga o'ting

#### 2.3. Yangi qaytarish yaratish

**Test ssenariylari:**

**Ssenariy 1: Asosiy qaytarish yaratish**

1. "New return" (Yangi qaytarish) tugmasini bosing
2. Modal oynada buyurtmani tanlang
3. Buyurtma tanlangandan keyin, uning mahsulotlari paydo bo'ladi
4. Birinchi qatorda:
   - Mahsulot tanlang
   - Miqdorni kiriting (masalan, 1)
   - Ixtiyoriy izoh yozing
5. "Save" tugmasini bosing
6. Muvaffaqiyatli xabar paydo bo'lishi kerak
7. Yangi qaytarish jadvalda ko'rinishi kerak

**Ssenariy 2: Bir nechta mahsulot qaytarish**

1. "New return" tugmasini bosing
2. Buyurtma tanlang
3. Birinchi qatorda mahsulot va miqdor kiriting
4. "+ Add item" tugmasini bosing
5. Yangi qator paydo bo'ladi
6. Ikkinchi mahsulot va miqdorni kiriting
7. Yana "+ Add item" orqali uchinchi qator qo'shing
8. "Save" tugmasini bosing
9. Barcha mahsulotlar qaytarilgan holda ko'rinishi kerak

**Ssenariy 3: Qatorni o'chirish**

1. Modal oynada bir nechta qator qo'shing
2. Har qatorning o'ng tomonida "X" (o'chirish) tugmasi bor
3. O'chirish tugmasini bosing
4. Qator o'chirilishi kerak
5. Kamida bitta qator qolishi kerak (oxirgi qatorni o'chirib bo'lmaydi)

**Ssenariy 4: Validatsiya testlari**

**a) Buyurtma tanlanmagan:**
- Buyurtma tanlamasdan "Save" tugmasini bosing
- "Order is required" xatosi ko'rinishi kerak

**b) Mahsulot tanlanmagan:**
- Buyurtma tanlang, lekin mahsulot tanlamang
- "Save" tugmasini bosing
- "Product is required" xatosi ko'rinishi kerak

**c) Miqdor kiritilmagan:**
- Buyurtma va mahsulot tanlang, lekin miqdor kiritmang
- "Save" tugmasini bosing
- "Quantity is required" xatosi ko'rinishi kerak

**d) Miqdor maksimaldan oshgan:**
- Buyurtma va mahsulot tanlang
- Buyurtmadagi miqdordan ko'proq qaytarish miqdorini kiriting (masalan, buyurtmada 5 ta bo'lsa, 10 ta yozing)
- "Quantity cannot exceed X" xatosi ko'rinishi kerak
- "Save" tugmasi ishlamasligi kerak

**e) Dublikat mahsulot:**
- Bir xil mahsulotni ikki qatorda tanlashga harakat qiling
- Ikkinchi qatorda o'sha mahsulot tanlov ro'yxatida ko'rinmasligi kerak

### 3. Ombordagi stokni tekshirish

1. Qaytarish yaratishdan oldin mahsulotning ombordagi miqdorini eslab qoling
2. Qaytarish yarating
3. "Products" (Mahsulotlar) sahifasiga o'ting
4. Qaytarilgan mahsulotning stok miqdori ortgan bo'lishi kerak

**Misol:**
- Boshlang'ich stok: 100
- Qaytarilgan miqdor: 5
- Yangi stok: 105 ✓

### 4. Lokalizatsiya testlari

1. Tilni o'zgartiring (EN → RU → UZ)
2. Qaytarish sahifasidagi barcha matnlar to'g'ri tarjima qilinganligini tekshiring:
   - Sarlavha
   - Tugmalar
   - Forma yorliqlari
   - Xato xabarlari
   - Jadval ustunlari

### 5. Role-based access testlari

Turli rollar bilan kirish va ruxsatlarni tekshirish:

- **Admin**: Barcha qaytarishlarni ko'rishi va yaratishi mumkin ✓
- **Owner**: Barcha qaytarishlarni ko'rishi va yaratishi mumkin ✓
- **Accountant**: Qaytarishlarni ko'rishi mumkin ✓
- **Warehouse**: Qaytarishlarni yaratishi va boshqarishi mumkin ✓
- **Sales Manager**: O'z dilerlariga tegishli qaytarishlarni ko'rishi va yaratishi mumkin

### 6. Edge case testlari

**a) Bo'sh buyurtma:**
- Mahsulotlarsiz buyurtma yaratish
- Bunday buyurtmani tanlaganda, xabar ko'rsatilishi kerak

**b) Juda kichik miqdor:**
- 0.01 kabi minimal miqdorni kiriting
- Muvaffaqiyatli ishlashi kerak

**c) Juda katta miqdor:**
- 999999.99 kabi maksimal miqdorni kiriting (buyurtmada shuncha bo'lsa)
- Backend validatsiya ishlashi kerak

**d) Internet uzilishi:**
- Qaytarish yaratish jarayonida internetni o'chirib ko'ring
- Tegishli xato xabari ko'rsatilishi kerak

### 7. Brauzer moslashuvchanlik testi

Quyidagi brauzerlarda test qiling:
- Chrome ✓
- Firefox ✓
- Edge ✓
- Safari (macOS) ✓

Mobil qurilmalarda:
- Android Chrome ✓
- iOS Safari ✓

### 8. Performance testi

- 100+ qaytarish yozuvi bo'lganda sahifa tezligini tekshiring
- Buyurtmada 50+ mahsulot bo'lganda modal oynaning ishlashini tekshiring

## Kutilgan Natijalar

✅ **Backend:**
- API to'g'ri formatda ma'lumot qaytaradi
- Validatsiya xatoliklari aniq xabarlar bilan qaytariladi
- Stock to'g'ri yangilanadi
- Database'da ma'lumotlar to'g'ri saqlanadi

✅ **Frontend:**
- Modal oyna to'g'ri ochiladi va yopiladi
- Dinamik qatorlar qo'shiladi va o'chiriladi
- Validatsiya real-time ishlaydi
- Ma'lumotlar API'ga to'g'ri formatda yuboriladi
- Muvaffaqiyatli yaratilgandan keyin jadval yangilanadi

✅ **UX:**
- Barcha amallar intuitiv va tushunarli
- Xato xabarlari aniq va foydali
- Loading holatlari ko'rsatiladi
- Forma responsiv (mobil qurilmalarda ham yaxshi ishlaydi)

## Muammolarni hal qilish

### Muammo 1: API 500 xatosi

**Sabab:** Migratsiyalar qo'llanmagan yoki `returns` ilovasi `INSTALLED_APPS`ga qo'shilmagan.

**Yechim:**
```bash
cd backend
python manage.py makemigrations returns
python manage.py migrate
```

### Muammo 2: Frontend build xatosi

**Sabab:** Dependencies o'rnatilmagan.

**Yechim:**
```bash
cd frontend
npm install
npm run dev
```

### Muammo 3: i18n kalitlari ko'rinmayapti

**Sabab:** JSON fayl syntax xatosi yoki cache.

**Yechim:**
1. Browser cache'ni tozalang
2. JSON fayllarni tekshiring
3. Development server'ni qayta ishga tushiring

### Muammo 4: Stock yangilanmayapti

**Sabab:** `Product` modelida `stock` field yo'q.

**Yechim:**
`Product` modeli `stock` field'iga ega ekanligini tekshiring. Agar yo'q bo'lsa, qo'shing va migratsiya qiling.

## Xulosa

Bu qo'llanma yordamida siz multi-item returns funksionalligini to'liq test qilishingiz mumkin. Har bir ssenariyni sinab ko'ring va kutilgan natijalar bilan solishtiring. Agar qandaydir muammo yuzaga kelsa, "Muammolarni hal qilish" bo'limiga qarang yoki development teamga xabar bering.

**Test yakunlangandan keyin:**
- [ ] Barcha ssenarylar muvaffaqiyatli o'tdi
- [ ] Validatsiyalar to'g'ri ishlayapti
- [ ] Stock to'g'ri yangilanmoqda
- [ ] Lokalizatsiya barcha tillarda to'g'ri
- [ ] Performans qoniqarli
