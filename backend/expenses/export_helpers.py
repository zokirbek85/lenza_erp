"""
Shared helpers for building expense export data.
"""
from decimal import Decimal
from typing import Iterable

from django.db.models import Sum

from .models import Expense, ExpenseCategory, ExpenseType


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
        category_name = None
        if hasattr(expense, 'category') and expense.category:
            category_name = expense.category.name
        elif expense.type:
            category_name = expense.type.name
        else:
            category_name = "Noma'lum"
        rows.append({
            'date': expense.date,
            'category': category_name,
            'cashbox': expense.cashbox.name if expense.cashbox else '',
            'currency': expense.currency,
            'amount': float(expense.amount or Decimal('0')),
            'created_by': getattr(expense.created_by, 'full_name', '') or getattr(expense.created_by, 'username', ''),
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

    category_id = params.get('category') or params.get('type')
    if category_id:
        category_name = ExpenseCategory.objects.filter(id=category_id).values_list('name', flat=True).first()
        filters.append(f"Turi: {category_name or category_id}")

    currency = params.get('currency')
    if currency:
        filters.append(f"Valyuta: {currency}")

    cashbox = params.get('cashbox') or params.get('cashbox_id')
    if cashbox:
        filters.append(f"Kassa ID: {cashbox}")

    return filters


def total_amounts(queryset):
    totals = {
        'total_usd': queryset.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or Decimal('0'),
        'total_uzs': queryset.filter(currency='UZS').aggregate(total=Sum('amount'))['total'] or Decimal('0'),
    }
    return {
        'usd': float(totals['total_usd'] or Decimal('0')),
        'uzs': float(totals['total_uzs'] or Decimal('0')),
    }
