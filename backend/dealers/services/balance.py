"""
Dealer Balance Calculation Service
Provides accurate multi-currency balance calculations with proper return handling.
"""
from decimal import Decimal
from typing import Optional, Tuple
from datetime import date

from django.db.models import Q, Sum, F, Value, Case, When, DecimalField, QuerySet
from django.db.models.functions import Coalesce
from django.utils import timezone


def calculate_dealer_balance(dealer, as_of_date: Optional[date] = None) -> dict:
    """
    Calculate dealer balance with proper formula using historical exchange rates:
    
    balance = opening_balance + orders - returns - payments
    
    NEW LOGIC:
    1. Opening balance converted using opening_balance_date rate
    2. Orders use stored exchange rates from order.exchange_rate
    3. Payments use stored exchange rates from transaction.exchange_rate
    
    Where:
    - orders: confirmed/packed/shipped/delivered, not imported
    - returns: both OrderReturn and ReturnItem (all types including defective)
    - payments: approved INCOME transactions only
    
    Args:
        dealer: Dealer instance
        as_of_date: Optional cutoff date (for historical balances)
    
    Returns:
        dict with balance_usd, balance_uzs, and breakdown
    """
    from orders.models import Order, OrderReturn
    from returns.models import Return, ReturnItem
    from finance.models import FinanceTransaction
    from core.utils.currency import get_exchange_rate
    
    # 1. Calculate opening balance with historical rate
    opening_balance_amount = dealer.opening_balance or Decimal('0')
    opening_currency = dealer.opening_balance_currency or 'USD'
    opening_date = dealer.opening_balance_date or dealer.created_at.date() if dealer.created_at else timezone.localdate()
    
    # Get exchange rate for opening balance date
    opening_rate, _ = get_exchange_rate(opening_date)
    
    if opening_currency == 'USD':
        opening_usd = opening_balance_amount
        opening_uzs = (opening_balance_amount * opening_rate).quantize(Decimal('0.01'))
    else:  # UZS
        opening_uzs = opening_balance_amount
        opening_usd = (opening_balance_amount / opening_rate).quantize(Decimal('0.01')) if opening_rate > 0 else Decimal('0')
    
    # Base filters
    order_filter = Q(
        status__in=Order.Status.active_statuses(),
        is_imported=False
    )
    if as_of_date:
        order_filter &= Q(value_date__lte=as_of_date)
    
    # 2. Calculate total orders (USD and UZS) - using stored exchange rates
    orders_qs = dealer.orders.filter(order_filter)
    total_orders_usd = orders_qs.aggregate(
        total=Coalesce(Sum('total_usd'), Value(0, output_field=DecimalField()))
    )['total'] or Decimal('0')
    total_orders_uzs = orders_qs.aggregate(
        total=Coalesce(Sum('total_uzs'), Value(0, output_field=DecimalField()))
    )['total'] or Decimal('0')
    
    # 2. Calculate OrderReturn (from orders module)
    order_return_filter = Q(order__dealer=dealer, order__is_imported=False)
    if as_of_date:
        order_return_filter &= Q(created_at__date__lte=as_of_date)
    
    order_returns = OrderReturn.objects.filter(order_return_filter).aggregate(
        usd=Coalesce(Sum('amount_usd'), Value(0, output_field=DecimalField())),
        uzs=Coalesce(Sum('amount_uzs'), Value(0, output_field=DecimalField()))
    )
    total_order_returns_usd = order_returns['usd'] or Decimal('0')
    total_order_returns_uzs = order_returns['uzs'] or Decimal('0')
    
    # 3. Calculate ReturnItem (from returns module)
    # Both healthy and defective returns reduce dealer balance (they're returning products)
    return_item_filter = Q(return_document__dealer=dealer)
    if as_of_date:
        return_item_filter &= Q(return_document__created_at__date__lte=as_of_date)
    
    # Calculate return value: quantity * product.sell_price_usd
    return_items = ReturnItem.objects.filter(return_item_filter).select_related('product')
    total_return_items_usd = Decimal('0')
    for item in return_items:
        price = item.product.sell_price_usd or Decimal('0')
        qty = item.quantity or Decimal('0')
        total_return_items_usd += price * qty
    
    # Convert return items to UZS (use current rate or as_of_date rate)
    rate, _ = get_exchange_rate(as_of_date)
    total_return_items_uzs = (total_return_items_usd * rate).quantize(Decimal('0.01'))
    
    # Total returns (both types)
    total_returns_usd = total_order_returns_usd + total_return_items_usd
    total_returns_uzs = total_order_returns_uzs + total_return_items_uzs
    
    # 4. Calculate payments and refunds
    # Payments (INCOME) decrease dealer balance (credit)
    payment_filter = Q(
        dealer=dealer,
        type=FinanceTransaction.TransactionType.INCOME,
        status=FinanceTransaction.TransactionStatus.APPROVED
    )
    if as_of_date:
        payment_filter &= Q(date__lte=as_of_date)
    
    payments = FinanceTransaction.objects.filter(payment_filter).aggregate(
        usd=Coalesce(Sum('amount_usd'), Value(0, output_field=DecimalField())),
        uzs=Coalesce(Sum('amount_uzs'), Value(0, output_field=DecimalField()))
    )
    total_payments_usd = payments['usd'] or Decimal('0')
    total_payments_uzs = payments['uzs'] or Decimal('0')
    
    # Refunds (DEALER_REFUND) increase dealer balance (debit)
    refund_filter = Q(
        dealer=dealer,
        type=FinanceTransaction.TransactionType.DEALER_REFUND,
        status=FinanceTransaction.TransactionStatus.APPROVED
    )
    if as_of_date:
        refund_filter &= Q(date__lte=as_of_date)
    
    refunds = FinanceTransaction.objects.filter(refund_filter).aggregate(
        usd=Coalesce(Sum('amount_usd'), Value(0, output_field=DecimalField())),
        uzs=Coalesce(Sum('amount_uzs'), Value(0, output_field=DecimalField()))
    )
    total_refunds_usd = refunds['usd'] or Decimal('0')
    total_refunds_uzs = refunds['uzs'] or Decimal('0')
    
    # Net payments = payments - refunds
    net_payments_usd = total_payments_usd - total_refunds_usd
    net_payments_uzs = total_payments_uzs - total_refunds_uzs
    
    # 5. Calculate final balance
    # USD balance: opening_balance + orders + refunds - returns - payments
    balance_usd = opening_usd + total_orders_usd + total_refunds_usd - total_returns_usd - total_payments_usd
    
    # UZS balance with historical rates (original calculation)
    balance_uzs = opening_uzs + total_orders_uzs - total_returns_uzs - net_payments_uzs
    
    # UZS balance at today's rate (for display in dealers table)
    current_rate, _ = get_exchange_rate()  # Today's rate
    balance_uzs_current_rate = (balance_usd * current_rate).quantize(Decimal('0.01'))
    
    return {
        'balance_usd': balance_usd,
        'balance_uzs': balance_uzs,  # Historical rates (for finance/orders)
        'balance_uzs_current_rate': balance_uzs_current_rate,  # Today's rate (for dealers table)
        'current_exchange_rate': current_rate,
        'breakdown': {
            # Current rate info
            'current_exchange_rate': current_rate,
            # Opening balance
            'opening_balance': opening_balance_amount,
            'opening_balance_currency': opening_currency,
            'opening_balance_date': opening_date,
            'opening_balance_rate': opening_rate,
            'opening_balance_usd': opening_usd,
            'opening_balance_uzs': opening_uzs,  # Historical rate
            # Legacy fields (kept for compatibility)
            'legacy_opening_balance_usd': dealer.opening_balance_usd or Decimal('0'),
            'legacy_opening_balance_uzs': dealer.opening_balance_uzs or Decimal('0'),
            # Transaction totals
            'total_orders_usd': total_orders_usd,
            'total_orders_uzs': total_orders_uzs,
            'total_returns_usd': total_returns_usd,
            'total_returns_uzs': total_returns_uzs,
            'order_returns_usd': total_order_returns_usd,
            'order_returns_uzs': total_order_returns_uzs,
            'return_items_usd': total_return_items_usd,
            'return_items_uzs': total_return_items_uzs,
            'total_payments_usd': total_payments_usd,
            'total_payments_uzs': total_payments_uzs,
            'total_refunds_usd': total_refunds_usd,
            'total_refunds_uzs': total_refunds_uzs,
            'net_payments_usd': net_payments_usd,
            'net_payments_uzs': net_payments_uzs,
        }
    }


def annotate_dealers_with_balances(queryset: QuerySet) -> QuerySet:
    """
    Annotate dealer queryset with calculated balances.
    Optimized for list views to avoid N+1 queries.
    
    Note: This uses database aggregation which may not include ReturnItem.
    For exact balance with ReturnItem, use calculate_dealer_balance() per dealer.
    
    Args:
        queryset: Dealer queryset
    
    Returns:
        Queryset with balance annotations
    """
    from orders.models import Order, OrderReturn
    from finance.models import FinanceTransaction
    
    return queryset.annotate(
        # Orders total (active, not imported)
        total_orders_usd=Coalesce(
            Sum(
                'orders__total_usd',
                filter=Q(
                    orders__status__in=Order.Status.active_statuses(),
                    orders__is_imported=False
                )
            ),
            Value(0, output_field=DecimalField())
        ),
        total_orders_uzs=Coalesce(
            Sum(
                'orders__total_uzs',
                filter=Q(
                    orders__status__in=Order.Status.active_statuses(),
                    orders__is_imported=False
                )
            ),
            Value(0, output_field=DecimalField())
        ),
        
        # OrderReturn total (from orders module)
        total_order_returns_usd=Coalesce(
            Sum(
                'orders__returns__amount_usd',
                filter=Q(orders__is_imported=False)
            ),
            Value(0, output_field=DecimalField())
        ),
        total_order_returns_uzs=Coalesce(
            Sum(
                'orders__returns__amount_uzs',
                filter=Q(orders__is_imported=False)
            ),
            Value(0, output_field=DecimalField())
        ),
        
        # Payments total (approved income only)
        total_payments_usd=Coalesce(
            Sum(
                'finance_transactions__amount_usd',
                filter=Q(
                    finance_transactions__type=FinanceTransaction.TransactionType.INCOME,
                    finance_transactions__status=FinanceTransaction.TransactionStatus.APPROVED
                )
            ),
            Value(0, output_field=DecimalField())
        ),
        total_payments_uzs=Coalesce(
            Sum(
                'finance_transactions__amount_uzs',
                filter=Q(
                    finance_transactions__type=FinanceTransaction.TransactionType.INCOME,
                    finance_transactions__status=FinanceTransaction.TransactionStatus.APPROVED
                )
            ),
            Value(0, output_field=DecimalField())
        ),
        
        # Refunds total (approved dealer refunds)
        total_refunds_usd=Coalesce(
            Sum(
                'finance_transactions__amount_usd',
                filter=Q(
                    finance_transactions__type=FinanceTransaction.TransactionType.DEALER_REFUND,
                    finance_transactions__status=FinanceTransaction.TransactionStatus.APPROVED
                )
            ),
            Value(0, output_field=DecimalField())
        ),
        total_refunds_uzs=Coalesce(
            Sum(
                'finance_transactions__amount_uzs',
                filter=Q(
                    finance_transactions__type=FinanceTransaction.TransactionType.DEALER_REFUND,
                    finance_transactions__status=FinanceTransaction.TransactionStatus.APPROVED
                )
            ),
            Value(0, output_field=DecimalField())
        ),
        
        # Calculated balance (without ReturnItem - for performance)
        # For exact balance including ReturnItem, use calculate_dealer_balance()
        # Balance = opening + orders - returns - (payments - refunds)
        calculated_balance_usd=F('opening_balance_usd') + F('total_orders_usd') - F('total_order_returns_usd') - F('total_payments_usd') + F('total_refunds_usd'),
        calculated_balance_uzs=F('opening_balance_uzs') + F('total_orders_uzs') - F('total_order_returns_uzs') - F('total_payments_uzs') + F('total_refunds_uzs'),
    )
