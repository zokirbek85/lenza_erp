# Dealer Portal - Diller Self-Service Portali

## Umumiy ma'lumot

Dealer Portal - bu dillerlarning o'z hisobvaraqlarini mustaqil ravishda boshqarishi uchun yaratilgan tizim. Dillerlar o'zlariga tegishli buyurtmalar, to'lovlar, qaytarishlar va refundlarni ko'rish va PDF formatda yuklab olishlari mumkin.

## Asosiy imkoniyatlar

### 1. Avtomatik Login/Password Generatsiyasi
- Har bir diller uchun avtomatik unique username va password yaratiladi
- Username diller kodidan generatsiya qilinadi (masalan: `diller123`)
- Password 12 belgidan iborat random string (harflar + raqamlar)
- Password hash qilinib saqlanadi (Django's make_password)

### 2. Dealer Authentication
- Session-based authentication
- Alohida authentication backend (`DealerAuthentication`)
- Login/logout endpoints
- Portal access faqat `portal_enabled=True` bo'lgan dillerlar uchun

### 3. Diller Portal API Endpoints

#### Authentication
- `POST /api/dealer-portal/login/` - Diller login
- `POST /api/dealer-portal/logout/` - Diller logout
- `GET /api/dealer-portal/profile/` - Diller profil ma'lumotlari

#### Orders (Buyurtmalar)
- `GET /api/dealer-portal/orders/` - Barcha buyurtmalar ro'yxati
- `GET /api/dealer-portal/orders/{id}/` - Alohida buyurtma detallari
- `GET /api/dealer-portal/orders/{id}/pdf/` - Buyurtma PDF export

#### Payments (To'lovlar)
- `GET /api/dealer-portal/payments/` - Barcha to'lovlar ro'yxati
- `GET /api/dealer-portal/payments/{id}/` - Alohida to'lov detallari
- `GET /api/dealer-portal/payments/export_pdf/` - Barcha to'lovlar PDF export

#### Returns (Qaytarishlar)
- `GET /api/dealer-portal/returns/` - Qaytarishlar ro'yxati
- `GET /api/dealer-portal/returns/{id}/` - Alohida qaytarish detallari
- `GET /api/dealer-portal/returns/order_returns/` - Buyurtmadan qaytarishlar
- `GET /api/dealer-portal/returns/export_pdf/` - Qaytarishlar PDF export

#### Refunds (Refundlar)
- `GET /api/dealer-portal/refunds/` - Refundlar ro'yxati
- `GET /api/dealer-portal/refunds/{id}/` - Alohida refund detallari
- `GET /api/dealer-portal/refunds/export_pdf/` - Refundlar PDF export

## Admin Panel - Credential Management

### Diller uchun portal kirish huquqini berish

1. **Django Admin panelga kiring:** `/admin/`
2. **Dealers bo'limiga o'ting**
3. **Dillerni tanlang** (checkbox orqali)
4. **Actions dropdown'dan quyidagilarni tanlang:**

#### Generate portal credentials
- Tanlangan dillerlar uchun yangi login/password yaratadi
- **MUHIM:** Parollar faqat bir marta ko'rsatiladi, keyinchalik ko'rish mumkin emas!
- Natija: `Username: diller123, Password: aBcD1234eFgH`

#### Reset portal passwords
- Mavjud dillerlarning parolini yangilaydi
- Username o'zgarmaydi, faqat parol yangilanadi
- **MUHIM:** Yangi parolni darhol nusxalang!

#### Enable portal access
- Tanlangan dillerlar uchun portal kirishni yoqadi (`portal_enabled=True`)

#### Disable portal access
- Tanlangan dillerlar uchun portal kirishni o'chiradi

## Database Schema Yangilanishlari

### Dealer modeliga qo'shilgan yangi fieldlar:

```python
class Dealer(models.Model):
    # ... mavjud fieldlar ...

    # Portal access credentials
    portal_username = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True
    )
    portal_password = models.CharField(
        max_length=128,  # hashed password
        null=True,
        blank=True
    )
    portal_enabled = models.BooleanField(
        default=False
    )
```

### Migration
Migration fayl yaratilgan va apply qilingan:
- `dealers/migrations/0006_dealer_portal_enabled_dealer_portal_password_and_more.py`

## Xavfsizlik

1. **Password Hashing:** Parollar Django's `make_password()` orqali hash qilinadi
2. **Session-based Auth:** Token o'rniga session ishlatiladi
3. **Permission Checks:** Har bir request'da `IsDealerAuthenticated` permission tekshiriladi
4. **Data Isolation:** Diller faqat o'ziga tegishli ma'lumotlarni ko'radi

## Kod Strukturasi

```
backend/
├── dealers/
│   ├── models.py (Dealer model updates)
│   ├── admin.py (Admin actions)
│   └── migrations/0006_...
├── dealer_portal/
│   ├── authentication.py (DealerAuthentication backend)
│   ├── permissions.py (IsDealerAuthenticated)
│   ├── serializers.py (API serializers)
│   ├── views.py (ViewSets)
│   └── urls.py (URL routing)
├── templates/dealer_portal/
│   ├── payments_report.html
│   ├── returns_report.html
│   └── refunds_report.html
└── core/
    ├── settings.py (dealer_portal app qo'shilgan)
    └── urls.py (dealer portal routes)
```

## Ishlatish - Step by Step

### Admin tomonidan:

1. Django admin panelga kiring
2. Dealers ro'yxatidan kerakli dillerlarni tanlang
3. Actions → "Generate portal credentials" ni tanlang
4. Credentials ko'rsatiladi - **NUSXALANG!**
5. Ushbu login/parolni dillerga yuboring

### Diller tomonidan:

1. Login qiling:
```bash
POST /api/dealer-portal/login/
{
    "username": "diller123",
    "password": "aBcD1234eFgH"
}
```

2. Orders ko'ring:
```bash
GET /api/dealer-portal/orders/
```

3. PDF yuklab oling:
```bash
GET /api/dealer-portal/payments/export_pdf/
```

## API Test - cURL misollar

### Login
```bash
curl -X POST http://localhost:8000/api/dealer-portal/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "diller123", "password": "aBcD1234eFgH"}' \
  -c cookies.txt
```

### Get Orders (cookie bilan)
```bash
curl http://localhost:8000/api/dealer-portal/orders/ \
  -b cookies.txt
```

### Download PDF
```bash
curl http://localhost:8000/api/dealer-portal/payments/export_pdf/ \
  -b cookies.txt \
  -o payments.pdf
```

## Frontend Integration Yo'nalishlari

Frontend yaratish uchun tavsiyalar:

1. **Login sahifasi** - username/password input
2. **Dashboard** - balans, oxirgi buyurtmalar
3. **Sidebar menu:**
   - Buyurtmalar
   - To'lovlar
   - Qaytarishlar
   - Refundlar
   - Profil
4. **Har bir sahifada:**
   - Ro'yxat (pagination)
   - Detail modal
   - PDF export tugmasi

## Keyingi Qadamlar (Ixtiyoriy)

1. **Password Reset:** Email orqali parol tiklash
2. **2FA:** Qo'shimcha xavfsizlik
3. **Notification System:** Yangi buyurtma/to'lov haqida xabar
4. **Order Creation:** Dillerlarning o'zlari buyurtma yaratishi
5. **File Uploads:** Hujjat yuklash
6. **Chat Support:** Diller bilan manager chat

## Muhim Eslatmalar

- ⚠️ Parollar faqat **bir marta** ko'rsatiladi - darhol nusxalang!
- ⚠️ Portal access `is_active=False` bo'lgan dillerlarga berilmaydi
- ⚠️ Session timeout default 2 hafta (sozlanishi mumkin)
- ✅ Barcha API'lar faqat diller o'z ma'lumotlarini ko'radi
- ✅ PDF exportlar backend'da generatsiya qilinadi (WeasyPrint)

## Texnik Ma'lumotlar

- **Backend:** Django 4.x + DRF
- **Authentication:** Session-based
- **Password:** bcrypt hash (Django default)
- **PDF Generation:** WeasyPrint
- **Database:** PostgreSQL (production) / SQLite (dev)

## Support

Savollar bo'lsa:
- GitHub Issues: [lenza_erp/issues](https://github.com/your-repo/issues)
- Email: support@lenza-erp.uz
