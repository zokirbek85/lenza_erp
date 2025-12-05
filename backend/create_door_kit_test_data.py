"""
Create test data for Door Kit (komplektatsiya) system.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from decimal import Decimal
from catalog.models import Brand, Category, Product, ProductVariant, DoorKitComponent

print("="*70)
print("DOOR KIT (KOMPLEKTATSIYA) TEST DATA")
print("="*70)

# 1. Variant ni topish (yoki yaratish)
variant = ProductVariant.objects.first()
if not variant:
    print("❌ No ProductVariant found! Run create_test_catalog.py first.")
    exit(1)

print(f"\n✓ Using variant: {variant}")
print(f"  Brand: {variant.brand_name}")
print(f"  Model: {variant.model_name}")
print(f"  Color: {variant.color}")
print(f"  Type: {variant.door_type}")

# 2. Pogonaj mahsulotlarini yaratish yoki topish
pogonaj_category, _ = Category.objects.get_or_create(
    name="Погонаж",
    defaults={"description": "Наличники, коробки, доборы"}
)
print(f"\n✓ Pogonaj category: {pogonaj_category}")

brand = Brand.objects.first()

# Nalichnik yaratish
nalichnik, created = Product.objects.get_or_create(
    name="Наличник 70мм Лофт белый",
    category=pogonaj_category,
    defaults={
        "sku": "NAL-70-LOFT-WHITE",
        "brand": brand,
        "sell_price_usd": Decimal("3.50"),
        "cost_usd": Decimal("2.50"),
        "stock_ok": Decimal("150.00"),
        "is_active": True,
    }
)
if created:
    print(f"  ✓ Created: {nalichnik.name} (${nalichnik.sell_price_usd}, stock: {nalichnik.stock_ok})")

# Korobka yaratish
korobka, created = Product.objects.get_or_create(
    name="Коробка 100мм Лофт белый",
    category=pogonaj_category,
    defaults={
        "sku": "KOR-100-LOFT-WHITE",
        "brand": brand,
        "sell_price_usd": Decimal("4.50"),
        "cost_usd": Decimal("3.20"),
        "stock_ok": Decimal("120.00"),
        "is_active": True,
    }
)
if created:
    print(f"  ✓ Created: {korobka.name} (${korobka.sell_price_usd}, stock: {korobka.stock_ok})")

# Dobor yaratish
dobor, created = Product.objects.get_or_create(
    name="Добор 100мм Лофт белый",
    category=pogonaj_category,
    defaults={
        "sku": "DOB-100-LOFT-WHITE",
        "brand": brand,
        "sell_price_usd": Decimal("5.00"),
        "cost_usd": Decimal("3.50"),
        "stock_ok": Decimal("80.00"),
        "is_active": True,
    }
)
if created:
    print(f"  ✓ Created: {dobor.name} (${dobor.sell_price_usd}, stock: {dobor.stock_ok})")

# 3. Komplektatsiya komponentlarini qo'shish
print(f"\n{'='*70}")
print("ADDING KIT COMPONENTS TO VARIANT")
print("="*70)

# Nalichnik: 2.5 dona kerak
kit_nalichnik, created = DoorKitComponent.objects.get_or_create(
    variant=variant,
    component=nalichnik,
    defaults={"quantity": Decimal("2.50")}
)
print(f"  ✓ {nalichnik.name}: {kit_nalichnik.quantity} × ${nalichnik.sell_price_usd} = ${kit_nalichnik.total_price_usd}")

# Korobka: 2.5 dona kerak
kit_korobka, created = DoorKitComponent.objects.get_or_create(
    variant=variant,
    component=korobka,
    defaults={"quantity": Decimal("2.50")}
)
print(f"  ✓ {korobka.name}: {kit_korobka.quantity} × ${korobka.sell_price_usd} = ${kit_korobka.total_price_usd}")

# Dobor: 1.0 dona kerak
kit_dobor, created = DoorKitComponent.objects.get_or_create(
    variant=variant,
    component=dobor,
    defaults={"quantity": Decimal("1.00")}
)
print(f"  ✓ {dobor.name}: {kit_dobor.quantity} × ${dobor.sell_price_usd} = ${kit_dobor.total_price_usd}")

# 4. Variant narxlarini hisoblash
print(f"\n{'='*70}")
print("VARIANT PRICE CALCULATION")
print("="*70)

polotno_price = variant.min_price_usd
kit_price = variant.kit_total_price_usd
full_set_price = variant.full_set_price_usd
max_sets = variant.max_full_sets_by_stock

print(f"  Polotno narxi:        ${polotno_price:.2f}")
print(f"  Komplekt narxi:     + ${kit_price:.2f}")
print(f"  {'─'*40}")
print(f"  To'liq komplekt:    = ${full_set_price:.2f}")
print(f"\n  Skladda yig'ish mumkin: {max_sets} ta to'liq komplekt")

# 5. Komponentlar bo'yicha cheklov
print(f"\n  Komponentlar bo'yicha:")
for kit_item in variant.kit_components.all():
    component = kit_item.component
    stock = component.stock_ok
    quantity = kit_item.quantity
    possible_sets = int(stock // quantity) if quantity > 0 else 0
    print(f"    - {component.name}: {stock} dona → {possible_sets} komplekt")

print(f"\n{'='*70}")
print("✅ TEST DATA CREATED SUCCESSFULLY!")
print("="*70)
print(f"\nNext steps:")
print(f"  1. Admin: http://127.0.0.1:8000/admin/catalog/productvariant/{variant.id}/change/")
print(f"  2. API: http://127.0.0.1:8000/api/catalog/variants/{variant.id}/")
print(f"  3. Test komplektatsiya in catalog")
print("="*70)
