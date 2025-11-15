"""
Ledger Export Utilities - PDF Generator
"""
from datetime import datetime
from decimal import Decimal
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML

from ..models import LedgerRecord
from core.models import CompanyInfo
from payments.models import CurrencyRate


def generate_ledger_pdf(date_from=None, date_to=None, currency='USD'):
    """
    PDF eksport - kassa operatsiyalari
    """
    # Ma'lumotlarni olish
    qs = LedgerRecord.objects.select_related('created_by').all()
    
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    if currency:
        qs = qs.filter(currency=currency)
    
    records = qs.order_by('date')
    
    # Balans hisoblash
    income = sum(r.amount for r in records if r.type == LedgerRecord.TYPE_INCOME)
    expense = sum(r.amount for r in records if r.type == LedgerRecord.TYPE_EXPENSE)
    balance = income - expense
    
    # Kompaniya ma'lumotlari
    company = CompanyInfo.objects.first()
    
    # Currency rate
    rate = CurrencyRate.objects.order_by('-rate_date').first()
    usd_rate = Decimal(str(rate.usd_to_uzs)) if rate else Decimal('12500')
    
    # USD konvertatsiya
    if currency == 'USD':
        income_usd = income
        expense_usd = expense
        balance_usd = balance
    else:
        income_usd = (income / usd_rate).quantize(Decimal('0.01'))
        expense_usd = (expense / usd_rate).quantize(Decimal('0.01'))
        balance_usd = (balance / usd_rate).quantize(Decimal('0.01'))
    
    # HTML template
    html_string = render_to_string('ledger/ledger_report.html', {
        'records': records,
        'total_income': income,
        'total_expense': expense,
        'balance': balance,
        'income_usd': income_usd,
        'expense_usd': expense_usd,
        'balance_usd': balance_usd,
        'currency': currency,
        'date_from': date_from,
        'date_to': date_to,
        'company': company,
        'generated_at': datetime.now(),
        'usd_rate': usd_rate,
    })
    
    # PDF generatsiya
    html = HTML(string=html_string)
    pdf_file = html.write_pdf()
    
    # Response
    response = HttpResponse(pdf_file, content_type='application/pdf')
    filename = f"kassa_{date_from or 'all'}_{date_to or 'all'}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response
