"""Check existing database data for catalog"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.models import Category, Product, Brand

# Check door category
door_cat = Category.objects.filter(name__icontains='дверн').first()
print(f"Door category: {door_cat}")
if door_cat:
    print(f"  ID: {door_cat.id}")
    print(f"  Products count: {Product.objects.filter(category=door_cat).count()}")
    
    # Show sample products
    sample_products = Product.objects.filter(category=door_cat)[:3]
    print(f"\n  Sample products:")
    for p in sample_products:
        print(f"    - {p.name} (ID: {p.id}, Stock: {p.stock_quantity}, Price: ${p.price_usd})")

# Check brands
brands = Brand.objects.all()[:5]
print(f"\nBrands (total: {Brand.objects.count()}):")
for b in brands:
    print(f"  - {b.name} (ID: {b.id})")
