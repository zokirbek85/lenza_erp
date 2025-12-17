# Product Inbound - Quick Start Guide

## O'rnatish (Installation)

### 1. Database Migration

**Windows:**
```powershell
cd backend
python manage.py migrate
```

**Linux/Mac:**
```bash
cd backend
python manage.py migrate
```

### 2. Server Restart

Development ortam uchun:
```bash
# Backend
cd backend
python manage.py runserver

# Frontend (yangi terminal)
cd frontend
npm run dev
```

## Foydalanish (Usage)

### Mahsulot kirimini yaratish

1. **Tizimga kirish**
   - Admin yoki warehouse roliga ega foydalanuvchi sifatida kiring

2. **Kirimlar sahifasini ochish**
   - Products menyusidan "📦 Mahsulot kirimi" tugmasini bosing
   - Yoki to'g'ridan-to'g'ri `/products/inbounds` ga o'ting

3. **Yangi kirim yaratish**
   - "Yangi kirim" tugmasini bosing
   - Yetkazib beruvchini (Brand) tanlang
   - Sana va izoh kiriting
   - Mahsulotlarni qo'shing:
     * Mahsulot tanlang (faqat tanlangan brand mahsulotlari)
     * Miqdor kiriting
     * "+" tugmasini bosing
   - "Saqlash" tugmasini bosing

4. **Kirimni tasdiqlash**
   - Kirimlar ro'yxatidan kirimni toping
   - "Tasdiqlash" tugmasini bosing
   - Tasdiqlash dialogini o'qing
   - "Tasdiqlash" ni bosing
   - ✅ Stock avtomatik yangilanadi!

### Misollar

#### Oddiy kirim
```
Yetkazib beruvchi: TOREX
Sana: 2024-12-18
Mahsulotlar:
  - Door Model A (SKU: DMA-001) x 10
  - Door Model B (SKU: DMB-002) x 5
Jami: 15 dona
```

#### Ko'p mahsulotli kirim
```
Yetkazib beruvchi: Металлист
Sana: 2024-12-18
Izoh: Yangi partiya, faktura #12345
Mahsulotlar:
  - Metal Door 800x2000 x 20
  - Metal Door 900x2000 x 15
  - Metal Door 700x2000 x 10
  - Accessories Kit x 50
Jami: 95 dona
```

## API Test (Postman/curl)

### List all inbounds
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/inbounds/
```

### Create inbound
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": 1,
    "date": "2024-12-18",
    "comment": "Test inbound",
    "items": [
      {
        "product": 1,
        "quantity": 10
      },
      {
        "product": 2,
        "quantity": 5
      }
    ]
  }' \
  http://localhost:8000/api/inbounds/
```

### Confirm inbound
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/inbounds/1/confirm/
```

## Tez-tez beriladigan savollar (FAQ)

### Q: Draft kirimda stock o'zgaradimi?
A: Yo'q! Faqat tasdiqlangandan keyin stock yangilanadi.

### Q: Tasdiqlangan kirimni tahrirlash mumkinmi?
A: Yo'q, bu xavfsizlik va audit uchun zarur.

### Q: Bir mahsulotni ikki marta qo'shsam nima bo'ladi?
A: Tizim duplicate mahsulotlarni qabul qilmaydi va xato beradi.

### Q: Boshqa brand mahsulotini qo'shsam?
A: Backend validatsiya xatosi — mahsulot tanlangan brandga tegishli bo'lishi kerak.

### Q: Transaction xato bersa nima bo'ladi?
A: Django transaction avtomatik rollback qiladi — stock o'zgarmaydi.

### Q: Stock manfiy bo'lishi mumkinmi?
A: Yo'q, Product modelida stock_ok >= 0 validatsiyasi bor.

## Xato bartaraf qilish (Troubleshooting)

### Migration xatosi
```bash
# Clear migrations and retry
python manage.py migrate --fake catalog zero
python manage.py migrate catalog
```

### API 403 Forbidden
- Tokenni tekshiring
- Role tekshiring (admin yoki warehouse)
- CSRF token (agar development emas bo'lsa)

### Frontend 404 Not Found
- Backend serverini tekshiring
- API base URL ni tekshiring (`http.ts`)
- CORS sozlamalarini tekshiring

### Stock yangilanmayapti
- Inbound tasdiqlangan ekanligini tekshiring
- Database transactionni tekshiring
- Backend log'larni tekshiring

## Qo'shimcha ma'lumot

Batafsil ma'lumot uchun:
- [PRODUCT_INBOUND_IMPLEMENTATION.md](PRODUCT_INBOUND_IMPLEMENTATION.md) - To'liq texnik dokumentatsiya
- Backend admin: http://localhost:8000/admin/catalog/inbound/
- API documentation: http://localhost:8000/api/schema/swagger-ui/

---

**Yordam kerakmi?**
1. Dokumentatsiyani o'qing
2. Error log'larni tekshiring
3. Migration holatini tekshiring: `python manage.py showmigrations catalog`
