# Bildirishnomalar tizimi — Qo'llanma

**Sana:** 2025-yil 10-noyabr  
**Status:** ✅ TO'LIQ TAYYOR

---

## 🎯 Nima qilindi?

Real-time (jonli) **UI bildirishnomalar** tizimi to'liq ishga tushirildi:

✅ **WebSocket ulanish** JWT token bilan  
✅ **Qo'ng'iroq belgisi** headerda ko'rinadi (badge counter bilan)  
✅ **Avtomatik qayta ulanish** (3 soniyada)  
✅ **Click qilganda sahifaga o'tish** (order/payment/return)  
✅ **"Barchasini o'qilgan"** tugmasi  
✅ **Ant Design 5** dizayni  
✅ **Telegram** bilan birga ishlaydi  
✅ **Toast** xabarlari

---

## 🔧 O'zgarishlar

### Backend (3 fayl)

#### 1. `backend/notifications/consumers.py`
- JWT token tekshirish qo'shildi
- Token yo'q yoki noto'g'ri bo'lsa, ulanish rad etiladi

```python
# WebSocket URL:
ws://localhost:8000/ws/global/?token=<JWT_ACCESS_TOKEN>
```

#### 2. `backend/notifications/signals.py`
- Har bir xabarga `type` qo'shildi: `order`, `payment`, `return`
- Har bir xabarga `link` qo'shildi: `/orders`, `/payments`, `/returns`
- Order yaratilganda → `type='order'`, `link='/orders'`
- Payment yaratilganda → `type='payment'`, `link='/payments'`
- Return yaratilganda → `type='return'`, `link='/returns'`

#### 3. `backend/notifications/views.py`
**O'zgarmadi** — `mark_all` endpoint allaqachon mavjud ✅

---

### Frontend (3 fayl)

#### 1. `frontend/src/hooks/useGlobalSocket.ts`
- JWT token WebSocket URL'ga qo'shildi
- Avtomatik reconnect mexanizmi (3 soniya)

```typescript
const token = localStorage.getItem('lenza_access_token');
const url = `${base}/ws/global/?token=${token}`;

// Agar ulanish uzilsa, 3 soniyadan keyin qayta ulanadi
```

#### 2. `frontend/src/components/NotificationBell.tsx`
- **Ikonkalar** qo'shildi:
  - 🛒 Buyurtma (ko'k)
  - 💵 To'lov (yashil)
  - 🔄 Qaytish (qizg'ish-sariq)
  - ℹ️ Boshqa (kulrang)
- **Click** qilganda tegishli sahifaga o'tadi
- **Toast** xabarlari chiqadi

#### 3. `frontend/src/store/useNotificationStore.ts`
- `type` va `link` field'lari qo'shildi
- `addNotification()` metodi qo'shildi (jonli yangilash uchun)

---

## 🧪 Qanday tekshirish?

### 1. Serverni ishga tushiring

**Backend:**
```bash
cd backend
python manage.py runserver
# yoki Daphne bilan (WebSocket uchun):
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 2. Login qiling
- Frontend'ga kiring (http://localhost:5173)
- Browser console'ni oching (F12)
- Ko'rishingiz kerak:
  ```
  [WS] Connected to ws://localhost:8000/ws/global/?token=...
  ```

### 3. Buyurtma yarating
- UI orqali yoki API orqali yangi buyurtma yarating
- **Natija:**
  - 🔔 Qo'ng'iroq belgisida **badge** ko'rinadi (masalan: 1, 2, 3...)
  - 📢 Toast xabari chiqadi: "Yangi buyurtma"
  - ✅ Telegram'ga ham xabar yuboriladi (mavjud funksiya)

### 4. Bildirishnomani oching
- Qo'ng'iroq belgisiga **click** qiling
- Dropdown ochiladi (10 ta eng so'nggi xabar)
- Xabarga **click** qiling → `/orders` sahifasiga o'tadi

### 5. "Barchasini o'qilgan" tugmasini bosing
- Dropdown ichida **"Barchasini o'qilgan deyish"** tugmasini bosing
- Badge tozalanadi (0 ga qaytadi)
- Xabarlar yo'qoladi

---

## 🎨 UI ko'rinishi

### Qo'ng'iroq belgisi (header)
```
┌─────────────────────────────┐
│  🏠  🔔(3)  🌐  🌙  Chiqish │  ← Header
└─────────────────────────────┘
        ↑
    Badge (3 ta o'qilmagan)
```

### Dropdown (ochilganda)
```
┌──────────────────────────────────────┐
│ Bildirishnomalar (3)   [Barchasini]  │
├──────────────────────────────────────┤
│ 🛒 Yangi buyurtma                    │
│    ORD-001-10.11.2025 yaratildi      │
│    5 DAQIQA OLDIN                    │
├──────────────────────────────────────┤
│ 💵 To'lov qabul qilindi              │
│    Diler ABC dan 1000 USD            │
│    10 DAQIQA OLDIN                   │
├──────────────────────────────────────┤
│ 🔄 Qaytarish                         │
│    ORD-002-09.11.2025 qaytarildi     │
│    1 SOAT OLDIN                      │
└──────────────────────────────────────┘
```

---

## ✅ Test qilish (qadam-baqadam)

### Buyurtma yaratish testi

1. **Frontend'ga login qiling**
2. **Console tekshiring:** `[WS] Connected to ...` ko'rinishi kerak
3. **Yangi buyurtma yarating** (UI yoki API orqali)
4. **Kutilgan natija:**
   - ✅ Qo'ng'iroq badge: `1`
   - ✅ Toast: "Yangi buyurtma"
   - ✅ Dropdown'da: "ORD-XXX uchun buyurtma yaratildi"
   - ✅ Telegram'da: Xabar yuborildi
5. **Xabarga click qiling**
   - ✅ `/orders` sahifasiga o'tadi

### To'lov yaratish testi

1. **Yangi to'lov yarating**
2. **Kutilgan natija:**
   - ✅ Badge: `2` (agar oldingi xabar o'qilmagan bo'lsa)
   - ✅ Toast: "To'lov qabul qilindi"
   - ✅ Dropdown'da: Yashil dollar ikonkasi
   - ✅ Xabarga click → `/payments`

### Qaytarish yaratish testi

1. **Yangi qaytarish yarating**
2. **Kutilgan natija:**
   - ✅ Badge: oshadi
   - ✅ Toast: "Qaytarish"
   - ✅ Dropdown'da: Qizg'ish-sariq rollback ikonkasi
   - ✅ Xabarga click → `/returns`

### WebSocket reconnect testi

1. **Backend serverni to'xtating** (Ctrl+C)
2. **Console'ni tekshiring:**
   ```
   [WS] closed unexpectedly
   [WS] Attempting reconnect...
   ```
3. **Backend'ni qayta ishga tushiring**
4. **Console'da:**
   ```
   [WS] Connected to ws://...
   ```
5. **Buyurtma yarating** → Xabar kelishi kerak ✅

---

## 🔒 Xavfsizlik

✅ **JWT autentifikatsiya:** WebSocket faqat to'g'ri token bilan ochiladi  
✅ **Token tekshirish:** `rest_framework_simplejwt` bilan  
✅ **Noto'g'ri token:** Ulanish rad etiladi  
✅ **Token yangilanishi:** Mavjud auth flow'da bor

---

## 🚀 Production'ga o'tkazish

### Muhim o'zgarishlar kerak:

1. **Redis Channel Layer qo'shing** (`InMemoryChannelLayer` o'rniga):
```python
# backend/core/settings.py
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}
```

2. **Nginx konfiguratsiyasiga WebSocket qo'shing:**
```nginx
location /ws/ {
    proxy_pass http://daphne_websocket;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

3. **Daphne servisini ishga tushiring:**
```bash
daphne -b 127.0.0.1 -p 8001 core.asgi:application
```

---

## 📋 O'zgargan fayllar ro'yxati

### Backend
✅ `backend/notifications/consumers.py` — JWT auth  
✅ `backend/notifications/signals.py` — type/link fields  
✅ Boshqa fayllar o'zgarmadi (allaqachon to'g'ri edi)

### Frontend
✅ `frontend/src/hooks/useGlobalSocket.ts` — JWT token, reconnect  
✅ `frontend/src/components/NotificationBell.tsx` — Icons, navigation  
✅ `frontend/src/store/useNotificationStore.ts` — Type/link, addNotification  
✅ Boshqa fayllar o'zgarmadi (allaqachon integratsiya qilingan edi)

---

## 🎉 Natija

**Jonli bildirishnomalar tizimi to'liq ishlaydi!**

Foydalanuvchilar UI'da jonli ravishda bildirishnomalarni ko'rishadi:
- ✅ Yangi buyurtma yaratilganda
- ✅ To'lov qabul qilinganda
- ✅ Qaytarish amalga oshirilganda
- ✅ Kurs yangilanganda (agar signal qo'shilsa)

**Imkoniyatlar:**
- ✅ Chiroyli Ant Design dizayni
- ✅ Click qilganda sahifaga o'tish
- ✅ Avtomatik qayta ulanish
- ✅ Toast xabarlari
- ✅ "Barchasini o'qilgan" tugmasi
- ✅ JWT bilan xavfsiz WebSocket
- ✅ Telegram bilan birga ishlaydi

---

**Tayyor!** 🎊

Agar savol bo'lsa yoki muammo yuzaga kelsa, console'ni tekshiring:
- `[WS] Connected` — Ulanish muvaffaqiyatli ✅
- `[WS] Invalid token` — Token noto'g'ri ❌
- `[WS] closed unexpectedly` — Server to'xtagan yoki internetda muammo ⚠️

**NOTIFICATIONS_IMPLEMENTATION.md** faylida batafsil inglizcha hujjat bor.
