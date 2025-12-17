# Mahsulot Kirimi (Product Inbound) Implementation

## Umumiy ma'lumot

Lenza ERP tizimiga Mahsulot kirimi (Inbound / Приход) funksiyasi muvaffaqiyatli qo'shildi. Bu funksiya yetkazib beruvchilardan kelgan mahsulotlarni boshqarish uchun ishlatiladi.

## Asosiy xususiyatlar

### 1. **Ikki bosqichli jarayon**
- **Draft (Qoralama)**: Kirim dastlab qoralama holatda saqlanadi
- **Confirmed (Tasdiqlangan)**: Faqat tasdiqlangandan keyin ombor qoldig'iga qo'shiladi

### 2. **Ombor amaliyoti**
Avval ko'ramiz, keyin qo'shamiz — ishonchli ombor tamoyili:
- Kirim yaratilganda stock o'zgarmaydi
- Faqat CONFIRM tugmasi bosilganda stock yangilanadi
- Tasdiqlangan kirimni tahrirlash yoki o'chirish mumkin emas

### 3. **Yetkazib beruvchi nazorati**
- Har bir kirim bitta yetkazib beruvchiga (Brand) tegishli
- Faqat tanlangan brand mahsulotlari kirimga qo'shilishi mumkin
- Bir mahsulot bir kirimda takror qo'shilmaydi (duplicate check)

## Backend Implementation

### Models

#### **Inbound** model (`backend/catalog/models.py`)
```python
class Inbound(models.Model):
    brand = ForeignKey(Brand)  # Yetkazib beruvchi
    date = DateField            # Kirim sanasi
    status = CharField          # draft | confirmed
    comment = TextField         # Izoh (optional)
    created_by = ForeignKey(User)
    created_at = DateTimeField
    confirmed_at = DateTimeField (nullable)
```

#### **InboundItem** model
```python
class InboundItem(models.Model):
    inbound = ForeignKey(Inbound)
    product = ForeignKey(Product)
    quantity = IntegerField
    # unique_together: (inbound, product)
```

### API Endpoints

**Base URL**: `/api/inbounds/`

#### List/Create
- `GET /api/inbounds/` - Barcha kirimlar
- `POST /api/inbounds/` - Yangi kirim yaratish

#### Detail/Update/Delete
- `GET /api/inbounds/{id}/` - Kirim tafsilotlari
- `PATCH /api/inbounds/{id}/` - Draft kirimni tahrirlash
- `DELETE /api/inbounds/{id}/` - Draft kirimni o'chirish

#### Custom Actions
- `POST /api/inbounds/{id}/confirm/` - Kirimni tasdiqlash va stock yangilash
- `POST /api/inbounds/{id}/add_item/` - Mahsulot qo'shish
- `DELETE /api/inbounds/{id}/items/{item_id}/` - Mahsulot o'chirish

### Filtrlash

Query parametrlari:
- `status` - draft yoki confirmed
- `brand` - Brand ID
- `date_from` - Boshlanish sanasi
- `date_to` - Tugash sanasi
- `page`, `page_size` - Pagination

### Permissions

- **Create/Update/Delete**: `admin`, `warehouse`
- **View**: `admin`, `warehouse`
- **Confirm**: `admin`, `warehouse`

## Frontend Implementation

### Sahifalar

#### 1. **Inbounds List** (`/products/inbounds`)
- Barcha kirimlar ro'yxati
- Filtrlash (holat, yetkazib beruvchi)
- Har bir kirim uchun amallar:
  - Ko'rish
  - Tahrirlash (faqat draft)
  - Tasdiqlash (faqat draft)
  - O'chirish (faqat draft)

#### 2. **Inbound Create/Edit** (`/products/inbounds/create`, `/products/inbounds/:id/edit`)
- Yetkazib beruvchi tanlash
- Sana va izoh kiritish
- Mahsulotlar qo'shish:
  - Faqat tanlangan brand mahsulotlari
  - Miqdor kiritish
  - Duplicate check
- Real-time jadvaldagi mahsulotlar ko'rinishi
- Jami miqdor hisoblash

#### 3. **Products Page Integration**
Products sahifasiga "📦 Mahsulot kirimi" tugmasi qo'shildi:
- Faqat admin va warehouse rollari uchun ko'rinadi
- Kirimlar sahifasiga o'tkazadi

### API Integration (`frontend/src/api/inboundApi.ts`)

```typescript
// CRUD operations
fetchInbounds(params)
fetchInbound(id)
createInbound(payload)
updateInbound(id, payload)
deleteInbound(id)

// Special actions
confirmInbound(id)
addInboundItem(inboundId, item)
removeInboundItem(inboundId, itemId)
```

## Database Schema

```sql
-- Inbound table
CREATE TABLE catalog_inbound (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    brand_id BIGINT NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    comment TEXT,
    created_by_id BIGINT,
    created_at DATETIME NOT NULL,
    confirmed_at DATETIME,
    FOREIGN KEY (brand_id) REFERENCES catalog_brand(id),
    FOREIGN KEY (created_by_id) REFERENCES users_user(id),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_brand_date (brand_id, date)
);

-- InboundItem table
CREATE TABLE catalog_inbounditem (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    inbound_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (inbound_id) REFERENCES catalog_inbound(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES catalog_product(id),
    UNIQUE KEY unique_inbound_product (inbound_id, product_id),
    INDEX idx_inbound (inbound_id),
    INDEX idx_product (product_id)
);
```

## Business Logic

### Kirim yaratish
1. User brand va sanani tanlaydi
2. Tanlangan brand mahsulotlaridan keraklilarini qo'shadi
3. Har bir mahsulot uchun miqdor kiritadi
4. "Saqlash" tugmasi - draft holatda saqlanadi
5. **Stock hali o'zgarmaydi!**

### Kirimni tasdiqlash
1. Draft holatdagi kirimni ochadi
2. Ma'lumotlarni tekshiradi
3. "Tasdiqlash" tugmasini bosadi
4. Backend transaction ichida:
   ```python
   for item in inbound.items:
       product.stock_ok += item.quantity
       product.save()
   inbound.status = 'confirmed'
   inbound.confirmed_at = now()
   inbound.save()
   ```
5. Xatolik bo'lsa — hamma o'zgarishlar bekor qilinadi (rollback)

### Xavfsizlik
- Tasdiqlangan kirimni tahrirlash mumkin emas
- Tasdiqlangan kirimni o'chirish mumkin emas
- Transaction garantiyasi — yoki hammasi yoki hech narsa
- Duplicate mahsulot qo'shish oldini olish

## Deployment Guide

### 1. Backend Migration

```bash
# Development
cd backend
python manage.py makemigrations
python manage.py migrate

# Production (PostgreSQL)
python manage.py migrate
```

Migration fayli: `backend/catalog/migrations/0014_inbound_inbounditem.py`

### 2. Frontend Build

```bash
cd frontend
npm install
npm run build
```

### 3. Server Restart

```bash
# Backend
sudo systemctl restart lenza-backend

# Frontend (if using PM2)
pm2 restart lenza-frontend

# Or using docker
docker-compose restart
```

## Testing Checklist

### Backend
- [ ] Migration muvaffaqiyatli bajarildi
- [ ] Admin panelda Inbound va InboundItem ko'rinadi
- [ ] API endpoints ishlayapti (Postman/curl)
- [ ] Draft kirim yaratish ishlaydi
- [ ] Tasdiqlash va stock yangilash ishlaydi
- [ ] Permissions to'g'ri ishlaydi
- [ ] Transaction rollback ishlaydi (xato holatda)

### Frontend
- [ ] Kirimlar ro'yxati ochiladi
- [ ] Yangi kirim yaratish ishlaydi
- [ ] Mahsulot qo'shish/o'chirish ishlaydi
- [ ] Draft kirimni tahrirlash ishlaydi
- [ ] Tasdiqlash modali ishlaydi
- [ ] O'chirish ishlaydi
- [ ] Filtrlash ishlaydi
- [ ] Pagination ishlaydi
- [ ] Products sahifasida tugma ko'rinadi

### Integration
- [ ] Draft yaratish → stock o'zgarmaydi
- [ ] Tasdiqlash → stock to'g'ri yangilanadi
- [ ] Tasdiqlangan kirimni tahrirlash/o'chirish bloklangan
- [ ] Duplicate mahsulot qo'shishga yo'l qo'yilmaydi
- [ ] Boshqa brand mahsulotini qo'shishga yo'l qo'yilmaydi

## Error Handling

### Backend validations
- Kirimda kamida bitta mahsulot bo'lishi kerak
- Duplicate mahsulot qo'shib bo'lmaydi
- Mahsulot tanlangan brandga tegishli bo'lishi kerak
- Faqat draft kirimlarni tahrirlash mumkin
- Miqdor 0 dan katta bo'lishi kerak

### Frontend validations
- Yetkazib beruvchi tanlanmagan bo'lsa xato
- Mahsulotlar ro'yxati bo'sh bo'lsa xato
- Miqdor 0 yoki manfiy bo'lsa xato
- Tasdiqlash oldin dialog ko'rsatadi

## Future Enhancements (Kelajak uchun)

Arxitektura quyidagilarga tayyor:

1. **Kirimni bekor qilish (Reverse)**
   - Tasdiqlangan kirimni bekor qilish
   - Stock qaytarish

2. **Narx bilan kirim**
   - Har bir mahsulot uchun kirish narxi
   - Cost tracking

3. **Invoice upload**
   - Hujjat yuklash
   - Rasm/PDF attach qilish

4. **Audit log**
   - Kirimlar tarixi
   - O'zgarishlar jurnali

5. **Barcode scanning**
   - Mahsulot qo'shishda barcode scan

6. **Multiple warehouses**
   - Turli omborlar uchun kirim

## Xulosa

Mahsulot kirimi funksiyasi to'liq ishga tayyor:

✅ Backend models va migrations
✅ REST API endpoints
✅ Frontend UI (list, create, edit)
✅ Permissions va security
✅ Transaction safety
✅ Input validations
✅ Error handling
✅ Documentation

**Birinchi ishlatish:**
1. Migration bajaring: `python manage.py migrate`
2. Serverni qayta ishga tushiring
3. Admin/warehouse user bilan tizimga kiring
4. Products → "📦 Mahsulot kirimi"
5. Yangi kirim yarating va tasdiqlang

---

**Muallif**: GitHub Copilot  
**Sana**: 2024-12-18  
**Versiya**: 1.0
