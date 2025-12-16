import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datetime import date, datetime
from django import template
from django.utils import timezone

# Test date object with different formats
test_date = date.today()
test_datetime = timezone.now()

print("Testing date object with different formats:")
print("=" * 60)

formats = [
    "d.m.Y",
    "Y-yil d-E",
    "d.m.Y H:i",
    "d.m.Y H:i:s"
]

for fmt in formats:
    try:
        t = template.Template('{{ value|date:"' + fmt + '" }}')
        c = template.Context({'value': test_date})
        result = t.render(c)
        print(f"✅ date with '{fmt}': {result}")
    except Exception as e:
        print(f"❌ date with '{fmt}': {str(e)}")

print("\nTesting datetime object with different formats:")
print("=" * 60)

for fmt in formats:
    try:
        t = template.Template('{{ value|date:"' + fmt + '" }}')
        c = template.Context({'value': test_datetime})
        result = t.render(c)
        print(f"✅ datetime with '{fmt}': {result}")
    except Exception as e:
        print(f"❌ datetime with '{fmt}': {str(e)}")
