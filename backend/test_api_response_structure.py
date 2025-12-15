"""
Test API response structure for defect types and spare parts
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from catalog.defect_record_views import DefectRecordViewSet

User = get_user_model()

# Create test user
user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.create_superuser('admin', 'admin@test.com', 'admin123')

factory = APIRequestFactory()

print("=" * 70)
print("TESTING DEFECT TYPES ENDPOINT")
print("=" * 70)

# Test defect types
request = factory.get('/api/defects/records/defect-types/')
force_authenticate(request, user=user)
view = DefectRecordViewSet.as_view({'get': 'defect_types'})
response = view(request)

print(f"\nStatus Code: {response.status_code}")
print(f"Response Type: {type(response.data)}")
print(f"Is List: {isinstance(response.data, list)}")
if isinstance(response.data, list):
    print(f"Length: {len(response.data)}")
    if len(response.data) > 0:
        print(f"\nFirst item:")
        print(json.dumps(response.data[0], indent=2, ensure_ascii=False))
else:
    print(f"Response Data Keys: {response.data.keys() if hasattr(response.data, 'keys') else 'N/A'}")

print("\n" + "=" * 70)
print("TESTING SPARE PARTS ENDPOINT")
print("=" * 70)

# Test spare parts
request = factory.get('/api/defects/records/spare-parts/')
force_authenticate(request, user=user)
view = DefectRecordViewSet.as_view({'get': 'spare_parts'})
response = view(request)

print(f"\nStatus Code: {response.status_code}")
print(f"Response Type: {type(response.data)}")
print(f"Is List: {isinstance(response.data, list)}")
if isinstance(response.data, list):
    print(f"Length: {len(response.data)}")
    if len(response.data) > 0:
        print(f"\nFirst item:")
        print(json.dumps(response.data[0], indent=2, ensure_ascii=False))
else:
    print(f"Response Data Keys: {response.data.keys() if hasattr(response.data, 'keys') else 'N/A'}")

print("\n✅ Done!")
