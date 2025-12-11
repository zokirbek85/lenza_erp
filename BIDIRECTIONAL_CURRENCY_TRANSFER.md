# Ikki Tomonlama Valyuta Konvertatsiyasi (USD ↔ UZS)

## O'zgartirishlar

### Backend Changes

1. **Serializer** (`backend/finance/serializers.py`):
   - `usd_amount` → `amount` (umumiy miqdor)
   - USD va UZS ikkalasini ham qo'llab-quvvatlaydi
   - Validatsiya: kassalar turli valyutada bo'lishi kerak

2. **View** (`backend/finance/views.py`):
   - Ikki tomonlama konvertatsiya: USD→UZS va UZS→USD
   - Avtomatik yo'nalishni aniqlash
   - To'g'ri hisoblash: USD→UZS (ko'paytirish), UZS→USD (bo'lish)

3. **Migration**:
   - `0013_...` - `created_by` field uchun `blank=True` qo'shildi
   - `0014_...` - Index rename (avtomatik)

### Frontend Changes

1. **Types** (`frontend/src/types/finance.ts`):
   - `usd_amount` → `amount`
   - `usd_transaction_id` → `source_transaction_id`
   - `uzs_transaction_id` → `target_transaction_id`

2. **Modal** (`frontend/src/components/finance/ConvertCurrencyModal.tsx`):
   - Dinamik yo'nalish aniqlash
   - Ikki tomonlama konvertatsiya UI
   - Dinamik label va hisoblash
   - Har qanday USD va UZS kassalarni tanlash imkoniyati

## Deployment

### 1. Backend

```bash
cd /var/www/lenza_erp/backend

# Pull yangilanishlar
git pull origin main

# Migrationlarni qo'llash
python manage.py migrate finance

# Restart backend
sudo systemctl restart lenza-backend
```

### 2. Frontend

```bash
cd /var/www/lenza_erp/frontend

# Pull yangilanishlar
git pull origin main

# Dependencies o'rnatish (agar kerak bo'lsa)
npm install

# Build
npm run build

# Restart (agar Docker ishlatilsa)
sudo systemctl restart lenza-frontend
```

### 3. Docker (agar ishlatilsa)

```bash
cd /var/www/lenza_erp

# Pull yangilanishlar
git pull origin main

# Rebuild va restart
docker-compose up -d --build backend frontend
```

## Sinov

1. Finance sahifasiga o'ting
2. "Valyuta Konvertatsiyasi" tugmasini bosing
3. **USD → UZS testi**:
   - "Kassadan": Cash USD
   - "Kassaga": Cash UZS, Card-Azimjon, yoki Card-Temurbek
   - Miqdor va kursni kiriting
   - "Konvertatsiya qilish" tugmasini bosing
4. **UZS → USD testi**:
   - "Kassadan": Cash UZS, Card-Azimjon, yoki Card-Temurbek
   - "Kassaga": Cash USD
   - Miqdor va kursni kiriting
   - "Konvertatsiya qilish" tugmasini bosing

## Xususiyatlar

✅ Ikki tomonlama konvertatsiya (USD↔UZS)
✅ Dinamik yo'nalish aniqlash
✅ Barcha USD va UZS kassalar uchun
✅ To'g'ri hisoblash formulalari
✅ Validatsiya: turli valyuta, yetarli balans
✅ Atomik transaksiyalar (rollback qo'llab-quvvatlash)
