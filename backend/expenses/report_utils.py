"""
Utilities for building the monthly expenses report payload and exports.
"""
import base64
import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from io import BytesIO

import qrcode
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.urls import reverse
from openpyxl import Workbook
from weasyprint import HTML

from core.utils.company_info import get_company_info
from payments.models import CurrencyRate

from .models import Expense
RATE_CACHE: dict[date, Decimal] = {}
DECIMAL_ZERO = Decimal('0.00')


def _parse_date(value: str) -> date:
    for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%Y-%m', '%Y/%m'):
        try:
            parsed = datetime.strptime(value, fmt).date()
            return parsed
        except (ValueError, TypeError):
            continue
    raise ValueError(f"Invalid date format: {value}")


def resolve_date_range(month: str | None, date_from: str | None, date_to: str | None) -> tuple[date, date, str]:
    today = date.today()
    if month:
        parsed = _parse_date(month)
        start = parsed.replace(day=1)
        last_day = calendar.monthrange(parsed.year, parsed.month)[1]
        end = parsed.replace(day=last_day)
    else:
        start = today.replace(day=1)
        last_day = calendar.monthrange(today.year, today.month)[1]
        end = today.replace(day=last_day)

    if date_from:
        start = _parse_date(date_from)
    if date_to:
        end = _parse_date(date_to)

    if start > end:
        raise ValueError("date_from cannot be after date_to")

    month_label = start.strftime('%Y-%m')
    return start, end, month_label


def _get_rate_for_date(target: date) -> Decimal:
    if target in RATE_CACHE:
        return RATE_CACHE[target]
    rate = CurrencyRate.objects.filter(rate_date__lte=target).order_by('-rate_date').first()
    if not rate:
        rate = CurrencyRate.objects.order_by('-rate_date').first()
    rate_value = Decimal(str(rate.usd_to_uzs)) if rate and rate.usd_to_uzs else Decimal('12500')
    RATE_CACHE[target] = rate_value
    return rate_value


def _to_decimal(value) -> Decimal:
    if value is None:
        return DECIMAL_ZERO
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return DECIMAL_ZERO


def _expense_amounts(expense: Expense) -> tuple[Decimal, Decimal]:
    usd = _to_decimal(expense.amount_usd)
    uzs = _to_decimal(expense.amount_uzs)
    if usd and uzs:
        return usd, uzs
    rate = _get_rate_for_date(expense.date)
    if expense.currency == Expense.CURRENCY_USD:
        usd = usd or _to_decimal(expense.amount)
        uzs = uzs or (usd * rate).quantize(Decimal('0.01'))
    else:
        uzs = uzs or _to_decimal(expense.amount)
        usd = usd or (uzs / rate).quantize(Decimal('0.01'))
    return usd, uzs


def aggregate_monthly_expenses(start_date: date, end_date: date) -> dict:
    qs = Expense.objects.select_related('category').filter(
        date__gte=start_date,
        date__lte=end_date,
        status=Expense.STATUS_APPROVED,
    )
    expenses = list(qs)
    total_count = len(expenses)

    type_totals: dict[str, dict[str, Decimal]] = defaultdict(lambda: {'usd': DECIMAL_ZERO, 'uzs': DECIMAL_ZERO})
    day_totals: dict[date, dict[str, Decimal]] = {}
    span = (end_date - start_date).days
    for offset in range(span + 1):
        current = start_date + timedelta(days=offset)
        day_totals[current] = {'usd': DECIMAL_ZERO, 'uzs': DECIMAL_ZERO}

    grand_usd = DECIMAL_ZERO
    grand_uzs = DECIMAL_ZERO
    for expense in expenses:
        if expense.category:
            key = expense.category.name
        elif expense.type:
            key = expense.type.name
        else:
            key = "Noma'lum"
        usd, uzs = _expense_amounts(expense)
        type_totals[key]['usd'] += usd
        type_totals[key]['uzs'] += uzs
        day_totals.setdefault(expense.date, {'usd': DECIMAL_ZERO, 'uzs': DECIMAL_ZERO})
        day_totals[expense.date]['usd'] += usd
        day_totals[expense.date]['uzs'] += uzs
        grand_usd += usd
        grand_uzs += uzs

    rows = []
    for title, totals in sorted(type_totals.items(), key=lambda item: item[1]['usd'], reverse=True):
        percent = (totals['usd'] / grand_usd * 100) if grand_usd else DECIMAL_ZERO
        rows.append({
            'type': title,
            'usd': float(totals['usd']),
            'uzs': float(totals['uzs']),
            'percentage': float(percent.quantize(Decimal('0.01')) if isinstance(percent, Decimal) else round(percent, 2)),
        })

    trend = []
    for day in sorted(day_totals.keys()):
        data = day_totals[day]
        trend.append({
            'date': day.isoformat(),
            'usd': float(data['usd']),
            'uzs': float(data['uzs']),
        })

    latest_rate = CurrencyRate.objects.filter(rate_date__lte=end_date).order_by('-rate_date').first()
    usd_rate = Decimal(str(latest_rate.usd_to_uzs)) if latest_rate and latest_rate.usd_to_uzs else Decimal('12500')
    rate_date = latest_rate.rate_date.isoformat() if latest_rate else None

    return {
        'count': total_count,
        'rows': rows,
        'trend': trend,
        'total_usd': float(grand_usd),
        'total_uzs': float(grand_uzs),
        'usd_rate': float(usd_rate),
        'rate_date': rate_date,
    }


def _build_verify_url(request, doc_type: str, doc_id: str) -> str:
    path = reverse('verify-document', args=[doc_type, doc_id])
    return request.build_absolute_uri(path)


def _render_qr(data: str) -> str:
    qr = qrcode.make(data)
    buffer = BytesIO()
    qr.save(buffer, format='PNG')
    encoded = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{encoded}"


def build_pdf_context(request, payload: dict) -> dict:
    company = get_company_info()
    company_logo = company.get('logo')
    if company_logo and not company_logo.startswith('http'):
        try:
            company_logo = request.build_absolute_uri(company_logo)
        except Exception:
            company_logo = None

    verify_url = _build_verify_url(request, 'expenses-report', payload['month'])
    qr_code = _render_qr(verify_url)

    context = {
        'company': company,
        'company_logo': company_logo,
        'month': payload['month'],
        'rows': payload['rows'],
        'total_usd': payload['total_usd'],
        'total_uzs': payload['total_uzs'],
        'rate': payload.get('usd_rate', 0),
        'from_date': payload.get('from_date'),
        'to_date': payload.get('to_date'),
        'verify_url': verify_url,
        'qr_code': qr_code,
        'generated_at': timezone.now(),
    }
    return context


def build_monthly_payload(start_date: date, end_date: date, month_label: str) -> dict:
    payload = aggregate_monthly_expenses(start_date, end_date)
    payload.update({
        'month': month_label,
        'from_date': start_date.isoformat(),
        'to_date': end_date.isoformat(),
    })
    return payload


def render_pdf_response(request, context: dict, month_label: str, template: str = 'expenses/export_monthly_pdf.html') -> HttpResponse:
    html = render_to_string('expenses/report.html', context)
    pdf_bytes = HTML(string=html, encoding='utf-8').write_pdf()
    filename = f"monthly_expenses_{month_label}.pdf"
    response = HttpResponse(pdf_bytes, content_type='application/pdf; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def render_xlsx_response(payload: dict) -> HttpResponse:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = 'Chiqimlar oyligi'
    headers = ['Chiqim turi', 'USD', 'UZS', 'Ulush (%)']
    worksheet.append(headers)

    for row in payload['rows']:
        worksheet.append([row['type'], row['usd'], row['uzs'], row['percentage']])

    worksheet.append([])
    worksheet.append(['Jami USD', payload['total_usd'], ''])
    worksheet.append(['Jami UZS', payload['total_uzs'], ''])
    worksheet.append(['Kurs (1 USD)', payload['usd_rate'], ''])

    for column_cells in worksheet.columns:
        length = max(len(str(cell.value or '')) for cell in column_cells)
        worksheet.column_dimensions[column_cells[0].column_letter].width = min(30, length + 2)

    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)

    filename = f"monthly_expenses_{payload['month']}.xlsx"
    response = HttpResponse(stream.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
