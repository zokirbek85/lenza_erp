# Kunlik Orderlar va Moliyaviy Harakatlar Hisoboti

## Qisqacha ma'lumot

Orders sahifasiga "Kunlik hisobot" (Daily Report) funksiyasi qo'shildi. Bu hisobot kun bo'yicha barcha dillerlarning orderlar, to'lovlar, qaytarmalar va refundlarini batafsil ko'rsatadi.

## Tayyor qismlar

### 1. Backend

✅ **DailyFinancialReportService** (`backend/orders/services/daily_report.py`)
- Kun bo'yicha faol dillerlarni topish
- Har bir diller uchun batafsil ma'lumotlar:
  - Orderlar (mahsulot darajasigacha)
  - Qaytarmalar (Returns)
  - To'lovlar (account type bo'yicha: Cash-USD, Cash-UZS, Card, Bank)
  - Refundlar
- Umumiy xulosa generatsiyasi

✅ **DailyReportPDFView** (`backend/orders/views.py`)
- ExportMixin ishlatilgan
- WeasyPrint orqali PDF generatsiya
- Endpoint: `/api/orders/daily-report/pdf/?report_date=YYYY-MM-DD`

✅ **PDF Template** (`backend/templates/reports/daily_report.html`)
- Landscape (A4 format)
- Har bir diller bo'yicha blok-blok:
  1. Orderlar (mahsulot jadvali bilan)
  2. Returns (qaytarilgan mahsulotlar)
  3. Payments (to'lov turi bo'yicha)
  4. Refunds
- Kunlik umumiy xulosa (rasmiy buxgalteriya uslubida)

✅ **URL Routing** (`backend/core/urls.py`)
```python
path('api/orders/daily-report/pdf/', DailyReportPDFView.as_view(), name='orders-daily-report-pdf')
```

### 2. Frontend

✅ **Orders sahifasiga qo'shilgan** (`frontend/src/pages/Orders.tsx`)
- `handleDailyReportPDF()` funksiyasi
- Bugungi sanani avtomatik oladi
- Tugma: "📊 Kunlik hisobot"
- Export tugmalari orasiga joylashtirilgan

✅ **Translation keys** (`frontend/src/i18n/locales/uz/translation.json`)
```json
"dailyReport": {
  "button": "Kunlik hisobot",
  "tooltip": "Bugungi orderlar va moliyaviy harakatlar hisoboti"
},
"toast": {
  "dailyReportSuccess": "Kunlik hisobot yuklab olindi",
  "dailyReportError": "Kunlik hisobotni yuklab olib bo'lmadi"
}
```

## Xususiyatlar

### Hisobotga kiritilganlar

1. **Har bir diller uchun:**
   - Orderlar (batafsil mahsulot jadvali)
   - Qaytarilgan mahsulotlar (Returns)
   - To'lovlar:
     - Cash-USD
     - Cash-UZS (kurs bilan USD ekvivalenti)
     - Card (har bir hisob alohida)
     - Bank (har bir hisob alohida)
   - Refundlar

2. **Umumiy xulosa:**
   - Nechta diller order qilgani
   - Jami order summasi (USD)
   - Ombordan chiqim (mahsulot turi, miqdori, qiymati)
   - Nechta diller to'lov qilgani
   - Jami tushum (payment type bo'yicha)
   - Qaytgan mahsulotlar statistikasi
   - Refundlar statistikasi
   - Kun yakuniga barcha dillerlarning umumiy qarzdorligi
   - Ombordagi mahsulotlar holati

### Filtrlash

- **Sana bo'yicha**: Faqat ko'rsatilgan sanada sodir bo'lgan operatsiyalar
- **Faqat faol dillerlar**: Hech qanday harakati bo'lmagan dillerlar hisobotga kirmaydi

## Test qilish

### 1. Backend API test

```bash
# JSON format (debug uchun)
curl "http://127.0.0.1:8000/api/orders/daily-report/?report_date=2025-12-17" \
  -H "Authorization: Bearer YOUR_TOKEN"

# PDF format
curl "http://127.0.0.1:8000/api/orders/daily-report/pdf/?report_date=2025-12-17" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output daily_report.pdf
```

### 2. Frontend test

1. Tizimga admin/owner/accountant sifatida kiring
2. Orders sahifasiga o'ting
3. "📊 Kunlik hisobot" tugmasini bosing
4. PDF fayl yuklab olinadi

### 3. Test scenariyalari

**Scenario 1: Faol kunni test qilish**
- Ma'lumotlar bor kunga test qiling
- Tekshirish: Barcha dillerlar, orderlar, to'lovlar to'g'ri chiqadimi

**Scenario 2: Bo'sh kunni test qilish**
- Ma'lumot bo'lmagan kunga test qiling
- Natija: "No financial activities for this date" xabari

**Scenario 3: Umumiy xulosa**
- PDF oxiridagi umumiy xulosani o'qing
- Tekshirish: Hisob-kitoblar to'g'ri, rasmiy matn tushunarli

## Ma'lumotlar strukturasi

### DailyFinancialReportService

```python
service = DailyFinancialReportService(report_date=date(2025, 12, 17))
report_data = service.generate_report()

# Natija:
{
    'report_date': '2025-12-17',
    'dealers': [
        {
            'dealer_id': 1,
            'dealer_name': 'Diller nomi',
            'dealer_code': 'D001',
            'orders': [...],
            'returns': [...],
            'payments': [...],
            'refunds': [...]
        }
    ],
    'summary': {
        'report_date': date(2025, 12, 17),
        'exchange_rate': 12500.00,
        'orders': {...},
        'payments': {...},
        'returns': {...},
        'refunds': {...},
        'overall': {...}
    }
}
```

## Foydalanuvchi uchun yo'riqnoma

### Kimlar foydalana oladi?
- Admin
- Owner
- Accountant (Hisobchi)

### Qanday foydalanish?

1. **Kunlik hisobot olish:**
   - Orders sahifasiga o'ting
   - "📊 Kunlik hisobot" tugmasini bosing
   - PDF fayl avtomatik yuklab olinadi

2. **Hisobotni o'qish:**
   - Diller bo'yicha blok-blok ajratilgan
   - Har bir diller uchun:
     - Orderlar (mahsulot jadvali)
     - Qaytarmalar
     - To'lovlar (to'lov turi bo'yicha)
     - Refundlar
   - Oxirida umumiy xulosa (rasmiy buxgalteriya matnida)

3. **Xulosa qanday ko'rinadi:**

> "2025-yil 16-dekabr holatiga ko'ra, 6 ta diller tomonidan jami 3 245 AQSh dollari miqdorida buyurtmalar rasmiylashtirildi. Buyurtmalarni bajarish uchun ombordan 7 turdagi mahsulotdan jami 234,5 dona chiqim qilindi. Hisobot kuni davomida 7 ta dillerdan jami 6 570 AQSh dollari miqdorida to'lov qabul qilindi..."

## Texnik detalllar

### Dependencies
- WeasyPrint (PDF generation)
- Django templates (HTML rendering)
- ExportMixin (PDF helper)

### Performance
- Optimizatsiya: `select_related`, `prefetch_related` ishlatilgan
- Chunking: Katta ma'lumotlar uchun paginatsiya
- Caching: Valyuta kursi keshlangan

### Error Handling
- Invalid date format → 400 Bad Request
- No permission → 403 Forbidden
- PDF generation error → 500 Internal Server Error

## Keyingi qadamlar (optional)

1. **Sana filterini qo'shish** - Foydalanuvchi o'zi sanani tanlashi
2. **Email yuborish** - Hisobotni avtomatik email qilish
3. **Excel format** - PDF dan tashqari Excel ham qo'shish
4. **Grafik vizualizatsiya** - To'lovlar va orderlar grafigi
5. **Avtomatik generatsiya** - Har kuni soat 23:59 da avtomatik yaratilishi

## Xatolarni hal qilish

### PDF yaratilmayapti
```bash
# WeasyPrint o'rnatilganligini tekshirish
python -c "from weasyprint import HTML; print('OK')"

# GTK kutubxonalari (Windows uchun)
# Download: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
```

### Ma'lumotlar ko'rinmayapti
- Backend loglarni tekshiring
- Database migration bajarilganligini tasdiqlang
- Report sanasi to'g'ri kiritilganligini tekshiring

### Translation ishlamayapti
- Browser tilini o'zgartiring
- Backend `Accept-Language` header yuborayotganligini tekshiring

## Muvaffaqiyatli test natijalari

✅ PDF template yaratildi  
✅ Backend view va service tayyor  
✅ URL routing sozlandi  
✅ Frontend tugma va funksiya qo'shildi  
✅ Translation keys qo'shildi  
✅ Hech qanday TypeScript/Python xatolari yo'q  

**Status: TAYYOR - Test qilishingiz mumkin!** 🎉
