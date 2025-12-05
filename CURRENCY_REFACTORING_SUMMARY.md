# Valyuta tizimi to'liq refaktoring qilindi

## 🎯 Asosiy maqsad
Loyihadagi barcha qattiq kodlashtirilgan valyuta kurslarini (12600, 12700) olib tashlash va markazlashtirilgan, dinamik kurs tizimini joriy etish.

## ✅ Amalga oshirildi

### 1. **Markazlashtirilgan Currency Utility**
**Fayl:** `backend/core/utils/currency.py`

Yaratilgan funksiyalar:
- `get_exchange_rate(rate_date=None)` - Kurs va sana olish
- `usd_to_uzs(amount_usd, rate_date=None)` - USD → UZS konvertatsiya
- `uzs_to_usd(amount_uzs, rate_date=None)` - UZS → USD konvertatsiya
- `convert_currency(amount, from_currency, to_currency, rate_date=None)` - Umumiy konvertor

**Xususiyatlari:**
- 3 bosqichli fallback mexanizmi:
  1. Aniq sana uchun kursni qidirish
  2. Sanadan oldingi eng so'nggi kursni qidirish
  3. Bazadagi eng so'nggi kursni olish
  4. Barchasi bo'lmasa, 12700 fallback ishlatish
- Decimal aniqlik bilan hisoblash
- Tuple qaytaradi: `(miqdor, kurs)`

### 2. **Order Model - Valyuta kursini saqlash**
**Fayl:** `backend/orders/models.py`
**Migratsiya:** `0008_add_exchange_rate_to_order.py`

**Qo'shilgan maydonlar:**
```python
exchange_rate = DecimalField(max_digits=12, decimal_places=2, null=True)
exchange_rate_date = DateField(null=True)
```

**O'zgargan metodlar:**
- `recalculate_totals()` - Currency utility ishlatadi
- Buyurtma yaratilganda kurs avtomatik saqlanadi
- Tarixiy buyurtmalar o'z kursini saqlaydi

**Olib tashlandi:**
- Qattiq 12700 fallback
- Inline ExchangeRate query kodlari

### 3. **Dealer Model - Balans hisoblash**
**Fayl:** `backend/dealers/models.py`

**Refaktoring qilingan metodlar:**
- `balance_uzs` property - Currency utility ishlatadi
- `current_debt_uzs` property - Currency utility ishlatadi

**Olib tashlandi:**
- `USD_TO_UZS_RATE = Decimal('12600')` (3 ta joy)
- Barcha qattiq kurs hisoblashlari

**Yangi logika:**
```python
from core.utils.currency import usd_to_uzs

debt_uzs, _ = usd_to_uzs(debt_usd)
```

### 4. **FinanceTransaction - To'lov hisoblash**
**Fayl:** `backend/finance/models.py`

**Refaktoring qilingan metodlar:**
- `save()` metodi - Currency utility ishlatadi

**Olib tashlandi:**
- Inline `ExchangeRate.objects.filter()` query
- Qattiq 12700 fallback kodi

**Yangi logika:**
```python
from core.utils.currency import get_exchange_rate

rate, rate_date = get_exchange_rate(self.date)
self.exchange_rate = rate
self.exchange_rate_date = rate_date
```

### 5. **OrderSerializer - API javoblari**
**Fayl:** `backend/orders/serializers.py`

**Refaktoring qilingan metodlar:**
- `get_currency_rate()` - Currency utility ishlatadi

**Olib tashlandi:**
- Inline ExchangeRate query
- Qattiq 12700 fallback

### 6. **OrderInvoiceView - PDF invoice**
**Fayl:** `backend/orders/views_pdf.py`

**Refaktoring qilingan metodlar:**
- `get()` metodi - Currency utility ishlatadi

**Olib tashlandi:**
- 2 ta ExchangeRate query
- Qattiq 12700 fallback

## 🧪 Testlar

**Fayl:** `backend/core/tests/test_currency.py`

**14 ta test yozildi:**
1. ✅ Aniq sana uchun kurs olish
2. ✅ O'tmish sana uchun kurs olish
3. ✅ Sanasiz kurs olish (eng so'nggi)
4. ✅ Fallback kurs (baza bo'sh bo'lganda)
5. ✅ USD → UZS konvertatsiya
6. ✅ UZS → USD konvertatsiya
7. ✅ Nol miqdorlar bilan konvertatsiya
8. ✅ Bir xil valyuta konvertatsiyasi
9. ✅ Qo'llab-quvvatlanmaydigan valyuta xatosi
10. ✅ Kurs tanlash logikasi
11. ✅ Decimal aniqlik ushlab turish
12. ✅ Generic convert_currency USD→UZS
13. ✅ Generic convert_currency UZS→USD
14. ✅ Generic convert_currency bir xil valyuta

**Natija:** Barcha testlar o'tdi ✅

## 📊 Natijalar

### Olib tashlandi:
- ❌ 12600 qattiq kurs - 3 ta joy (dealers)
- ❌ 12700 qattiq fallback - 4 ta joy (orders, finance, serializers, views_pdf)
- ❌ Inline ExchangeRate query kodlari - 5 ta joy
- ❌ Takrorlanuvchi kurs olish logikasi - 6 ta joy

### Qo'shildi:
- ✅ Markazlashtirilgan currency utility modul
- ✅ Order modelida exchange_rate saqlash
- ✅ 14 ta to'liq test
- ✅ Tarixiy kurs saqlash mexanizmi

### Yaxshilandi:
- 🎯 Bir joydan barcha valyuta konvertatsiyalarini boshqarish
- 🎯 Tarixiy buyurtmalar o'z kursini saqlab qoladi
- 🎯 Kurs bazadan avtomatik olinadi
- 🎯 Fallback faqat bitta joyda (currency.py)
- 🎯 Barcha hisoblashlarda bir xil logika

## 📝 Keyingi qadamlar

### Backend
1. ✅ Currency utility yaratish
2. ✅ Order modelini yangilash
3. ✅ Dealer modelini refaktoring qilish
4. ✅ FinanceTransaction yangilash
5. ✅ Serializer va view'larni yangilash
6. ✅ Testlar yozish
7. ✅ Migratsiyalarni yaratish va ishga tushirish

### Frontend (keyinchalik)
1. ⏳ AddIncomeModal - kurs tanlash qo'shish
2. ⏳ AddExpenseModal - kurs tanlash qo'shish
3. ⏳ Dealer detail page - kurs ma'lumotini ko'rsatish
4. ⏳ Order detail page - kurs ma'lumotini ko'rsatish
5. ⏳ Reconciliation page - kursni ko'rsatish

### Qo'shimcha
1. ⏳ Dashboard API - kurs ma'lumotlarini qo'shish
2. ⏳ Reconciliation service - kurs logikasini yangilash
3. ⏳ Import orders - kursni to'g'ri o'rnatish
4. ⏳ PDF invoice'larda kurs ko'rsatish

## 🚀 Deploy

### Local development
```bash
cd backend
python manage.py migrate
python manage.py test core.tests.test_currency
python manage.py runserver
```

### Production
```bash
# Backupni oling
./backup.sh

# Git commit
git add .
git commit -m "feat: refactor currency system - remove hardcoded rates, add exchange_rate to Order model"
git push

# VPS'da
cd /path/to/lenza_erp
git pull
cd backend
source venv/bin/activate
python manage.py migrate
sudo systemctl restart lenza_erp
```

## 📈 Takomillashtirish

### Kurs tarixi
- ExchangeRate modelida har kun uchun kurs mavjud bo'lishi kerak
- Admin panelda kursni qo'shish/yangilash interfeysi
- CBU API bilan avtomatik kurs yangilanishi

### Monitoring
- Kurs yangilanmasa ogohlantirish
- Fallback ishlatilganda log yozish
- Kurs farqi katta bo'lsa (10%+) ogohlantirish

### Dokumentatsiya
- Currency utility API docs
- Kurs tizimi foydalanish qo'llanmasi
- Frontend integratsiya qo'llanmasi

## 👥 Kim bajargan
- **Refaktoring:** GitHub Copilot
- **Sana:** 2025-12-05
- **Branch:** main
- **Commit:** feat: refactor currency system

## 📚 Qo'shimcha ma'lumotlar

### ExchangeRate model
```python
class ExchangeRate(models.Model):
    rate_date = models.DateField(unique=True, db_index=True)
    usd_to_uzs = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        ordering = ['-rate_date']
```

### Currency utility usage
```python
from core.utils.currency import get_exchange_rate, usd_to_uzs, uzs_to_usd

# Kurs olish
rate, rate_date = get_exchange_rate(order.value_date)

# USD → UZS
amount_uzs, rate = usd_to_uzs(100.00, order.value_date)

# UZS → USD
amount_usd, rate = uzs_to_usd(1280000.00, order.value_date)
```

---
**Status:** ✅ Bajarildi va test qilindi
