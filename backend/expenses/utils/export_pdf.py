"""
Expenses Export Utilities - PDF Generator
"""
from datetime import datetime
from decimal import Decimal
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML
import tempfile

from ..models import Expense
from core.models import CompanyInfo
from payments.models import CurrencyRate


def generate_expense_pdf(date_from=None, date_to=None, currency='USD'):
    """
    PDF eksport - chiqimlar ro'yxati
    """
    # Ma'lumotlarni olish
    qs = Expense.objects.filter(status=Expense.STATUS_APPROVED).select_related('type', 'card', 'created_by')
    
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    if currency:
        qs = qs.filter(currency=currency)
    
    expenses = qs.order_by('date')
    
    # Jami summa
    total = sum(e.amount for e in expenses)
    
    # Kompaniya ma'lumotlari
    company = CompanyInfo.objects.first()
    
    # Currency rate
    rate = CurrencyRate.objects.order_by('-rate_date').first()
    usd_rate = Decimal(str(rate.usd_to_uzs)) if rate else Decimal('12500')
    
    # Total USD
    total_usd = total if currency == 'USD' else (total / usd_rate).quantize(Decimal('0.01'))
    
    # HTML template
    html_string = render_to_string('expenses/expense_report.html', {
        'expenses': expenses,
        'total': total,
        'total_usd': total_usd,
        'currency': currency,
        'date_from': date_from,
        'date_to': date_to,
        'company': company,
        'generated_at': datetime.now(),
        'usd_rate': usd_rate,
    })
    
    # PDF generatsiya
    html = HTML(string=html_string, encoding='utf-8')
    pdf_file = html.write_pdf()
    
    # Response
    response = HttpResponse(pdf_file, content_type='application/pdf; charset=utf-8')
    filename = f"chiqimlar_{date_from or 'all'}_{date_to or 'all'}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response
