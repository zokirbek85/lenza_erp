#!/usr/bin/env python
"""Test defects API endpoint to find the 500 error"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.models import ProductDefect
from catalog.serializers import ProductDefectListSerializer
from rest_framework.test import APIRequestFactory

# Create API request
factory = APIRequestFactory()
request = factory.get('/api/defects/?page=1&page_size=25')

# Get first defect
print("Checking ProductDefect model...")
defect_count = ProductDefect.objects.count()
print(f"Total defects: {defect_count}")

if defect_count > 0:
    defect = ProductDefect.objects.select_related(
        'product__brand',
        'product__category',
        'created_by',
        'updated_by'
    ).first()
    
    print(f"\nFirst defect: ID={defect.id}")
    print(f"Product: {defect.product}")
    print(f"Product image: {defect.product.image}")
    print(f"Product brand: {defect.product.brand}")
    print(f"Product category: {defect.product.category}")
    print(f"Created by: {defect.created_by}")
    print(f"Updated by: {defect.updated_by}")
    
    # Test serialization
    print("\n--- Testing Serialization ---")
    try:
        serializer = ProductDefectListSerializer(
            defect,
            context={'request': request}
        )
        data = serializer.data
        print("✓ Single defect serialization successful")
        print(f"Data keys: {list(data.keys())}")
    except Exception as e:
        import traceback
        print(f"✗ Serialization failed!")
        print(f"Error: {type(e).__name__}: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
    
    # Test list serialization
    print("\n--- Testing List Serialization ---")
    try:
        defects = ProductDefect.objects.select_related(
            'product__brand',
            'product__category',
            'created_by',
            'updated_by'
        ).all()[:25]
        
        serializer = ProductDefectListSerializer(
            defects,
            many=True,
            context={'request': request}
        )
        data = serializer.data
        print(f"✓ List serialization successful, count: {len(data)}")
    except Exception as e:
        import traceback
        print(f"✗ List serialization failed!")
        print(f"Error: {type(e).__name__}: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
else:
    print("No defects found in database")
