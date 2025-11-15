"""
Shared helpers for building expense export data.
"""
from decimal import Decimal
from typing import Iterable

from django.db.models import Sum

from .models import Expense, ExpenseType


def get_filtered_expense_queryset(request):
    from .views import ExpenseViewSet

    viewset = ExpenseViewSet()
    viewset.request = request
    viewset.action = 'list'
    viewset.kwargs = {}
    return viewset.filter_queryset(viewset.get_queryset())


def expense_rows_from_queryset(queryset: Iterable[Expense]) -> list[dict]:
    rows = []
    for expense in queryset:
        rows.append({
            'date': expense.date,
            'category': expense.type.name if expense.type else 'Noma\'lum',
            'method': expense.get_method_display(),
            'payment_method': expense.method,
            'currency': expense.currency,
            'amount_usd': float(expense.amount_usd or Decimal('0')),
            'amount_uzs': float(expense.amount_uzs or Decimal('0')),
            'status': expense.get_status_display(),
            'description': expense.description or '',
        })
    return rows


def describe_export_filters(request):
    params = request.GET
    filters = []
    date_from = params.get('date_from')
    date_to = params.get('date_to')
    if date_from or date_to:
        filters.append(f"Davri: {date_from or 'boshlangich'} – {date_to or 'hozirgi'}")

    type_id = params.get('type')
    if type_id:
        type_name = ExpenseType.objects.filter(id=type_id).values_list('name', flat=True).first()
        filters.append(f"Turi: {type_name or type_id}")

    method = params.get('method')
    if method:
        display = dict(Expense.METHOD_CHOICES).get(method, method)
        filters.append(f"Usul: {display}")

    currency = params.get('currency')
    if currency:
        filters.append(f"Valyuta: {currency}")

    status = params.get('status')
    if status:
        display = dict(Expense.STATUS_CHOICES).get(status, status)
        filters.append(f"Holat: {display}")

    card = params.get('card')
    if card:
        filters.append(f"Karta ID: {card}")

    return filters


def total_amounts(queryset):
    totals = queryset.aggregate(
        total_usd=Sum('amount_usd'),
        total_uzs=Sum('amount_uzs'),
    )
    return {
        'usd': float(totals['total_usd'] or Decimal('0')),
        'uzs': float(totals['total_uzs'] or Decimal('0')),
    }
