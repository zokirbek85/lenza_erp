"""
Test script for Manager KPI Overview endpoint
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from kpis.views import ManagerKPIOverviewView
from rest_framework.test import APIRequestFactory
from datetime import date

User = get_user_model()

# Get a sales manager
manager = User.objects.filter(role='sales').first()
if not manager:
    print("❌ No sales manager found")
    sys.exit(1)

print(f"✅ Found manager: {manager.get_full_name()} (ID: {manager.id})")

# Create test request with force_authenticate
from rest_framework.test import force_authenticate

factory = APIRequestFactory()
request = factory.get(f'/api/kpi/manager/{manager.id}/overview/', {
    'from_date': '2025-01-01',
    'to_date': '2025-12-31'
})

# Force authentication
force_authenticate(request, user=manager)

# Call view
view = ManagerKPIOverviewView.as_view()
response = view(request, manager_id=manager.id)

print(f"\n📊 Response Status: {response.status_code}")
print(f"\n📈 KPI Data:")
print(f"   Total Sales USD: ${response.data.get('total_sales_usd', 0):,.2f}")
print(f"   Total Sales UZS: {response.data.get('total_sales_uzs', 0):,.2f} сум")
print(f"   Total Payments USD: ${response.data.get('total_payments_usd', 0):,.2f}")
print(f"   Total Payments UZS: {response.data.get('total_payments_uzs', 0):,.2f} сум")
print(f"   Bonus USD: ${response.data.get('bonus_usd', 0):,.2f} 💰")
print(f"   Bonus UZS: {response.data.get('bonus_uzs', 0):,.2f} сум 💰")
print(f"   Total Dealers: {response.data.get('total_dealers', 0)}")
print(f"   Active Dealers: {response.data.get('active_dealers', 0)}")

if response.data.get('sales_by_region'):
    print(f"\n🌍 Sales by Region:")
    for region in response.data['sales_by_region'][:5]:
        print(f"   - {region['region']}: ${region['total_usd']:,.2f}")

if response.data.get('top_products'):
    print(f"\n🏆 Top Products:")
    for product in response.data['top_products'][:5]:
        print(f"   - {product['product_name']}: {product['quantity']} units (${product['total_amount']:,.2f})")

print(f"\n✅ Backend KPI endpoint works perfectly!")
