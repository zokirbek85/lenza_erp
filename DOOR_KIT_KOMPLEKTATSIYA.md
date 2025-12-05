# Door Kit (Komplektatsiya) Implementation Guide

## Overview

Eshik katalogi uchun **komplektatsiya** (to'liq komplekt) tizimi - bu polotno (eshik qanoti) va pogonaj (nalichnik, korobka, dobor) narxlarini alohida ko'rsatish va to'liq komplekt narxini avtomatik hisoblash.

### Three-Tier Pricing

```
Полотно (Door Panel):     $102.50
+ Комплект (Kit):        +  $40.00
───────────────────────────────────
= Итого (Total):         = $142.50
```

---

## Database Architecture

### DoorKitComponent Model

```python
class DoorKitComponent(models.Model):
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='kit_components'
    )
    component = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        help_text="Pogonaj mahsuloti (nalichnik, korobka, dobor)"
    )
    quantity = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Kerakli miqdor (masalan: 2.50)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_price_usd(self):
        """Komponent narxi × miqdor"""
        component_price = self.component.sell_price_usd or Decimal('0.00')
        quantity = Decimal(str(self.quantity))
        return component_price * quantity
```

**Misol ma'lumot:**
```python
DoorKitComponent(
    variant=<Бета Софт тач-серый ПГ>,
    component=<Наличник 70мм Лофт белый>,
    quantity=Decimal("2.50")
)
```

---

## ProductVariant Extensions

### Kit Pricing Properties

```python
class ProductVariant(models.Model):
    # ... existing fields ...

    @property
    def min_price_usd(self):
        """Polotno minimal narxi (SKU'lar ichida eng arzon)"""
        return self.get_min_price_usd()

    @property
    def kit_total_price_usd(self):
        """Komplekt (pogonaj) umumiy narxi"""
        total = Decimal('0.00')
        for kit_item in self.kit_components.select_related('component'):
            component_price = kit_item.component.sell_price_usd or Decimal('0.00')
            quantity = Decimal(str(kit_item.quantity))
            total += component_price * quantity
        return total if total > 0 else None

    @property
    def full_set_price_usd(self):
        """To'liq komplekt narxi = polotno + komplekt"""
        polotno_price = self.min_price_usd or Decimal('0.00')
        kit_price = self.kit_total_price_usd or Decimal('0.00')
        total = polotno_price + kit_price
        return total if total > 0 else None

    @property
    def max_full_sets_by_stock(self):
        """Skladda nechta to'liq komplekt yig'ish mumkin"""
        ratios = []
        for kit_item in self.kit_components.select_related('component'):
            stock = kit_item.component.stock_ok or Decimal('0.00')
            if kit_item.quantity > 0:
                ratios.append(int(stock // kit_item.quantity))
        return min(ratios) if ratios else None
```

**Hisoblash misoli:**

```python
variant = ProductVariant.objects.get(id=512)

# Polotno narxi (SKU'lar ichida minimal)
# SKU 800: $102.50
# SKU 900: $115.00
print(variant.min_price_usd)  # Output: 102.50

# Komplekt narxi (pogonaj komponentlar)
# Наличник: 2.50 × $3.50 = $8.75
# Коробка: 2.50 × $4.50 = $11.25
# Добор: 1.00 × $5.00 = $5.00
# ────────────────────────────────
# Total kit:              = $25.00
print(variant.kit_total_price_usd)  # Output: 25.00

# To'liq komplekt narxi
print(variant.full_set_price_usd)  # Output: 127.50

# Skladda yig'ish mumkin
# Наличник: 150 / 2.5 = 60 komplekt
# Коробка: 120 / 2.5 = 48 komplekt ← minimum
# Добор: 80 / 1.0 = 80 komplekt
print(variant.max_full_sets_by_stock)  # Output: 48
```

---

## API Serializers

### DoorKitComponentSerializer

```python
class DoorKitComponentSerializer(serializers.ModelSerializer):
    component_sku = serializers.CharField(source='component.sku', read_only=True)
    component_name = serializers.CharField(source='component.name', read_only=True)
    component_price_usd = serializers.DecimalField(
        source='component.sell_price_usd',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_price_usd = serializers.SerializerMethodField()

    class Meta:
        model = DoorKitComponent
        fields = [
            'id', 'component', 'component_sku', 'component_name',
            'component_price_usd', 'quantity', 'total_price_usd'
        ]

    def get_total_price_usd(self, obj):
        return obj.total_price_usd
```

### VariantCatalogSerializer Enhancement

```python
class VariantCatalogSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    
    # NEW: Three-tier pricing
    polotno_price_usd = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    kit_price_usd = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    full_set_price_usd = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    
    # NEW: Kit details array
    kit_details = DoorKitComponentSerializer(
        source='kit_components',
        many=True,
        read_only=True
    )
    
    # NEW: Stock calculation
    max_full_sets_by_stock = serializers.IntegerField(read_only=True)
    
    # KEPT: Backward compatibility
    price_usd = serializers.SerializerMethodField()
    
    def get_price_usd(self, obj):
        """Backward compatibility: returns full_set if available, else polotno"""
        return obj.full_set_price_usd or obj.min_price_usd

    def get_polotno_price_usd(self, obj):
        return obj.min_price_usd

    def get_kit_price_usd(self, obj):
        return obj.kit_total_price_usd

    def get_full_set_price_usd(self, obj):
        return obj.full_set_price_usd

    def get_max_full_sets_by_stock(self, obj):
        return obj.max_full_sets_by_stock
```

### API Response Example

**Request:** `GET /api/catalog/variants/512/`

**Response:**
```json
{
  "id": 512,
  "model": "Бета Софт",
  "color": "тач-серый",
  "door_type": "ПГ",
  "brand": "ДУБРАВА СИБИРЬ",
  
  "polotno_price_usd": 102.50,
  "kit_price_usd": 25.00,
  "full_set_price_usd": 127.50,
  
  "kit_details": [
    {
      "id": 1,
      "component": 345,
      "component_sku": "NAL-70-LOFT-WHITE",
      "component_name": "Наличник 70мм Лофт белый",
      "component_price_usd": 3.50,
      "quantity": 2.50,
      "total_price_usd": 8.75
    },
    {
      "id": 2,
      "component": 346,
      "component_sku": "KOR-100-LOFT-WHITE",
      "component_name": "Коробка 100мм Лофт белый",
      "component_price_usd": 4.50,
      "quantity": 2.50,
      "total_price_usd": 11.25
    },
    {
      "id": 3,
      "component": 347,
      "component_sku": "DOB-100-LOFT-WHITE",
      "component_name": "Добор 100мм Лофт белый",
      "component_price_usd": 5.00,
      "quantity": 1.00,
      "total_price_usd": 5.00
    }
  ],
  
  "max_full_sets_by_stock": 48,
  
  "price_usd": 127.50,
  "images": [...],
  "available_sizes": [...]
}
```

---

## Admin Panel Configuration

### DoorKitComponentInline

**Smart pogonaj filtering** - faqat pogonaj mahsulotlarini ko'rsatadi:

```python
class DoorKitComponentInline(admin.TabularInline):
    model = DoorKitComponent
    extra = 1
    autocomplete_fields = ['component']
    fields = ['component', 'quantity', 'component_price_display', 'total_price_display']
    readonly_fields = ['component_price_display', 'total_price_display']

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "component":
            # Pogonaj keywords
            pogonaj_keywords = ['наличник', 'короб', 'добор', 'погонаж', 'притвор']
            
            # Q filters
            q_filters = Q()
            for keyword in pogonaj_keywords:
                q_filters |= Q(category__name__icontains=keyword)
                q_filters |= Q(name__icontains=keyword)
            
            # Filtered queryset
            kwargs["queryset"] = Product.objects.filter(
                q_filters,
                is_active=True
            ).select_related('brand', 'category').order_by('category__name', 'name')
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    @admin.display(description='Component Price')
    def component_price_display(self, obj):
        if obj.component and obj.component.sell_price_usd:
            return f"${obj.component.sell_price_usd:.2f}"
        return "-"

    @admin.display(description='Total')
    def total_price_display(self, obj):
        if obj.id:
            return f"${obj.total_price_usd:.2f}"
        return "-"
```

### ProductVariantAdmin Enhancement

**Three-tier price columns:**

```python
@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'model_name', 'color', 'door_type', 'brand_name',
        'polotno_price_display',      # NEW
        'kit_price_display',           # NEW
        'full_set_price_display',      # NEW
        'kit_count',                   # NEW
        'available_sizes_display',
        'images_display',
        'created_at'
    ]
    
    inlines = [DoorKitComponentInline, ProductSKUInline]
    
    @admin.display(description='Полотно', ordering='model__name')
    def polotno_price_display(self, obj):
        price = obj.min_price_usd
        if price:
            return f"${price:.2f}"
        return "-"
    
    @admin.display(description='+ Комплект')
    def kit_price_display(self, obj):
        price = obj.kit_total_price_usd
        if price:
            return f"+ ${price:.2f}"
        return "-"
    
    @admin.display(description='= Итого')
    def full_set_price_display(self, obj):
        price = obj.full_set_price_usd
        if price:
            return f"= ${price:.2f}"
        return "-"
    
    @admin.display(description='Kit Components')
    def kit_count(self, obj):
        count = obj.kit_components.count()
        return f"{count} items" if count > 0 else "-"
```

### DoorKitComponentAdmin

**Standalone management:**

```python
@admin.register(DoorKitComponent)
class DoorKitComponentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'variant', 'component_name', 'component_category',
        'quantity', 'component_price', 'total_price', 'created_at'
    ]
    list_filter = ['variant__door_type', 'variant__brand', 'component__category']
    search_fields = [
        'variant__model__name', 'variant__color',
        'component__name', 'component__sku'
    ]
    autocomplete_fields = ['variant', 'component']
    
    @admin.display(description='Component')
    def component_name(self, obj):
        return obj.component.name
    
    @admin.display(description='Category')
    def component_category(self, obj):
        return obj.component.category.name if obj.component.category else "-"
    
    @admin.display(description='Price')
    def component_price(self, obj):
        return f"${obj.component.sell_price_usd:.2f}"
    
    @admin.display(description='Total')
    def total_price(self, obj):
        return f"${obj.total_price_usd:.2f}"
```

---

## Usage Workflow

### 1. Admin Panel: Adding Kit Components

**Step-by-step:**

1. **Open variant in admin:**
   ```
   http://127.0.0.1:8000/admin/catalog/productvariant/512/change/
   ```

2. **Scroll to "Door Kit Components" inline section**

3. **Add component:**
   - Click "Add another Door Kit Component"
   - Select **Component** from filtered pogonaj list:
     - Наличник 70мм Лофт белый
     - Коробка 100мм Лофт белый
     - Добор 100мм Лофт белый
   - Enter **Quantity**: 2.50
   - See **Component Price**: $3.50 (readonly)
   - See **Total**: $8.75 (readonly, calculated)

4. **Save variant**

5. **Verify prices in list view:**
   ```
   | Полотно     | + Комплект  | = Итого     | Kit Components |
   |-------------|-------------|-------------|----------------|
   | $102.50     | + $25.00    | = $127.50   | 3 items        |
   ```

### 2. API: Fetching Variant with Kit Details

**Request:**
```bash
curl http://127.0.0.1:8000/api/catalog/variants/512/
```

**Response highlights:**
```json
{
  "polotno_price_usd": 102.50,
  "kit_price_usd": 25.00,
  "full_set_price_usd": 127.50,
  "kit_details": [
    {"component_name": "Наличник 70мм", "quantity": 2.50, "total_price_usd": 8.75},
    {"component_name": "Коробка 100мм", "quantity": 2.50, "total_price_usd": 11.25},
    {"component_name": "Добор 100мм", "quantity": 1.00, "total_price_usd": 5.00}
  ],
  "max_full_sets_by_stock": 48
}
```

### 3. Frontend: Displaying Three-Tier Pricing

**Example Component (React/Vue):**

```jsx
function DoorPriceDisplay({ variant }) {
  if (!variant.kit_details || variant.kit_details.length === 0) {
    // No kit components - show simple price
    return <div className="text-2xl font-bold">${variant.polotno_price_usd}</div>;
  }

  // Has kit components - show breakdown
  return (
    <div className="space-y-2">
      {/* Polotno price */}
      <div className="flex justify-between">
        <span className="text-gray-600">Полотно:</span>
        <span className="font-semibold">${variant.polotno_price_usd}</span>
      </div>

      {/* Kit components breakdown */}
      <div className="border-l-2 border-gray-300 pl-4 space-y-1">
        {variant.kit_details.map((item) => (
          <div key={item.id} className="flex justify-between text-sm text-gray-500">
            <span>{item.component_name} × {item.quantity}</span>
            <span>${item.total_price_usd}</span>
          </div>
        ))}
      </div>

      {/* Kit total */}
      <div className="flex justify-between text-green-600">
        <span>+ Комплект:</span>
        <span className="font-semibold">${variant.kit_price_usd}</span>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-gray-300"></div>

      {/* Full set total */}
      <div className="flex justify-between text-xl font-bold">
        <span>= Итого:</span>
        <span className="text-blue-600">${variant.full_set_price_usd}</span>
      </div>

      {/* Stock availability */}
      {variant.max_full_sets_by_stock !== null && (
        <div className="text-sm text-gray-500 mt-2">
          В наличии: {variant.max_full_sets_by_stock} комплектов
        </div>
      )}
    </div>
  );
}
```

**Output:**
```
Полотно:                           $102.50
├─ Наличник 70мм Лофт белый × 2.5    $8.75
├─ Коробка 100мм Лофт белый × 2.5   $11.25
└─ Добор 100мм Лофт белый × 1.0      $5.00
+ Комплект:                         $25.00
─────────────────────────────────────────
= Итого:                          $127.50

В наличии: 48 комплектов
```

---

## Testing Checklist

### Backend Tests

- [ ] **Migration applied successfully**
  ```bash
  cd backend
  python manage.py migrate catalog
  # Expected: "Applying catalog.0010_add_door_kit_component... OK"
  ```

- [ ] **Test data created**
  ```bash
  python create_door_kit_test_data.py
  # Expected: 1 variant + 3 pogonaj products + 3 kit components
  ```

- [ ] **Admin panel pogonaj filtering**
  - Open variant in admin
  - Click "Add another Door Kit Component"
  - Component dropdown should show ONLY pogonaj products
  - Should NOT show door polotno products

- [ ] **Admin price displays**
  - List view shows three columns: "Полотно", "+ Комплект", "= Итого"
  - Values formatted correctly: "$102.50", "+ $25.00", "= $127.50"
  - "Kit Components" column shows count: "3 items"

- [ ] **API response format**
  ```bash
  curl http://127.0.0.1:8000/api/catalog/variants/512/ | jq .
  # Expected fields: polotno_price_usd, kit_price_usd, full_set_price_usd, kit_details[], max_full_sets_by_stock
  ```

- [ ] **Price calculations**
  ```python
  from catalog.models import ProductVariant
  v = ProductVariant.objects.first()
  assert v.full_set_price_usd == v.min_price_usd + v.kit_total_price_usd
  ```

- [ ] **Stock calculation**
  ```python
  # Should return minimum ratio across all components
  max_sets = v.max_full_sets_by_stock
  for kit_item in v.kit_components.all():
      ratio = int(kit_item.component.stock_ok // kit_item.quantity)
      assert max_sets <= ratio
  ```

### Frontend Tests

- [ ] **Display polotno-only variants** (no kit components)
  - Should show single price
  - No kit breakdown

- [ ] **Display full-set variants** (with kit components)
  - Should show three-tier pricing
  - Kit components breakdown visible
  - Stock availability shown

- [ ] **Responsive design**
  - Mobile: prices stack vertically
  - Desktop: prices in columns

- [ ] **Price updates**
  - When admin changes component price → API reflects immediately
  - When admin changes quantity → totals recalculated

---

## Migration Files

### 0010_add_door_kit_component.py

```python
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('catalog', '0009_drop_old_catalog_create_variant'),
    ]

    operations = [
        migrations.CreateModel(
            name='DoorKitComponent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=2, help_text='Kerakli miqdor (masalan: 2.50)', max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('component', models.ForeignKey(help_text='Pogonaj mahsuloti (nalichnik, korobka, dobor)', on_delete=django.db.models.deletion.PROTECT, to='catalog.product')),
                ('variant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='kit_components', to='catalog.productvariant')),
            ],
            options={
                'verbose_name': 'Door Kit Component',
                'verbose_name_plural': 'Door Kit Components',
                'ordering': ['variant', 'component'],
            },
        ),
        migrations.AddIndex(
            model_name='doorkitcomponent',
            index=models.Index(fields=['variant'], name='catalog_doo_variant_idx'),
        ),
    ]
```

---

## Deployment

### Production Deployment Steps

```bash
# 1. Pull latest code
cd /opt/lenza_erp
git pull origin main

# 2. Run update script (includes migration)
bash update.sh

# 3. Verify migration applied
docker exec -it lenza_backend python manage.py showmigrations catalog
# Expected: [X] 0010_add_door_kit_component

# 4. Create test data (optional)
docker exec -it lenza_backend python create_door_kit_test_data.py

# 5. Test API endpoint
curl https://erp.lenza.uz/api/catalog/variants/512/ | jq '.kit_details'

# 6. Test admin panel
# Visit: https://erp.lenza.uz/admin/catalog/productvariant/512/change/
# Add kit components and verify prices
```

---

## Troubleshooting

### Issue: Pogonaj filtering not working in admin

**Symptoms:** Component dropdown shows all products, not just pogonaj

**Solution:**
```python
# Check keywords in DoorKitComponentInline.formfield_for_foreignkey
pogonaj_keywords = ['наличник', 'короб', 'добор', 'погонаж', 'притвор']

# Verify products have matching category/name
Product.objects.filter(
    Q(category__name__icontains='погонаж') | Q(name__icontains='наличник')
).count()
```

### Issue: Prices showing as None in API

**Symptoms:** `polotno_price_usd: null`, `kit_price_usd: null`

**Solution:**
```python
# Check variant has SKUs
variant.skus.count()  # Should be > 0

# Check SKUs have prices
variant.skus.values_list('price_usd', flat=True)  # Should have values

# Check kit components exist
variant.kit_components.count()  # Should be > 0

# Check components have prices
for kit_item in variant.kit_components.all():
    print(kit_item.component.sell_price_usd)  # Should not be None
```

### Issue: Stock calculation returns None

**Symptoms:** `max_full_sets_by_stock: null`

**Solution:**
```python
# Check kit components exist
if variant.kit_components.count() == 0:
    # No kit = no calculation
    pass

# Check component stock
for kit_item in variant.kit_components.all():
    print(f"{kit_item.component.name}: {kit_item.component.stock_ok}")
    # Should have numeric stock values
```

---

## Summary

**What we built:**

1. ✅ **DoorKitComponent model** - links ProductVariant to pogonaj Product with quantity
2. ✅ **Three-tier pricing** - polotno, kit, full_set calculated dynamically
3. ✅ **Smart pogonaj filtering** - admin shows only relevant components
4. ✅ **Kit details API** - component breakdown with prices
5. ✅ **Stock calculation** - how many complete sets can be assembled
6. ✅ **Admin UI enhancements** - inline editing, price columns

**Key benefits:**

- ⚡ **Flexible configuration** - manually add kit components per variant
- 💰 **Transparent pricing** - customers see polotno + kit breakdown
- 📦 **Stock awareness** - system calculates available complete sets
- 🎯 **Smart filtering** - admin only shows pogonaj products
- 🔄 **Backward compatible** - `price_usd` still works for old clients

**Next steps:**

1. Test admin panel kit configuration
2. Test API response format
3. Create sample kit data for all door variants
4. Update frontend to display three-tier pricing
5. Deploy to production

---

**Git Commit:**
```bash
git add .
git commit -m "feat(catalog): add door kit komplektatsiya system

Complete three-tier pricing: polotno + kit = full set

Backend:
- New model: DoorKitComponent (variant → component × quantity)
- Extended ProductVariant: 4 kit properties (min_price, kit_total, full_set, max_sets_by_stock)
- DoorKitComponentSerializer: component details with total price
- Enhanced VariantCatalogSerializer: polotno/kit/full_set prices, kit_details array

Admin:
- DoorKitComponentInline: inline editing with smart pogonaj filtering
- Enhanced ProductVariantAdmin: 3 price columns (полотно, + комплект, = итого)
- DoorKitComponentAdmin: standalone management of all kit relationships

API Response:
{
  'polotno_price_usd': 102.50,
  'kit_price_usd': 25.00,
  'full_set_price_usd': 127.50,
  'kit_details': [...],
  'max_full_sets_by_stock': 48
}

Migration: 0010_add_door_kit_component
"
git push origin main
```
