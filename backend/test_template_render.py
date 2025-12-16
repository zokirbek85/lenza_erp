import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datetime import date
from django.template.loader import render_to_string
from django.utils import timezone
from orders.services.daily_report import DailyFinancialReportService

# Test template rendering
test_date = date(2025, 12, 17)
service = DailyFinancialReportService(test_date)
report_data = service.generate_report()

print(f"Testing template with date: {test_date}")
print("=" * 60)

try:
    html = render_to_string('reports/daily_report.html', {
        'dealers': report_data['dealers'],
        'summary': report_data['summary'],
        'current_datetime': timezone.now(),
        'company_name': 'LENZA',
        'company_slogan': 'Premium Door Systems',
        'company_logo': '/static/logo.png',
    })
    print("✅ Template rendered successfully!")
    print(f"HTML length: {len(html)} characters")
except Exception as e:
    print(f"❌ Template rendering failed: {e}")
    import traceback
    traceback.print_exc()
