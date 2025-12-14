#!/usr/bin/env python
"""Test the defects API fix"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.models import Product, ProductDefect, Brand, Category
from catalog.serializers import ProductDefectListSerializer
from users.models import User
from decimal import Decimal
from rest_framework.test import APIRequestFactory

print("=" * 60)
print("Testing Defects API Serializer Fix")
print("=" * 60)

# Get or create test data
print("\n1. Creating test data...")

# Create products with various scenarios
scenarios = [
    {
        'name': 'Product with all fields',
        'has_brand': True,
        'has_category': True,
        'has_image': False,
        'has_created_by': True
    },
    {
        'name': 'Product without brand/category',
        'has_brand': False,
        'has_category': False,
        'has_image': False,
        'has_created_by': False
    }
]

defects_created = []

# Get or create user
user = User.objects.first()
if not user:
    user = User.objects.create_user(
        username='testadmin',
        email='admin@test.com',
        password='test123',
        is_staff=True
    )
    print("  ✓ Created test user")

for i, scenario in enumerate(scenarios):
    print(f"\n  Scenario {i+1}: {scenario['name']}")
    
    # Create brand if needed
    brand = None
    if scenario['has_brand']:
        brand, _ = Brand.objects.get_or_create(
            name=f'Test Brand {i+1}',
            defaults={'description': f'Test brand {i+1}'}
        )
        print(f"    ✓ Brand: {brand.name}")
    
    # Create category if needed
    category = None
    if scenario['has_category']:
        category, _ = Category.objects.get_or_create(
            name=f'Test Category {i+1}',
            defaults={'description': f'Test category {i+1}'}
        )
        print(f"    ✓ Category: {category.name}")
    
    # Create product
    product, created = Product.objects.get_or_create(
        sku=f'TEST-SKU-{i+1:03d}',
        defaults={
            'name': f'Test Product {i+1}',
            'brand': brand,
            'category': category,
            'unit': 'pcs',
            'sell_price_usd': Decimal('50.00'),
        }
    )
    print(f"    ✓ Product: {product.name}")
    
    # Create defect
    defect, created = ProductDefect.objects.get_or_create(
        product=product,
        defaults={
            'qty': Decimal('3.00'),
            'repairable_qty': Decimal('2.00'),
            'non_repairable_qty': Decimal('1.00'),
            'defect_details': [
                {'type_id': 1, 'type_name': 'Damage', 'qty': 3}
            ],
            'status': 'detected',
            'description': f'Test defect {i+1}',
            'created_by': user if scenario['has_created_by'] else None,
            'updated_by': user if scenario['has_created_by'] else None,
        }
    )
    defects_created.append(defect)
    print(f"    ✓ Defect created: ID={defect.id}")

print(f"\n2. Testing serialization of {len(defects_created)} defects...")

# Create API request
factory = APIRequestFactory()
request = factory.get('/api/defects/')

# Test serialization
try:
    serializer = ProductDefectListSerializer(
        defects_created,
        many=True,
        context={'request': request}
    )
    data = serializer.data
    
    print(f"  ✓ Serialization successful!")
    print(f"  ✓ Serialized {len(data)} defects")
    
    for i, item in enumerate(data):
        print(f"\n  Defect {i+1}:")
        print(f"    - Product: {item.get('product_name', 'N/A')}")
        print(f"    - SKU: {item.get('product_sku', 'N/A')}")
        print(f"    - Image: {item.get('product_image', 'None')}")
        print(f"    - Created by: {item.get('created_by_name', 'None')}")
        print(f"    - Status: {item.get('status_display', 'N/A')}")
        
except Exception as e:
    import traceback
    print(f"\n  ✗ SERIALIZATION FAILED!")
    print(f"  Error: {type(e).__name__}: {e}")
    print("\n  Full traceback:")
    traceback.print_exc()
    exit(1)

print("\n3. Testing API endpoint...")

# Test the actual API
from rest_framework.test import APIClient

client = APIClient()
client.force_authenticate(user=user)

try:
    response = client.get('/api/defects/?page=1&page_size=25', SERVER_NAME='localhost')
    print(f"  Status Code: {response.status_code}")
    
    if response.status_code == 500:
        print("\n  ✗ API RETURNED 500 ERROR!")
        content = response.content.decode('utf-8', errors='replace')
        print("\n  Error details (first 1500 chars):")
        print("  " + "\n  ".join(content[:1500].split('\n')))
        exit(1)
    elif response.status_code == 200:
        print("  ✓ API request successful!")
        result_count = len(response.data.get('results', response.data))
        print(f"  ✓ Returned {result_count} results")
    else:
        print(f"  Unexpected status code: {response.status_code}")
        print(f"  Response: {response.content.decode('utf-8', errors='replace')[:500]}")
        
except Exception as e:
    import traceback
    print(f"\n  ✗ API REQUEST FAILED!")
    print(f"  Error: {type(e).__name__}: {e}")
    print("\n  Full traceback:")
    traceback.print_exc()
    exit(1)

print("\n" + "=" * 60)
print("✓ ALL TESTS PASSED!")
print("=" * 60)
