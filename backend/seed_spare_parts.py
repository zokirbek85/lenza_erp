"""
Seed spare parts data for defects module.
Creates test spare parts linked to products.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from decimal import Decimal
from catalog.models import Product
from catalog.defects_v2_models import SparePartV2

def seed_spare_parts():
    """Create spare parts from existing products or new ones"""
    
    spare_parts_data = [
        {
            'name': 'Дошечка (деревянная планка)',
            'unit': 'дона',
            'min_stock_level': Decimal('50.00'),
        },
        {
            'name': 'Стекло (оконное)',
            'unit': 'м²',
            'min_stock_level': Decimal('20.00'),
        },
        {
            'name': 'Ён стойевой (боковая стойка)',
            'unit': 'дона',
            'min_stock_level': Decimal('30.00'),
        },
        {
            'name': 'Қоплама (покрытие)',
            'unit': 'м²',
            'min_stock_level': Decimal('15.00'),
        },
        {
            'name': 'Ручка дверная',
            'unit': 'дона',
            'min_stock_level': Decimal('100.00'),
        },
        {
            'name': 'Петли дверные',
            'unit': 'комплект',
            'min_stock_level': Decimal('50.00'),
        },
        {
            'name': 'Замок врезной',
            'unit': 'дона',
            'min_stock_level': Decimal('40.00'),
        },
        {
            'name': 'Уплотнитель',
            'unit': 'метр',
            'min_stock_level': Decimal('200.00'),
        },
        {
            'name': 'Саморезы',
            'unit': 'упаковка',
            'min_stock_level': Decimal('20.00'),
        },
        {
            'name': 'Краска',
            'unit': 'литр',
            'min_stock_level': Decimal('10.00'),
        },
    ]
    
    created_count = 0
    
    for sp_data in spare_parts_data:
        # Check if spare part already exists
        if SparePartV2.objects.filter(name=sp_data['name']).exists():
            print(f"✓ Spare part '{sp_data['name']}' already exists")
            continue
        
        # Try to find existing product with similar name
        product = Product.objects.filter(name__icontains=sp_data['name'].split()[0]).first()
        
        # If no product found, create a placeholder
        if not product:
            # Create SKU based on name
            sku = f"SP-{sp_data['name'][:3].upper()}-{1000 + created_count}"
            
            product = Product.objects.create(
                name=sp_data['name'],
                sku=sku,
                cost_usd=Decimal('1.00'),  # Placeholder price
                sell_price_usd=Decimal('2.00'),  # Placeholder price
                stock_ok=Decimal('100.00'),  # Start with some stock
            )
            print(f"  Created product: {product.sku} - {product.name}")
        
        # Create spare part
        spare_part = SparePartV2.objects.create(
            product=product,
            name=sp_data['name'],
            unit=sp_data['unit'],
            min_stock_level=sp_data['min_stock_level'],
            is_active=True,
        )
        
        print(f"✓ Created spare part: {spare_part.name} (Product: {product.sku})")
        created_count += 1
    
    print(f"\n✅ Seeded {created_count} spare parts")
    print(f"📊 Total spare parts in DB: {SparePartV2.objects.count()}")

if __name__ == '__main__':
    print("🌱 Seeding spare parts data...\n")
    seed_spare_parts()
