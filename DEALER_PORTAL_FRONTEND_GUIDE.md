# Dealer Portal Frontend - Qo'llanma

## Yaratilgan Sahifalar

### 1. Login Sahifasi
**Path:** `/dealer-portal/login`
**File:** `frontend/src/pages/dealer-portal/DealerLogin.tsx`

Xususiyatlar:
- Username va password input
- Form validation
- Error handling
- Avtomatik redirect dashboard'ga
- Responsive design

### 2. Dashboard
**Path:** `/dealer-portal/dashboard`
**File:** `frontend/src/pages/dealer-portal/DealerDashboard.tsx`

Ko'rsatiladigan ma'lumotlar:
- Diller umumiy ma'lumoti (kod, nom, hudud, menejer)
- Balans (USD va UZS)
- Statistika kartochkalar

### 3. Buyurtmalar
**Path:** `/dealer-portal/orders`
**File:** `frontend/src/pages/dealer-portal/DealerOrders.tsx`

Funksiyalar:
- Buyurtmalar ro'yxati (pagination)
- Status ko'rsatkichi (rangli tag'lar)
- Har bir buyurtma uchun PDF export
- Sana, summa, status filtrlari

### 4. To'lovlar
**Path:** `/dealer-portal/payments`
**File:** `frontend/src/pages/dealer-portal/DealerPayments.tsx`

Funksiyalar:
- To'lovlar jadvali
- Barcha to'lovlarni PDF export
- USD va UZS summalar
- Hisob va izohlar

### 5. Qaytarishlar
**Path:** `/dealer-portal/returns`
**File:** `frontend/src/pages/dealer-portal/DealerReturns.tsx`

Funksiyalar:
- 2 ta tab: Qaytarish hujjatlari va Buyurtmadan qaytarishlar
- PDF export
- Nuqsonli/sog'lom ko'rsatkichi
- Mahsulot detallari

### 6. Refundlar
**Path:** `/dealer-portal/refunds`
**File:** `frontend/src/pages/dealer-portal/DealerRefunds.tsx`

Funksiyalar:
- Refundlar jadvali
- PDF export
- Summa ko'rsatkichlari
- Status tracking

### 7. Layout
**File:** `frontend/src/pages/dealer-portal/DealerLayout.tsx`

Xususiyatlar:
- Sidebar menu (collapsible)
- Header (diller nomi va logout button)
- Responsive design (mobile-friendly)
- Navigation menu:
  - Dashboard
  - Buyurtmalar
  - To'lovlar
  - Qaytarishlar
  - Refundlar

## Routing

Router konfiguratsiyasi `frontend/src/app/router.tsx` fayliga qo'shildi:

```typescript
// Public route
{
  path: '/dealer-portal/login',
  element: <DealerLogin />,
}

// Protected routes (DealerLayout ichida)
{
  path: '/dealer-portal',
  element: <DealerLayout />,
  children: [
    { index: true, element: <DealerDashboard /> },
    { path: 'dashboard', element: <DealerDashboard /> },
    { path: 'orders', element: <DealerOrders /> },
    { path: 'payments', element: <DealerPayments /> },
    { path: 'returns', element: <DealerReturns /> },
    { path: 'refunds', element: <DealerRefunds /> },
  ],
}
```

## Ishlatish

### Login

1. Brauzerda oching: `https://erp.lenza.uz/dealer-portal/login`
2. Admin bergan username va password kiriting
3. "Kirish" tugmasini bosing
4. Avtomatik dashboard'ga o'tadi

### Dashboard

Login qilgandan keyin avtomatik dashboard ochiladi:
- Balans ma'lumotlari ko'rinadi
- Statistika kartochkalar
- Sidebar orqali boshqa sahifalarga o'tish mumkin

### PDF Yuklash

**Buyurtmalar:**
- Har bir buyurtma qatorida "PDF" tugmasi
- Bosilganda alohida buyurtma PDF yuklanadi

**To'lovlar, Qaytarishlar, Refundlar:**
- Yuqori qismida "PDF yuklash" / "Barchani PDF yuklash" tugmasi
- Bosilganda barcha ma'lumotlar PDF formatda yuklanadi

### Logout

Header'dagi "Chiqish" tugmasini bosing:
- Session tozalanadi
- Login sahifasiga qaytadi

## API Integration

Barcha sahifalar `axios` orqali backend API bilan ishlaydi:

```typescript
// Login
POST /api/dealer-portal/login/
{
  username: "test001",
  password: "password123"
}

// Profile
GET /api/dealer-portal/profile/

// Orders
GET /api/dealer-portal/orders/
GET /api/dealer-portal/orders/{id}/pdf/

// Payments
GET /api/dealer-portal/payments/
GET /api/dealer-portal/payments/export_pdf/

// Returns
GET /api/dealer-portal/returns/
GET /api/dealer-portal/returns/order_returns/
GET /api/dealer-portal/returns/export_pdf/

// Refunds
GET /api/dealer-portal/refunds/
GET /api/dealer-portal/refunds/export_pdf/
```

**Important:** Barcha requestlar `withCredentials: true` bilan yuboriladi (cookie-based authentication).

## State Management

### LocalStorage
Dealer ma'lumotlari localStorage'da saqlanadi:

```typescript
// Login'da saqlanadi
localStorage.setItem('dealer', JSON.stringify(dealerData));

// Layout'da o'qiladi
const dealer = JSON.parse(localStorage.getItem('dealer'));

// Logout'da o'chiriladi
localStorage.removeItem('dealer');
```

### Session Check
Har bir sahifa ochilganda localStorage'dan dealer ma'lumotlari tekshiriladi. Agar bo'lmasa, login sahifasiga redirect qilinadi.

## Styling

Ant Design komponentlari ishlatilgan:
- Layout, Menu, Button, Table, Card
- Form, Input, Typography
- Tag, Statistic, Space
- Message (notifications)

Ranglar:
- Primary: Ant Design default blue
- Success: Green (#3f8600)
- Error/Debt: Red (#cf1322)
- Gradient (Login): Purple gradient

## Responsive Design

Barcha sahifalar responsive:
- Desktop: Full sidebar + content
- Tablet: Collapsible sidebar
- Mobile: Hidden sidebar (burger menu)

Grid breakpoints:
```typescript
<Col xs={24} sm={12} md={8} lg={6}>
```

## Error Handling

Barcha API calllar try-catch bilan:

```typescript
try {
  const response = await axios.get('/api/...');
  setData(response.data);
} catch (error) {
  message.error('Xatolik yuz berdi');
  console.error(error);
}
```

## File Structure

```
frontend/src/pages/dealer-portal/
├── DealerLogin.tsx       # Login sahifasi
├── DealerLayout.tsx      # Layout (sidebar + header)
├── DealerDashboard.tsx   # Dashboard
├── DealerOrders.tsx      # Buyurtmalar
├── DealerPayments.tsx    # To'lovlar
├── DealerReturns.tsx     # Qaytarishlar
└── DealerRefunds.tsx     # Refundlar
```

## Testing

### Manual Testing

1. **Login Test:**
   - URL: `/dealer-portal/login`
   - Credentials: Admin'dan olingan username/password
   - Expected: Redirect to dashboard

2. **Dashboard Test:**
   - Check: Balans ko'rsatiladi
   - Check: Profil ma'lumotlari to'g'ri

3. **Orders Test:**
   - Check: Buyurtmalar ro'yxati
   - Check: PDF download ishlaydi

4. **Logout Test:**
   - Check: Chiqish tugmasi ishlaydi
   - Check: Qayta login qilish talab qilinadi

## Troubleshooting

### 404 Error
**Sabab:** Frontend routes configured emas
**Yechim:** `router.tsx`da routes qo'shilganini tekshiring

### 401 Unauthorized
**Sabab:** Session expired yoki login qilinmagan
**Yechim:** Qayta login qiling

### CORS Error
**Sabab:** Backend CORS sozlanmagan
**Yechim:** Django settings'da CORS configured bo'lishi kerak

### PDF yuklanmaydi
**Sabab:** Blob response to'g'ri handle qilinmagan
**Yechim:** `responseType: 'blob'` borligini tekshiring

## Next Steps (Optional Enhancements)

1. **Search & Filter:**
   - Buyurtmalarni izlash
   - Sana filtrlari
   - Status filtrlari

2. **Details Modal:**
   - Buyurtma tafsilotlari modal'da
   - Mahsulotlar ro'yxati

3. **Pagination:**
   - Server-side pagination
   - Page size selector

4. **Loading States:**
   - Skeleton loaders
   - Better loading indicators

5. **Charts:**
   - Balans grafikasi
   - To'lovlar statistikasi

6. **Notifications:**
   - Yangi buyurtma notifications
   - To'lov tasdiqlash notifications

7. **Mobile App:**
   - React Native version
   - Push notifications

8. **Password Change:**
   - Parol o'zgartirish sahifasi
   - Forgot password functionality

## Production Deployment

Build qilish:
```bash
cd frontend
npm run build
```

Build files `frontend/dist/` papkada hosil bo'ladi va Django static files sifatida serve qilinadi.

---

**Yaratilgan sana:** 2025-12-22
**Version:** 1.0.0
**Status:** ✅ Ready for Production
