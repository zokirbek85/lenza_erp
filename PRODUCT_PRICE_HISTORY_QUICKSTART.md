# Product Price History - Quick Start

## 🚀 Deploy Qilish

### 1. Backend Migration
```bash
cd backend

# Migrationlarni tekshirish
python manage.py showmigrations catalog orders

# Migrationlarni qo'llash
python manage.py migrate catalog
python manage.py migrate orders

# Data migrationni tekshirish (mavjud narxlar ProductPrice ga ko'chiriladi)
python manage.py shell
>>> from catalog.models import ProductPrice
>>> ProductPrice.objects.count()  # Should show number of products
>>> exit()
```

### 2. Backend Restart
```bash
# Development
python manage.py runserver

# Production (Docker)
docker-compose restart backend
# yoki
sudo systemctl restart gunicorn
```

### 3. Frontend Build
```bash
cd frontend

# Dependencies (if new packages added)
npm install

# Build
npm run build

# Development
npm run dev
```

## 📋 Qisqa Test

### Backend Test
```bash
# Django shell
python manage.py shell

# Test price query
from catalog.models import Product, ProductPrice
from datetime import date

product = Product.objects.first()
price = ProductPrice.get_current_price(product, currency='USD')
print(f"Current price: {price}")

# Test creating price
ProductPrice.objects.create(
    product=product,
    price=1000.00,
    currency='USD',
    valid_from=date.today(),
)
```

### API Test
```bash
# Get product prices
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/catalog/product-prices/?product=1

# Create price
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product": 1,
    "price": 1500.00,
    "currency": "USD",
    "valid_from": "2024-12-20"
  }' \
  http://localhost:8000/api/catalog/product-prices/
```

### Frontend Test
1. Login as admin/accountant
2. Go to Products page
3. Click "Prices" button on any product
4. Click "Add New Price"
5. Fill form and save
6. Verify price appears in history

## ⚡ Muhim Commands

### Check Migrations
```bash
# Created migrations
python manage.py showmigrations catalog
# [X] 0015_productprice_...
# [X] 0016_migrate_existing_prices

python manage.py showmigrations orders
# [X] 0013_orderitem_currency_...
```

### Rollback (agar kerak bo'lsa)
```bash
# Rollback catalog migrations
python manage.py migrate catalog 0014

# Rollback orders migrations
python manage.py migrate orders 0012
```

### Check Data
```bash
python manage.py shell

# Count prices
from catalog.models import ProductPrice
print(f"Total prices: {ProductPrice.objects.count()}")

# Check specific product
from catalog.models import Product
product = Product.objects.get(sku='YOUR_SKU')
prices = product.price_history.all()
for p in prices:
    print(f"{p.valid_from}: {p.price} {p.currency}")
```

## 🐛 Common Issues

### Issue: Migration fails with "relation already exists"
```bash
# Solution: Fake the migration
python manage.py migrate catalog 0015 --fake
python manage.py migrate catalog 0016
```

### Issue: No prices in ProductPrice table
```bash
# Run data migration again
python manage.py shell
from catalog.models import Product, ProductPrice
from django.utils import timezone

for product in Product.objects.filter(sell_price_usd__gt=0):
    ProductPrice.objects.get_or_create(
        product=product,
        valid_from=product.created_at.date() if product.created_at else timezone.now().date(),
        defaults={
            'price': product.sell_price_usd,
            'currency': 'USD',
            'created_by': None,
        }
    )
```

### Issue: OrderItem price_at_time is None
```bash
# Signal should auto-set, but if needed:
python manage.py shell
from orders.models import OrderItem

for item in OrderItem.objects.filter(price_at_time__isnull=True):
    item.set_price_from_history()
    item.save()
```

## 📞 Need Help?

Check full documentation: `PRODUCT_PRICE_HISTORY_IMPLEMENTATION.md`
