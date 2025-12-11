# Dealer Refund (Dilerga To'lov Qaytarish) Implementatsiyasi

## Umumiy Ma'lumot

Dealer refund — bu dilerga pul qaytarish funksiyasi. Bu moliya moduliga qo'shilgan yangi xususiyat bo'lib, dilerlarga to'lovlarni qaytarish imkonini beradi.

## Texnik Tafsilotlar

### 1. Backend O'zgarishlar

#### Models (`backend/finance/models.py`)
- Yangi transaction turi qo'shildi: `DEALER_REFUND`
- Migration: `0015_alter_financetransaction_type.py`

#### Serializer (`backend/finance/serializers.py`)
- **DealerRefundSerializer** yaratildi:
  - `dealer_id` - Diler IDsi
  - `amount` - Qaytariladigan summa
  - `currency` - Valyuta (USD/UZS)
  - `account_id` - Kassa IDsi
  - `description` - Izoh (ixtiyoriy)
- Validatsiya:
  - Diler mavjudligini tekshirish
  - Kassa mavjudligini tekshirish
  - Kassa va refund valyutasi mosligini tekshirish
  - Kassada yetarli mablag' borligini tekshirish

#### View (`backend/finance/views.py`)
- **DealerRefundView** yaratildi
- Endpoint: `POST /api/finance/dealer-refund/`
- Permission: Faqat admin va accountant
- Logika:
  - Valyuta konvertatsiyasi (agar kerak bo'lsa)
  - Exchange rate tizimdagi `exchange_rates` jadvalidan olinadi
  - Kassadan mablag' ayiriladi
  - Diler balansidan mablag' ayiriladi
  - Transaction yaratiladi va darhol APPROVED holatida saqlanadi

#### Konvertatsiya Qoidalari

**A) Dilerga UZS qaytarilsa:**
- UZS kassasidan chiqim
- Agar dealer balance USD bo'lsa:
  - `dealer_amount = uzs_amount / exchange_rate`
  - Dealer balance'dan USD miqdori ayiriladi

**B) Dilerga USD qaytarilsa:**
- USD kassasidan chiqim
- Agar dealer balance UZS bo'lsa:
  - `dealer_amount = usd_amount * exchange_rate`
  - Dealer balance'dan UZS miqdori ayiriladi

#### URL (`backend/finance/urls.py`)
```python
path('dealer-refund/', DealerRefundView.as_view(), name='dealer-refund'),
```

### 2. Frontend O'zgarishlar

#### Types (`frontend/src/types/finance.ts`)
```typescript
export interface DealerRefundRequest {
  dealer_id: number;
  amount: number;
  currency: 'USD' | 'UZS';
  account_id: number;
  description?: string;
}

export interface DealerRefundResponse {
  success: boolean;
  message: string;
  transaction_id: number;
  refund_amount: number;
  currency: string;
  dealer_balance_deduction: number;
  dealer_currency: string;
  exchange_rate: number | null;
  account: { id, name, new_balance };
  dealer: { id, name, new_balance };
}
```

#### API (`frontend/src/api/finance.ts`)
```typescript
export const dealerRefund = (data: DealerRefundRequest) =>
  http.post<DealerRefundResponse>('/finance/dealer-refund/', data);
```

#### Modal (`frontend/src/components/finance/DealerRefundModal.tsx`)
- Yangi modal komponenti yaratildi
- Xususiyatlari:
  - Diler tanlash (dropdown)
  - Valyuta tanlash (USD/UZS radio buttons)
  - Kassa tanlash (faqat tanlangan valyuta kassalari ko'rsatiladi)
  - Miqdor kiritish
  - Izoh (ixtiyoriy)
- Validatsiya:
  - Barcha majburiy maydonlar to'ldirilgan
  - Miqdor > 0
  - Kassada yetarli mablag' bor

#### Dashboard (`frontend/src/pages/FinanceDashboard.tsx`)
- Yangi tugma qo'shildi: **"Dilerga Qaytarish"** (orange button)
- Joylashuvi: "Kirim qo'shish" va "Chiqim qo'shish" orasida
- Modal ochiladi va muvaffaqiyatli refund dan keyin dashboard yangilanadi

## Deployment

### 1. Backend Deploy

```bash
cd /var/www/lenza_erp/backend

# Pull latest changes
git pull origin main

# Apply migrations
python manage.py migrate finance

# Restart backend
sudo systemctl restart lenza-backend
```

### 2. Frontend Deploy

```bash
cd /var/www/lenza_erp/frontend

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Build
npm run build

# Restart frontend (if using systemd)
sudo systemctl restart lenza-frontend
```

### 3. Docker Deploy (agar ishlatilsa)

```bash
cd /var/www/lenza_erp

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build backend frontend
```

## Testing

### Manual Testing Steps

1. **Finance dashboardga o'ting**
   - URL: `/finance`

2. **"Dilerga Qaytarish" tugmasini bosing**
   - Orange rangdagi tugma

3. **UZS Refund Test:**
   - Diler: Istalgan diler
   - Valyuta: UZS
   - Kassa: Cash UZS, Card-Azimjon, yoki Card-Temurbek
   - Miqdor: 100000
   - "To'lov qaytarish" tugmasini bosing

4. **USD Refund Test:**
   - Diler: Istalgan diler
   - Valyuta: USD
   - Kassa: Cash USD
   - Miqdor: 100
   - "To'lov qaytarish" tugmasini bosing

5. **Natijani tekshiring:**
   - Success message ko'rsatilishi kerak
   - Kassadagi balance kamayishi kerak
   - Transactions ro'yxatida yangi DEALER_REFUND transaction ko'rinishi kerak

### API Testing (Postman/cURL)

```bash
# Login qiling va token oling
TOKEN="your-auth-token"

# Dealer Refund
curl -X POST https://erp.lenza.uz/api/finance/dealer-refund/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dealer_id": 12,
    "amount": 300000,
    "currency": "UZS",
    "account_id": 4,
    "description": "Ortiqcha to'\''lov qaytarildi"
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Refund completed successfully",
  "transaction_id": 123,
  "refund_amount": 300000.0,
  "currency": "UZS",
  "dealer_balance_deduction": 23.62,
  "dealer_currency": "USD",
  "exchange_rate": 12700.0,
  "account": {
    "id": 4,
    "name": "Cash UZS",
    "new_balance": 5700000.0
  },
  "dealer": {
    "id": 12,
    "name": "Dealer Name",
    "new_balance": 476.38
  }
}
```

## Xavfsizlik

✅ Faqat admin va accountant rollari refund qila oladi  
✅ Kassada yetarli mablag' bor-yo'qligi tekshiriladi  
✅ Dealer mavjudligi tasdiqlanadi  
✅ Valyuta va kassa mos kelishi shart  
✅ Atomik transaction - agar xatolik bo'lsa rollback qilinadi  

## Xususiyatlar

✅ **Ikki tomonlama valyuta konvertatsiyasi** (UZS↔USD)  
✅ **Avtomatik exchange rate olish** (ExchangeRate modelidan)  
✅ **Dealer balance yangilanishi** (konvertatsiya bilan)  
✅ **Kassa balance yangilanishi**  
✅ **Transaction audit** (kim, qachon, qancha)  
✅ **Validatsiya** (yetarli balance, to'g'ri valyuta)  
✅ **User-friendly UI** (dropdown, radio, validation messages)  

## Qo'shimcha Ma'lumotlar

### Database Fields
FinanceTransaction model quyidagi fieldlardan foydalanadi:
- `type`: `DEALER_REFUND`
- `dealer`: Diler ForeignKey
- `account`: Kassa ForeignKey
- `amount`: Qaytariladigan summa (kassa valyutasida)
- `currency`: Kassa valyutasi
- `exchange_rate`: Konvertatsiya kursi (agar ishlatilsa)
- `category`: 'Dealer Refund'
- `comment`: Izoh
- `status`: `APPROVED` (darhol tasdiqlangan)
- `created_by`: Refund qilgan foydalanuvchi
- `approved_by`: created_by bilan bir xil

### Dealer Balance
**Muhim:** Dealer model `balance` fieldiga ega bo'lishi kerak. Agar bu field mavjud bo'lmasa, viewda `hasattr()` orqali tekshiriladi va refund o'tkaziladi, lekin dealer balance yangilanmaydi.

## Troubleshooting

### Xatolik: "Dealer not found"
- Dealer IDsi to'g'ri ekanligini tekshiring
- Dealer o'chirilmagan bo'lishi kerak

### Xatolik: "Insufficient balance"
- Kassadagi balance yetarli ekanligini tekshiring
- To'g'ri kassani tanlaganingizni tekshiring

### Xatolik: "Currency mismatch"
- Tanlangan kassa valyutasi refund valyutasiga mos kelishi kerak
- UZS kassadan faqat UZS, USD kassadan faqat USD qaytarish mumkin

### Xatolik: "Permission denied"
- Foydalanuvchi admin yoki accountant ro'liga ega bo'lishi kerak
- Token active va to'g'ri ekanligini tekshiring
