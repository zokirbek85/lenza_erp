from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Iterable

from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from dealers.models import Dealer
from orders.models import Order, OrderReturn
from payments.models import Payment
from returns.models import Return as ProductReturn
from returns.models import ReturnItem as ProductReturnItem

ALLOWED_ROLES = {'sales', 'accountant', 'owner', 'admin'}


@dataclass
class StatementTotals:
    orders: Decimal
    payments: Decimal
    returns: Decimal


def _parse_date(value: str | None, fallback: date) -> date:
    if not value:
        return fallback
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValidationError({'detail': 'Invalid date format. Expected YYYY-MM-DD.'}) from exc


def _ensure_access(user) -> None:
    if user.is_superuser:
        return
    role = getattr(user, 'role', None)
    if role not in ALLOWED_ROLES:
        raise PermissionDenied('You are not allowed to view reconciliation statements.')


def _sum_decimal(values: Iterable[Decimal]) -> Decimal:
    total = Decimal('0')
    for value in values:
        if value is None:
            continue
        total += Decimal(value)
    return total


def _aggregate_totals(dealer: Dealer, start: date, end: date) -> StatementTotals:
    orders_total = (
        Order.objects.filter(
            dealer=dealer,
            value_date__gte=start,
            value_date__lte=end,
            status__in=Order.Status.active_statuses(),
        ).aggregate(total=Sum('total_usd'))['total']
        or Decimal('0')
    )
    payments_total = (
        Payment.objects.filter(
            dealer=dealer,
            pay_date__gte=start,
            pay_date__lte=end,
        ).aggregate(total=Sum('amount_usd'))['total']
        or Decimal('0')
    )
    returns_total = (
        OrderReturn.objects.filter(
            order__dealer=dealer,
            created_at__date__gte=start,
            created_at__date__lte=end,
        ).aggregate(total=Sum('amount_usd'))['total']
        or Decimal('0')
    )
    new_returns_total = (
        ProductReturn.objects.filter(
            dealer=dealer,
            created_at__date__gte=start,
            created_at__date__lte=end,
        ).aggregate(total=Sum('total_sum'))['total']
        or Decimal('0')
    )
    return StatementTotals(orders=orders_total, payments=payments_total, returns=returns_total + new_returns_total)


def get_reconciliation_data(
    dealer_id: int,
    from_date: str | None,
    to_date: str | None,
    *,
    user,
    detailed: bool = False,
):
    """
    Build reconciliation data for a dealer within given period.
    """

    _ensure_access(user)

    dealer = Dealer.objects.filter(pk=dealer_id).first()
    if not dealer:
        raise NotFound('Dealer not found.')

    today = timezone.localdate()
    start = _parse_date(from_date, today.replace(day=1))
    end = _parse_date(to_date, today)

    if start > end:
        raise ValidationError({'detail': 'from_date cannot be greater than to_date.'})

    orders = list(
        Order.objects.filter(
            dealer=dealer,
            value_date__gte=start,
            value_date__lte=end,
            status__in=Order.Status.active_statuses(),
        )
        .order_by('value_date', 'display_no')
        .values('value_date', 'display_no', 'total_usd')
    )

    payments = list(
        Payment.objects.filter(
            dealer=dealer,
            pay_date__gte=start,
            pay_date__lte=end,
        )
        .select_related('card')
        .order_by('pay_date', '-created_at')
        .values('pay_date', 'method', 'amount_usd', 'card__name', 'card__number', 'card__holder_name')
    )

    returns = list(
        OrderReturn.objects.filter(
            order__dealer=dealer,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )
        .select_related('order')
        .order_by('created_at')
        .values('created_at', 'amount_usd', 'order__display_no')
    )
    product_returns = list(
        ProductReturn.objects.filter(
            dealer=dealer,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )
        .order_by('created_at')
        .values('created_at', 'total_sum', 'general_comment', 'status')
    )
    product_return_items = list(
        ProductReturnItem.objects.filter(
            return_document__dealer=dealer,
            return_document__created_at__date__gte=start,
            return_document__created_at__date__lte=end,
        )
        .select_related('product', 'return_document')
        .order_by('return_document__created_at', 'product__name')
        .values(
            'return_document__created_at',
            'return_document__general_comment',
            'product__name',
            'quantity',
            'status',
        )
    )

    totals = _aggregate_totals(dealer, start, end)
    opening_balance = Decimal(dealer.opening_balance_usd or 0)
    closing_balance = opening_balance + totals.orders - totals.payments - totals.returns

    def _format_orders():
        for row in orders:
            yield {
                'date': row['value_date'],
                'order_no': row['display_no'],
                'amount_usd': float(row['total_usd'] or 0),
            }

    def _format_payments():
        for row in payments:
            masked = ''
            number = row.get('card__number')
            if number:
                masked = f"{number[:4]} **** {number[-4:]}"
            card_label = None
            if row.get('card__name'):
                card_label = row['card__name']
            label = row['method']
            # Build method label with card short if present
            if row['method'] == 'card' and (masked or card_label):
                parts = []
                if card_label:
                    parts.append(card_label)
                if masked:
                    parts.append(masked)
                holder = row.get('card__holder_name')
                if holder:
                    parts.append(f"({holder})")
                label = ' '.join(parts) or 'card'
            yield {
                'date': row['pay_date'],
                'method': label,
                'card_masked': masked,
                'amount_usd': float(row['amount_usd'] or 0),
            }

    def _format_returns():
        for row in returns:
            created = row['created_at']
            created_date = created.date() if isinstance(created, datetime) else created
            yield {
                'date': created_date,
                'order_no': row['order__display_no'],
                'amount_usd': float(row['amount_usd'] or 0),
                'source': 'order',
            }

    def _format_new_returns():
        for row in product_returns:
            created = row['created_at']
            created_date = created.date() if isinstance(created, datetime) else created
            yield {
                'date': created_date,
                'order_no': row.get('general_comment') or 'Return',
                'amount_usd': float(row.get('total_sum') or 0),
                'source': 'inventory',
            }

    movements = []
    for order in _format_orders():
        movements.append(
            {
                'date': order['date'],
                'label': order['order_no'],
                'amount_usd': order['amount_usd'],
                'direction': 'debit',
                'type': 'order',
            }
        )
    for payment in _format_payments():
        movements.append(
            {
                'date': payment['date'],
                'label': payment['method'],
                'amount_usd': payment['amount_usd'],
                'direction': 'credit',
                'type': 'payment',
            }
        )
    combined_returns = [*list(_format_returns()), *list(_format_new_returns())]

    for ret in combined_returns:
        movements.append(
            {
                'date': ret['date'],
                'label': ret['order_no'],
                'amount_usd': ret['amount_usd'],
                'direction': 'credit',
                'type': 'return',
            }
        )

    movements.sort(key=lambda item: item['date'])

    period_label = f"{start.strftime('%d.%m.%Y')} – {end.strftime('%d.%m.%Y')}"

    payload = {
        'dealer': dealer.name,
        'dealer_code': dealer.code,
        'period': period_label,
        'from_date': start,
        'to_date': end,
        'opening_balance': float(opening_balance),
        'closing_balance': float(closing_balance),
        'orders': list(_format_orders()),
        'payments': list(_format_payments()),
        'returns': combined_returns,
        'returns_items': product_return_items,
        'movements': movements,
        'generated_at': timezone.now(),
    }

    if detailed:
        # Build per-order items breakdown
        detailed_orders_qs = (
            Order.objects.filter(
                dealer=dealer,
                value_date__gte=start,
                value_date__lte=end,
                status__in=Order.Status.active_statuses(),
            )
            .order_by('value_date', 'display_no')
            .prefetch_related('items__product')
        )

        detailed_orders: list[dict] = []
        for o in detailed_orders_qs:
            items = []
            for it in o.items.all():
                items.append(
                    {
                        'id': it.id,
                        'product_name': getattr(it.product, 'name', ''),
                        'quantity': float(it.qty or 0),
                        'price': float(it.price_usd or 0),
                        'total': float(it.line_total_usd or 0),
                    }
                )
            detailed_orders.append(
                {
                    'id': o.id,
                    'order_number': o.display_no,
                    'date': o.value_date,
                    'total_amount': float(o.total_usd or 0),
                    'items': items,
                }
            )

        payload['detailed'] = True
        payload['orders_detailed'] = detailed_orders

    return payload
