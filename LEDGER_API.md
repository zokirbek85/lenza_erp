# Ledger API - Moliyaviy Balans Kalkulyatori

## Muhim o'zgarishlar

**Ledger endi alohida model emas!** Barcha ma'lumotlar `Payment` va `Expense` modellaridan real-time hisoblangan holda qaytariladi.

### Nima o'zgardi?

1. **LedgerRecord modeli o'chirildi** - endi dynamic calculation
2. **Payment modeliga `status` field qo'shildi** - `pending` yoki `confirmed`
3. **Faqat tasdiqlangan ma'lumotlar hisoblanadi**:
   - To'lovlar: `Payment.status = 'confirmed'`
   - Chiqimlar: `Expense.status = 'approved'`

4. **Dual-currency support** - USD va UZS alohida hisoblanadi
5. **Kurs hech qachon o'zgarmaydi** - amount_usd va amount_uzs save() paytida yoziladi

---

## API Endpoints

### 1. Ledger Summary
**GET** `/api/ledger/`

Barcha moliyaviy ma'lumotlarni qaytaradi - balanslar, tarix, kartalar.

**Query Parameters:**
- `from` (optional): `YYYY-MM-DD` format - boshlang'ich sana
- `to` (optional): `YYYY-MM-DD` format - tugash sanasi
- `card_id` (optional): Faqat bitta kartadagi operatsiyalar

**Response:**
```json
{
  "total_income_usd": 10000.50,
  "total_income_uzs": 126006300.00,
  "total_expense_usd": 5000.25,
  "total_expense_uzs": 63003150.00,
  "balance_usd": 5000.25,
  "balance_uzs": 63003150.00,
  "history": [
    {
      "date": "2025-11-15",
      "income_usd": 1000.00,
      "income_uzs": 12600000.00,
      "expense_usd": 500.00,
      "expense_uzs": 6300000.00,
      "balance_usd": 500.00,
      "balance_uzs": 6300000.00
    }
  ]
}
```

**Misol:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/ledger/?from=2025-01-01&to=2025-12-31"
```

---

### 2. Card Balance
**GET** `/api/cards/{card_id}/balance/`

Bitta kartadagi balansni qaytaradi.

**Response:**
```json
{
  "card_id": 1,
  "card_name": "Uzcard - Asosiy",
  "income_usd": 5000.00,
  "income_uzs": 63000000.00,
  "expense_usd": 2000.00,
  "expense_uzs": 25200000.00,
  "balance_usd": 3000.00,
  "balance_uzs": 37800000.00
}
```

**Misol:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/cards/1/balance/"
```

---

### 3. All Card Balances
**GET** `/api/ledger/by-card/`

Barcha kartalardagi balanslarni qaytaradi.

**Response:**
```json
[
  {
    "card_id": 1,
    "card_name": "Uzcard - Asosiy",
    "income_usd": 5000.00,
    "income_uzs": 63000000.00,
    "expense_usd": 2000.00,
    "expense_uzs": 25200000.00,
    "balance_usd": 3000.00,
    "balance_uzs": 37800000.00
  },
  {
    "card_id": 2,
    "card_name": "Humo - Zaxira",
    "income_usd": 3000.00,
    "income_uzs": 37800000.00,
    "expense_usd": 1000.00,
    "expense_uzs": 12600000.00,
    "balance_usd": 2000.00,
    "balance_uzs": 25200000.00
  }
]
```

---

### 4. Expenses by Category
**GET** `/api/ledger/by-category/`

Kategoriyalar bo'yicha chiqimlarni qaytaradi.

**Query Parameters:**
- `from` (optional): Boshlang'ich sana
- `to` (optional): Tugash sanasi

**Response:**
```json
[
  {
    "category": "Transport",
    "total_usd": 1000.00,
    "total_uzs": 12600000.00,
    "count": 10
  },
  {
    "category": "Ofis xarajatlari",
    "total_usd": 500.00,
    "total_uzs": 6300000.00,
    "count": 5
  }
]
```

---

## Frontend Integration

### ledgerApi.ts

```typescript
import http from '../app/http';

export interface LedgerSummary {
  total_income_usd: number;
  total_income_uzs: number;
  total_expense_usd: number;
  total_expense_uzs: number;
  balance_usd: number;
  balance_uzs: number;
  history: Array<{
    date: string;
    income_usd: number;
    income_uzs: number;
    expense_usd: number;
    expense_uzs: number;
    balance_usd: number;
    balance_uzs: number;
  }>;
}

// Fetch ledger summary
export const fetchLedgerSummary = async (filters?: {
  from?: string;
  to?: string;
  card_id?: number;
}): Promise<LedgerSummary> => {
  const response = await http.get('/api/ledger/', { params: filters });
  return response.data;
};

// Fetch all card balances
export const fetchCardBalances = async (): Promise<CardBalance[]> => {
  const response = await http.get('/api/ledger/by-card/');
  return response.data;
};

// Fetch single card balance
export const fetchCardBalance = async (cardId: number): Promise<CardBalance> => {
  const response = await http.get(`/api/cards/${cardId}/balance/`);
  return response.data;
};
```

### Ledger.tsx Usage

```tsx
import { fetchLedgerSummary, fetchCardBalances } from '../services/ledgerApi';

const [ledgerData, setLedgerData] = useState<LedgerSummary | null>(null);
const [cardBalances, setCardBalances] = useState<CardBalance[]>([]);

const loadData = async () => {
  const summary = await fetchLedgerSummary({
    from: '2025-01-01',
    to: '2025-12-31',
  });
  const cards = await fetchCardBalances();
  
  setLedgerData(summary);
  setCardBalances(cards);
};
```

---

## Database Schema Changes

### Payment Model

```python
class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        CONFIRMED = 'confirmed', 'Tasdiqlangan'
    
    # ... boshqa fieldlar
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMED,
        verbose_name="Status"
    )
```

**Migration:** `0005_add_payment_status.py`

---

## Performance Optimizations

### Select Related & Prefetch

Barcha querylar optimallashtirilgan:

```python
payments_qs = Payment.objects.filter(
    status=Payment.Status.CONFIRMED
).select_related('dealer', 'card')

expenses_qs = Expense.objects.filter(
    status=Expense.STATUS_APPROVED
).select_related('type', 'card')
```

### Aggregation

Bitta queryda barcha summalar hisoblanadi:

```python
total_income_usd = payments_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
```

### Daily Data Optimization

Dict ishlatish xotirani saqlaydi:

```python
daily_dict = {}
for item in daily_payments:
    daily_dict[item['day']] = {...}
```

---

## Testing

### 1. Test Payment Create
```bash
POST /api/payments/
{
  "dealer": 1,
  "amount": 100,
  "currency": "USD",
  "pay_date": "2025-11-15",
  "method": "cash",
  "status": "confirmed"
}
```

### 2. Check Ledger Balance
```bash
GET /api/ledger/
```

**Expected:** `total_income_usd` 100 ga oshishi kerak

### 3. Test Expense Create
```bash
POST /api/expenses/
{
  "type": 1,
  "amount": 50,
  "currency": "USD",
  "date": "2025-11-15",
  "method": "cash",
  "status": "approved"
}
```

### 4. Check Ledger Again
```bash
GET /api/ledger/
```

**Expected:** 
- `total_income_usd`: 100
- `total_expense_usd`: 50
- `balance_usd`: 50

---

## Business Logic

### Kirim (Income)
- `Payment.status = 'confirmed'` bo'lgan to'lovlar
- Dealer qarzini kamaytiradi
- Kartaga pul kiradi (agar card to'langan bo'lsa)

### Chiqim (Expense)
- `Expense.status = 'approved'` bo'lgan chiqimlar
- Kompaniya xarajatlari
- Kartadan pul chiqadi (agar card to'langan bo'lsa)

### Kurs (Currency Rate)
- Har bir to'lov va chiqim yaratilganda kurs yoziladi
- `amount_usd` va `amount_uzs` doimiy qoladi
- Kurs o'zgarganda ham qayta hisoblanmaydi

### Balans (Balance)
```
Balance = Income - Expense
```

USD va UZS alohida hisoblanadi:
- `balance_usd = total_income_usd - total_expense_usd`
- `balance_uzs = total_income_uzs - total_expense_uzs`

---

## Muhim Eslatmalar

1. **Status majburiy**: Yangi to'lovlar default `confirmed` bo'ladi
2. **Faqat tasdiqlangan**: Pending to'lovlar ledgerda ko'rinmaydi
3. **BigData ready**: Select_related va aggregate optimallashtirilgan
4. **Real-time**: Har doim eng yangi ma'lumot qaytaradi
5. **No model**: LedgerRecord modeli yo'q - faqat dynamic calculation

---

## Migration Guide

### Eski koddan yangi kodga o'tish:

**Eski:**
```typescript
const records = await fetchLedgerRecords();
const balance = await fetchLedgerBalance('all');
```

**Yangi:**
```typescript
const summary = await fetchLedgerSummary();
// summary.total_income_usd, summary.balance_usd, summary.history
```

**Eski:**
```python
ledger = LedgerRecord.objects.create(...)
```

**Yangi:**
```python
# To'lov yaratish kifoya - ledger avtomatik hisoblanadi
payment = Payment.objects.create(
    amount=100,
    currency='USD',
    status=Payment.Status.CONFIRMED
)
```

---

## API Versioning

**Current Version:** v1 (2025-11-16)

**Breaking Changes:**
- `/api/ledger/` endi LedgerSummary qaytaradi (eski LedgerRecord emas)
- `/api/ledger/balance/` endpoint o'chirildi
- `/api/ledger/trend/` endpoint o'chirildi
- `/api/ledger/distribution/` endpoint o'chirildi

**Yangi Endpoints:**
- `/api/ledger/` - LedgerSummary (history included)
- `/api/cards/{id}/balance/` - Single card balance
- `/api/ledger/by-card/` - All card balances
- `/api/ledger/by-category/` - Expenses by category

---

**Muallif:** Lenza ERP Team  
**Sana:** 2025-11-16  
**Versiya:** 2.0
