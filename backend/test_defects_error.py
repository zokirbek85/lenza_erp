#!/usr/bin/env python
"""Test script to reproduce the defects API error"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.defect_views import ProductDefectViewSet
from django.test import RequestFactory
from users.models import User

# Create a request
factory = RequestFactory()
request = factory.get('/api/defects/?page=1&page_size=25')

# Get first user
try:
    user = User.objects.first()
    if not user:
        print("No users found in database")
        exit(1)
    request.user = user
    
    # Create viewset
    viewset = ProductDefectViewSet()
    viewset.request = request
    viewset.format_kwarg = None
    
    # Test get_queryset
    print("Testing get_queryset()...")
    qs = viewset.get_queryset()
    print(f"✓ Queryset created successfully, count: {qs.count()}")
    
    # Test serialization
    print("\nTesting serialization...")
    from catalog.serializers import ProductDefectListSerializer
    serializer = ProductDefectListSerializer(
        qs[:25],
        many=True,
        context={'request': request}
    )
    data = serializer.data
    print(f"✓ Serialization successful, items: {len(data)}")
    
except Exception as e:
    import traceback
    print(f"\n✗ Error occurred:")
    print(f"Type: {type(e).__name__}")
    print(f"Message: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
