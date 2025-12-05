"""
Check and fix variant prices for kit system.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from decimal import Decimal
from catalog.models import ProductVariant, ProductSKU, Product

print("="*70)
print("CHECKING VARIANT PRICES")
print("="*70)

v = ProductVariant.objects.first()
print(f"\n✓ Variant: {v}")
print(f"  Brand: {v.brand_name}")
print(f"  Model: {v.model_name}")
print(f"  Color: {v.color}")

print(f"\n{'='*70}")
print("SKUs:")
print("="*70)

for sku in v.skus.all()[:3]:
    print(f"  SKU {sku.size}:")
    print(f"    Product: {sku.product.name}")
    print(f"    Price: {sku.product.sell_price_usd}")
    
    # Narx yo'q bo'lsa, qo'shamiz
    if not sku.product.sell_price_usd:
        sku.product.sell_price_usd = Decimal('102.50')
        sku.product.save()
        print(f"    → Updated to $102.50")

print(f"\n{'='*70}")
print("KIT COMPONENTS:")
print("="*70)

for kit_item in v.kit_components.all():
    print(f"  {kit_item.component.name}:")
    print(f"    Price: ${kit_item.component.sell_price_usd}")
    print(f"    Quantity: {kit_item.quantity}")
    print(f"    Total: ${kit_item.total_price_usd}")

print(f"\n{'='*70}")
print("CALCULATED PRICES:")
print("="*70)

print(f"  Polotno price (min_price_usd):        ${v.min_price_usd}")
print(f"  Kit price (kit_total_price_usd):    + ${v.kit_total_price_usd}")
print(f"  {'─'*50}")
print(f"  Full set price (full_set_price_usd): = ${v.full_set_price_usd}")
print(f"\n  Max full sets by stock: {v.max_full_sets_by_stock} komplekt")

print(f"\n{'='*70}")
print("✅ PRICES CHECK COMPLETE")
print("="*70)
