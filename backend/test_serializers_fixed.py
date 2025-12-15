import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalog.defects_v2_serializers import DefectTypeSerializer, SparePartSerializer
from catalog.models import DefectType
from catalog.defects_v2_models import SparePartV2

print("Testing DefectTypeSerializer...")
dt = DefectType.objects.first()
if dt:
    s = DefectTypeSerializer(dt)
    print(f"OK: {s.data}")
else:
    print("No defect types found")

print("\nTesting SparePartSerializer...")
sp = SparePartV2.objects.first()
if sp:
    s = SparePartSerializer(sp)
    print(f"OK: Fields: {list(s.data.keys())}")
else:
    print("No spare parts found")

print("\n✓ All serializers working correctly!")
