# Product Price History Implementation

## 📋 Maqsad

Mahsulot narxi vaqt bo'yicha o'zgarishi va tarixiy narxlarni saqlab turish tizimi. Barcha avvalgi orderlar o'z sanasidagi narxda saqlanadi va hech qachon qayta hisoblanmaydi.

## 🏗️ Arxitektura

### Backend Models

#### ProductPrice Model
```python
# Location: backend/catalog/models.py

class ProductPrice(models.Model):
    product = ForeignKey(Product)
    price = DecimalField(max_digits=12, decimal_places=2)
    currency = CharField(choices=['USD', 'UZS'])
    valid_from = DateField()  # Bu sanadan boshlab amal qiladi
    created_at = DateTimeField(auto_now_add=True)
    created_by = ForeignKey(User, null=True)
    
    # Constraints:
    # - unique_together: (product, valid_from)
    # - Indexes: (product, -valid_from), (valid_from)
```

#### OrderItem Changes
```python
# Location: backend/orders/models.py

class OrderItem(models.Model):
    # ... existing fields ...
    price_at_time = DecimalField()  # Yangi! Order sanasidagi narx
    currency = CharField(default='USD')  # Yangi!
    price_usd = DecimalField()  # DEPRECATED, lekin backward compatibility uchun
```

### Business Logic

#### 1. Narx Olish
```python
# Static method in ProductPrice model
ProductPrice.get_price_for_date(product, date, currency='USD')
# Returns: Decimal price
# Raises: ValueError if no price found

# Algorithm:
# SELECT price FROM product_prices
# WHERE product_id = X AND valid_from <= date
# ORDER BY valid_from DESC
# LIMIT 1
```

#### 2. Order Yaratish
```python
# Signal: pre_save on OrderItem
# Location: backend/orders/signals.py

@receiver(pre_save, sender=OrderItem)
def set_price_from_history(sender, instance, **kwargs):
    if instance.price_at_time is None:
        date = instance.order.order_date.date()
        instance.price_at_time = ProductPrice.get_price_for_date(
            product=instance.product,
            date=date,
            currency=instance.currency
        )
```

## 🔌 API Endpoints

### ProductPrice ViewSet
```
Base URL: /api/catalog/product-prices/

Endpoints:
├── GET    /                           - List all prices
├── GET    /?product=<id>              - Filter by product
├── POST   /                           - Create new price
├── GET    /<id>/                      - Get specific price
├── DELETE /<id>/                      - Delete price (admin only)
├── GET    /for-product/<id>/          - Full history for product
├── GET    /current/<id>/?currency=USD - Current price
└── POST   /get-price-for-date/        - Price for specific date
```

### Permissions
- **List/View**: All authenticated users
- **Create/Update/Delete**: Admin or Accountant only

### Example Requests

#### Create Price
```bash
POST /api/catalog/product-prices/
{
  "product": 123,
  "price": 150.00,
  "currency": "USD",
  "valid_from": "2024-01-15"
}
```

#### Get Price History
```bash
GET /api/catalog/product-prices/?product=123
# Response:
{
  "results": [
    {
      "id": 1,
      "product": 123,
      "price": "150.00",
      "currency": "USD",
      "valid_from": "2024-01-15",
      "created_at": "2024-01-10T10:00:00Z",
      "created_by_name": "Admin User"
    }
  ]
}
```

## 🎨 Frontend Components

### ProductPriceHistory Component
```
Location: frontend/src/components/products/ProductPriceHistory.tsx

Features:
├── Price history table
├── Add new price form (admin/accountant only)
├── Date validation
├── Currency selection (USD/UZS)
└── Info box with business rules
```

### Integration
```tsx
// In Products.tsx
import ProductPriceHistory from '../components/products/ProductPriceHistory';

// Add state
const [priceHistoryProduct, setPriceHistoryProduct] = useState<Product | null>(null);

// Add button in ProductActions
<ProductActions
  canViewPrices={true}
  onPriceHistory={() => setPriceHistoryProduct(product)}
/>

// Render modal
{priceHistoryProduct && (
  <ProductPriceHistory
    productId={priceHistoryProduct.id}
    productSku={priceHistoryProduct.sku}
    productName={priceHistoryProduct.name}
    onClose={() => setPriceHistoryProduct(null)}
  />
)}
```

## 🗄️ Database Migrations

### Created Migrations

1. **0015_productprice_...**
   - Creates ProductPrice model
   - Adds price_at_time, currency to OrderItem
   - Creates indexes

2. **0016_migrate_existing_prices**
   - Data migration
   - Copies sell_price_usd → ProductPrice for all products
   - Uses product.created_at as valid_from

### Running Migrations

```bash
cd backend

# Create migrations (already done)
python manage.py makemigrations catalog orders

# Run migrations
python manage.py migrate catalog
python manage.py migrate orders

# Verify
python manage.py showmigrations catalog orders
```

## 📝 Usage Examples

### 1. Mahsulot Narxini O'zgartirish

**Scenario**: iPhone 14 narxi 1000 USD dan 1200 USD ga o'tdi.

```python
# Backend (automatic via UI)
ProductPrice.objects.create(
    product=iphone14,
    price=Decimal('1200.00'),
    currency='USD',
    valid_from=date(2024, 12, 20),  # Bugun
    created_by=request.user
)

# Result:
# - 20-dekabr va undan keyingi orderlar: 1200 USD
# - 20-dekabrdan oldingi orderlar: 1000 USD (o'zgarmaydi!)
```

### 2. O'tmishga Narx Qo'shish

**Scenario**: Tizimga kiritilmagan 1-noyabr narxini qo'shish.

```python
ProductPrice.objects.create(
    product=product,
    price=Decimal('950.00'),
    currency='USD',
    valid_from=date(2024, 11, 1),
    created_by=request.user
)

# Result:
# - 1-noyabrdan 19-dekabrgacha: 950 USD
# - 20-dekabrdan keyin: 1200 USD
# - Eski orderlar (oktabr, sentyabr): o'zgarmaydi
```

### 3. Order Yaratish

```python
# Order date: 2024-12-15
order = Order.objects.create(order_date=date(2024, 12, 15))

# Add item
item = OrderItem.objects.create(
    order=order,
    product=iphone14,
    qty=2,
    currency='USD',
    # price_at_time automatically set by signal!
)

# Signal avtomatik ravishda:
# 1. Order sanasini oladi: 2024-12-15
# 2. ProductPrice.get_price_for_date(iphone14, '2024-12-15', 'USD')
# 3. 950 USD topadi (chunki 1-noyabr narxi amal qiladi)
# 4. item.price_at_time = 950.00
```

## ⚠️ Muhim Qoidalar (Golden Rules)

### 1. Immutability
```
❌ NEVER: Update old price records
✅ ALWAYS: Create new price record
```

### 2. Historical Integrity
```
❌ NEVER: Recalculate old orders when price changes
✅ ALWAYS: Use price_at_time from order item
```

### 3. Date-Based Truth
```
❌ NEVER: Use product.sell_price_usd for orders
✅ ALWAYS: Use ProductPrice.get_price_for_date()
```

### 4. No Overlapping Dates
```python
# ❌ INVALID:
ProductPrice(product=X, valid_from='2024-01-01')
ProductPrice(product=X, valid_from='2024-01-01')  # Duplicate!

# ✅ VALID:
ProductPrice(product=X, valid_from='2024-01-01')
ProductPrice(product=X, valid_from='2024-01-15')  # Different dates
```

## 🧪 Testing Guide

### 1. Test Narx Tarixi Ko'rish
```
1. Login as any user
2. Go to Products page
3. Click "Prices" button on any product
4. Should see price history modal
5. Should see all historical prices
```

### 2. Test Narx Qo'shish (Admin/Accountant)
```
1. Login as admin or accountant
2. Open price history for a product
3. Click "Add New Price"
4. Fill form:
   - Price: 1500
   - Currency: USD
   - Valid From: tomorrow's date
5. Click Save
6. Should see new price in history
7. Try adding same date again → should get error
```

### 3. Test Order Narxi
```
1. Create a new order today
2. Add product with price history
3. Check OrderItem.price_at_time
4. Should match current effective price
5. Change product price for tomorrow
6. Today's order should still have old price
```

### 4. Test Permissions
```
1. Login as manager/dealer
2. Open price history → should only view
3. Should NOT see "Add Price" button
4. Login as admin → should see button
```

## 🔧 Troubleshooting

### Error: "No price found for product X on date Y"

**Причина**: Product has no price history for that date.

**Solution**:
```python
# Add initial price
ProductPrice.objects.create(
    product=product,
    price=product.sell_price_usd,
    valid_from=product.created_at.date(),
    currency='USD'
)
```

### Error: "Price already exists for this date"

**Причина**: Trying to add duplicate valid_from date.

**Solution**: Choose different date or delete existing price first.

### Order Item Has Zero Price

**Причина**: Signal didn't run or no price history exists.

**Solution**:
```python
# Manually set price
item.set_price_from_history()
item.save()
```

## 📊 Database Schema

```sql
-- ProductPrice table
CREATE TABLE catalog_productprice (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES catalog_product(id),
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    valid_from DATE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by_id INTEGER REFERENCES users_customuser(id),
    UNIQUE(product_id, valid_from)
);

CREATE INDEX idx_product_valid ON catalog_productprice (product_id, valid_from DESC);
CREATE INDEX idx_valid_from ON catalog_productprice (valid_from);

-- OrderItem updates
ALTER TABLE orders_orderitem 
ADD COLUMN price_at_time DECIMAL(12,2),
ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
```

## 📈 Performance Considerations

1. **Indexes**: 
   - (product_id, -valid_from) for fast lookups
   - valid_from for date range queries

2. **Query Optimization**:
   ```python
   # Good: Single query with ordering
   ProductPrice.objects.filter(
       product=product,
       valid_from__lte=date
   ).order_by('-valid_from').first()
   
   # Bad: Multiple queries
   prices = ProductPrice.objects.filter(product=product)
   for price in prices:
       if price.valid_from <= date:
           break
   ```

3. **Bulk Operations**:
   ```python
   # Good: Bulk create for migration
   ProductPrice.objects.bulk_create(records, ignore_conflicts=True)
   
   # Bad: One-by-one saves
   for record in records:
       record.save()
   ```

## 🎯 Future Enhancements

1. **Scheduled Price Changes**
   - Set future prices in advance
   - Automatic activation on valid_from date

2. **Price Change Notifications**
   - Alert dealers when prices change
   - Email/Telegram notifications

3. **Price Analytics**
   - Price trends over time
   - Average selling price
   - Price volatility metrics

4. **Multi-Currency Support**
   - Automatic currency conversion
   - Exchange rate history

5. **Bulk Price Updates**
   - Upload Excel with new prices
   - Apply price changes to multiple products

## 📞 Support

Savol yoki muammo bo'lsa:
1. Check error logs: `backend/logs/`
2. Run migrations: `python manage.py migrate`
3. Check ProductPrice records: `python manage.py shell`
   ```python
   from catalog.models import ProductPrice
   ProductPrice.objects.all().count()
   ```

---

**Status**: ✅ Implemented and Ready for Testing
**Version**: 1.0
**Date**: December 20, 2024
