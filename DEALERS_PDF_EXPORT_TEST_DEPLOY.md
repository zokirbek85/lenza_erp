# Dealers PDF Export - Test va Deploy Qo'llanmasi

## Qisqa Xulasa

Dealers sahifasiga yangi funksiyalar qo'shildi:
1. **Date Filter** - Boshlanish va tugash sanalarini tanlash (default: joriy oy)
2. **PDF Export** - Tanlangan davr uchun dilerlar hisoboti

## Deploy Qadamlari

### 1. Backend Deploy

```bash
# Backend papkasiga o'tish
cd backend

# Dependencies tekshirish (kerak bo'lsa)
# pip install weasyprint pillow

# Migration tekshirish (yangi model o'zgarishlari yo'q)
# python manage.py makemigrations
# python manage.py migrate

# Static files to'plash (agar PDF template resources ishlatilsa)
python manage.py collectstatic --noinput
```

### 2. Frontend Build

```bash
# Frontend papkasiga o'tish
cd frontend

# Dependencies o'rnatish (agar kerak bo'lsa)
# npm install

# Build qilish
npm run build

# Agar development muhitda test qilsangiz
npm run dev
```

### 3. Restart Services

```bash
# Backend restart (Gunicorn/uWSGI)
sudo systemctl restart lenza-backend
# yoki
supervisorctl restart lenza-backend

# Nginx reload (agar static files yangilangan bo'lsa)
sudo nginx -t
sudo systemctl reload nginx
```

## Test Qilish

### 1. UI Testlari

1. Dealers sahifasiga o'ting: `/dealers`
2. Date filter'ni tekshiring:
   - Default qiymat joriy oy bo'lishi kerak
   - Sanani o'zgartirganda sahifa yangilanishi kerak
3. PDF export tugmasini bosing
4. PDF yuklab olinishi va ochilishi kerak

### 2. PDF Ma'lumotlarini Tekshirish

PDF'da quyidagilar bo'lishi kerak:
- [ ] Tartib raqam (1, 2, 3...)
- [ ] Diller nomlari
- [ ] Orderlar summasi (tanlangan davr, USD)
- [ ] Naqd tushum (USD)
- [ ] Karta tushum (USD)
- [ ] Bank tushum (USD)
- [ ] Jami tushum
- [ ] Yakuniy qarzdorlik (musbat qizil, manfiy yashil)
- [ ] Minglik ajratgich (1,234.56 formatda)
- [ ] Sahifa pastida davr va generatsiya sanasi

### 3. Edge Cases

Test qilish kerak bo'lgan holatlar:
- [ ] Hech qanday order/payment bo'lmagan diler (barcha ustunlar 0)
- [ ] Faqat orderlar bor, payment yo'q (qarzdorlik musbat)
- [ ] Faqat payment bor, order yo'q (qarzdorlik manfiy/yashil)
- [ ] Davr tanlanmasa (default joriy oy ishlatiladi)
- [ ] Bo'sh dilerlar ro'yxati ("No data available" ko'rsatiladi)

### 4. API Test (Manual)

```bash
# Test 1: Sana bilan
curl -H "Authorization: Token YOUR_TOKEN" \
  "http://localhost:8000/api/dealers/export/pdf/?start_date=2025-11-01&end_date=2025-11-30" \
  --output test_dealers.pdf

# Test 2: Sanasiz (default joriy oy)
curl -H "Authorization: Token YOUR_TOKEN" \
  "http://localhost:8000/api/dealers/export/pdf/" \
  --output test_dealers_default.pdf
```

### 5. Permission Test

Faqat quyidagi rollar PDF export qila olishi kerak:
- [ ] Admin
- [ ] Accountant (Buxgalter)
- [ ] Owner

Boshqa rollar (Sales, Warehouse) 403 Forbidden olishi kerak.

## Ma'lum Muammolar va Yechimlar

### PDF yaratilmayapti
**Xato**: `WeasyPrint` import xatosi
**Yechim**: 
```bash
pip install weasyprint
```

### Minglik ajratgich ko'rinmayapti
**Xato**: Template'da `floatformat` ishlatilgan
**Yechim**: Backend'da formatlangan string jo'natilmoqda (`f"{value:,.2f}"`)

### Date filter ishlamayapti
**Xato**: Filter state'da `start_date`, `end_date` yo'q
**Yechim**: `getDefaultDates()` funksiyasi state'ni to'g'ri initsializatsiya qiladi

### PDF'da ma'lumotlar noto'g'ri
**Muhim**: Quyidagilarni tekshiring:
1. `value_date__gte` va `value_date__lte` to'g'ri ishlayaptimi
2. `status__in=['confirmed', 'packed', 'shipped', 'delivered']` statuslar to'g'rimi
3. `payment_type` mapping (`cash`, `card`, `bank`) to'g'rimi
4. Returns/refunds ayirilganmi

## Rollback (agar kerak bo'lsa)

Agar muammo yuzaga kelsa:

1. **Frontend'ni qaytarish**:
```bash
cd frontend
git checkout HEAD~1 src/pages/Dealers.tsx
git checkout HEAD~1 src/i18n/locales/uz/translation.json
npm run build
```

2. **Backend'ni qaytarish**:
```bash
cd backend
git checkout HEAD~1 dealers/views.py
git checkout HEAD~1 core/urls.py
git checkout HEAD~1 templates/reports/dealers_export.html
sudo systemctl restart lenza-backend
```

## Monitoring

Deploy qilingandan keyin:
1. Backend logs'ni kuzating:
   ```bash
   tail -f /var/log/lenza-backend/error.log
   ```
2. Nginx logs'ni tekshiring:
   ```bash
   tail -f /var/log/nginx/error.log
   ```
3. PDF generation performance'ni monitoring qiling

## Success Metrics

Deploy muvaffaqiyatli bo'ldi deb hisoblanadi agar:
- [x] Date filter ishlaydi
- [x] PDF export tugmasi ko'rinadi
- [x] PDF yuklab olinadi
- [x] PDF ma'lumotlari to'g'ri
- [x] Formatlash to'g'ri (minglik ajratgich, 2 xonali aniqlik)
- [x] Rang kodlash ishlaydi
- [x] Edge cases handle qilinadi
- [x] Permissions to'g'ri
- [ ] Production'da hech qanday xato yo'q

## Qo'shimcha Resurslar

- **Dokumentatsiya**: `DEALERS_PDF_EXPORT_IMPLEMENTATION.md`
- **Template**: `backend/templates/reports/dealers_export.html`
- **Backend View**: `backend/dealers/views.py` > `DealerExportPDFView`
- **Frontend**: `frontend/src/pages/Dealers.tsx`

## Support

Muammo yuzaga kelsa:
1. Logs'ni tekshiring
2. `DEALERS_PDF_EXPORT_IMPLEMENTATION.md` ni o'qing
3. Edge cases bo'limini tekshiring
4. Development team bilan bog'laning
