#!/usr/bin/env python
"""Quick test to verify defects/stock endpoint is registered correctly"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

print("Testing defects/stock endpoint registration...")
print("=" * 60)

# Test 1: Import the viewset
try:
    from catalog.defects_from_products_view import ProductDefectFromStockViewSet
    print("✓ ProductDefectFromStockViewSet imported successfully")
except Exception as e:
    print(f"✗ Import failed: {e}")
    exit(1)

# Test 2: Check URL patterns
try:
    from core.urls import router
    patterns = [str(p.pattern) for p in router.urls]
    
    # Look for defects/stock patterns
    stock_patterns = [p for p in patterns if 'defects/stock' in p]
    
    if stock_patterns:
        print(f"✓ Found {len(stock_patterns)} defects/stock URL patterns:")
        for pattern in stock_patterns[:5]:
            print(f"  - {pattern}")
    else:
        print("✗ No defects/stock patterns found in router")
        print("First 10 defect patterns:")
        defect_patterns = [p for p in patterns if 'defect' in p][:10]
        for pattern in defect_patterns:
            print(f"  - {pattern}")
except Exception as e:
    print(f"✗ URL check failed: {e}")
    exit(1)

# Test 3: Verify data exists
try:
    from catalog.models import Product
    defect_count = Product.objects.filter(stock_defect__gt=0).count()
    print(f"✓ Database has {defect_count} products with defective stock")
except Exception as e:
    print(f"✗ Database check failed: {e}")

# Test 4: Simulate API request
try:
    from rest_framework.test import APIClient
    from users.models import User
    
    client = APIClient()
    user = User.objects.first()
    if user:
        client.force_authenticate(user=user)
        
        # Try the endpoint
        response = client.get('/api/defects/stock/', SERVER_NAME='localhost')
        
        if response.status_code == 200:
            print(f"✓ API endpoint works! Status: {response.status_code}")
            if hasattr(response, 'data'):
                count = response.data.get('count', len(response.data))
                print(f"✓ Returned {count} results")
        elif response.status_code == 404:
            print(f"✗ API endpoint returns 404 - URL not registered properly")
            print("  This may require server restart to pick up URL changes")
        else:
            print(f"⚠ API endpoint returned status {response.status_code}")
    else:
        print("⚠ No users found - skipping API test")
except Exception as e:
    print(f"✗ API test failed: {e}")
    import traceback
    traceback.print_exc()

print("=" * 60)
print("\nRESTART THE DJANGO SERVER for URL changes to take effect!")
print("Then navigate to: http://localhost:5173/defects")
