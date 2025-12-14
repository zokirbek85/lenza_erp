#!/usr/bin/env python
"""Create test defect data"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.models import Product, ProductDefect, Brand, Category
from users.models import User
from decimal import Decimal

# Get or create test data
print("Creating test data...")

# Get or create brand
brand, _ = Brand.objects.get_or_create(
    name='Test Brand',
    defaults={'description': 'Test brand for defect testing'}
)

# Get or create category
category, _ = Category.objects.get_or_create(
    name='Test Category',
    defaults={'description': 'Test category for defect testing'}
)

# Get or create product
product, _ = Product.objects.get_or_create(
    sku='TEST-DEFECT-001',
    defaults={
        'name': 'Test Product for Defects',
        'brand': brand,
        'category': category,
        'unit': 'pcs',
        'sell_price_usd': Decimal('100.00'),
    }
)

# Get or create user
user = User.objects.first()
if not user:
    user = User.objects.create_user(
        username='admin',
        email='admin@example.com',
        password='admin123',
        is_staff=True,
        is_superuser=True
    )

# Create defect
defect, created = ProductDefect.objects.get_or_create(
    product=product,
    defaults={
        'qty': Decimal('5.00'),
        'repairable_qty': Decimal('3.00'),
        'non_repairable_qty': Decimal('2.00'),
        'defect_details': [
            {'type_id': 1, 'type_name': 'Scratched', 'qty': 3},
            {'type_id': 2, 'type_name': 'Broken', 'qty': 2}
        ],
        'status': 'detected',
        'description': 'Test defect for debugging',
        'created_by': user,
        'updated_by': user,
    }
)

if created:
    print(f"✓ Created defect: {defect.id}")
else:
    print(f"✓ Found existing defect: {defect.id}")

print(f"Product: {defect.product}")
print(f"Brand: {defect.product.brand}")
print(f"Category: {defect.product.category}")
print(f"Created by: {defect.created_by}")
print(f"Updated by: {defect.updated_by}")

# Now test the API
from rest_framework.test import APIClient

client = APIClient()
client.force_authenticate(user=user)

print("\n--- Testing API ---")
try:
    response = client.get('/api/defects/?page=1&page_size=25', SERVER_NAME='localhost')
    print(f"Status: {response.status_code}")
    
    if response.status_code == 500:
        print("\n=== 500 ERROR ===")
        content = response.content.decode('utf-8', errors='replace')
        print(content[:3000])
    elif response.status_code == 200:
        print(f"✓ Success! Count: {response.data.get('count', 'N/A')}")
    else:
        print(f"Unexpected status: {response.status_code}")
        print(response.content.decode('utf-8', errors='replace')[:1000])
        
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
