"""Create test data for variant-based catalog"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.models import Brand, Category, Product, ProductModel, ProductVariant, ProductSKU

# 1. Create or get door category
door_category, created = Category.objects.get_or_create(
    name="Дверное полотно",
    defaults={"description": "Дверные полотна различных размеров"}
)
print(f"✓ Category: {door_category} ({'created' if created else 'exists'})")

# 2. Get brand
brand = Brand.objects.first()
if not brand:
    brand = Brand.objects.create(name="ДУБРАВА СИБИРЬ")
    print(f"✓ Created brand: {brand}")
else:
    print(f"✓ Using brand: {brand}")

# 3. Create test products (if they don't exist)
test_products = []
sizes_data = [
    ("400мм", 102.50, 0),
    ("600мм", 105.00, 3),
    ("700мм", 108.00, 12),
    ("800мм", 112.00, 5),
    ("900мм", 115.00, 0),
]

for size, price, stock in sizes_data:
    product, created = Product.objects.get_or_create(
        name=f"Бета Софт тач-серый ПГ {size}",
        category=door_category,
        defaults={
            "sku": f"DOOR-BETA-GRAY-PG-{size.replace('мм', '')}",
            "brand": brand,
            "sell_price_usd": price,
            "cost_usd": price * 0.7,
            "stock_ok": stock,
            "is_active": True,
        }
    )
    test_products.append(product)
    if created:
        print(f"  ✓ Created product: {product.name} (${price}, stock: {stock})")

# 4. Create ProductModel
product_model, created = ProductModel.objects.get_or_create(
    brand=brand,
    collection="Эмалит",
    model_name="Бета Софт",
    defaults={
        "is_active": True,
    }
)
print(f"\n✓ ProductModel: {product_model} ({'created' if created else 'exists'})")

# 5. Create ProductVariant
variant, created = ProductVariant.objects.get_or_create(
    product_model=product_model,
    color="тач-серый",
    door_type="ПГ",
    defaults={
        "is_active": True,
    }
)
print(f"✓ ProductVariant: {variant} ({'created' if created else 'exists'})")

# 6. Create ProductSKU entries
size_mapping = {
    "400мм": "400мм",
    "600мм": "600мм", 
    "700мм": "700мм",
    "800мм": "800мм",
    "900мм": "900мм",
}

for product in test_products:
    # Extract size from product name
    for size_key, size_value in size_mapping.items():
        if size_key in product.name:
            sku, created = ProductSKU.objects.get_or_create(
                variant=variant,
                size=size_value,
                defaults={"product": product}
            )
            if created:
                print(f"  ✓ Created SKU: {sku.size} → {product.name} (${product.sell_price_usd})")
            break

print(f"\n{'='*60}")
print(f"✅ Test data created successfully!")
print(f"{'='*60}")
print(f"\nVariant details:")
print(f"  - Brand: {variant.product_model.brand.name}")
print(f"  - Collection: {variant.product_model.collection}")
print(f"  - Model: {variant.product_model.model_name}")
print(f"  - Color: {variant.color}")
print(f"  - Door type: {variant.get_door_type_display()}")
try:
    print(f"  - Min price USD: ${variant.get_min_price_usd()}")
    print(f"  - Min price UZS: {variant.get_min_price_uzs():,.0f} so'm")
except Exception as e:
    print(f"  - Price calculation error: {e}")
print(f"\nSize/Stock breakdown:")
for size_info in variant.get_size_stock():
    print(f"  - {size_info['size']}: {size_info['stock']} pcs")

print(f"\n{'='*60}")
print(f"Next steps:")
print(f"  1. Visit admin: http://127.0.0.1:8000/admin/catalog/productvariant/")
print(f"  2. Test API: http://127.0.0.1:8000/api/catalog/variants/")
print(f"{'='*60}")
