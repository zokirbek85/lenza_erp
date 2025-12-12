"""
Script to check dealer opening balance in database
Run this from backend directory: python ../check_dealer_balance.py
"""
import os
import sys
import django

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from dealers.models import Dealer
from datetime import date, timedelta
from decimal import Decimal

# Find dealer by name (adjust name if needed)
dealer_name = "Шерзод Хива"  # From screenshot
dealers = Dealer.objects.filter(name__icontains="Шерзод").all()

if not dealers:
    print("Dealer not found. Available dealers:")
    for d in Dealer.objects.all()[:20]:
        print(f"  - {d.name} (ID: {d.id})")
    sys.exit(1)

for dealer in dealers:
    print(f"\n{'='*60}")
    print(f"Dealer: {dealer.name} (ID: {dealer.id})")
    print(f"Code: {dealer.code}")
    print(f"{'='*60}")
    print(f"Opening Balance USD: {dealer.opening_balance_usd}")
    print(f"Opening Balance Date: {dealer.opening_balance_date}")
    print(f"Opening Balance UZS: {getattr(dealer, 'opening_balance_uzs', 'N/A')}")
    
    if dealer.opening_balance_date:
        # Calculate what should be opening balance for 01.12.2025
        from_date = date(2025, 12, 1)
        initial_date = dealer.opening_balance_date
        initial_balance = Decimal(dealer.opening_balance_usd or 0)
        
        print(f"\n{'='*60}")
        print(f"CALCULATION FOR 01.12.2025:")
        print(f"{'='*60}")
        print(f"Initial Balance: ${initial_balance} (as of {initial_date})")
        
        if from_date > initial_date:
            # Get transactions from initial_date to 30.11.2025
            end_prior = from_date - timedelta(days=1)
            print(f"\nTransactions from {initial_date} to {end_prior}:")
            
            # Orders
            from orders.models import Order
            orders = Order.objects.filter(
                dealer=dealer,
                value_date__gte=initial_date,
                value_date__lte=end_prior,
                status__in=Order.Status.active_statuses(),
                is_imported=False,
            )
            orders_total = sum(o.total_usd or 0 for o in orders)
            print(f"\nORDERS (Debit +):")
            for o in orders.order_by('value_date'):
                print(f"  {o.value_date}: {o.display_no} = ${o.total_usd}")
            print(f"  TOTAL ORDERS: ${orders_total}")
            
            # Payments
            from finance.models import FinanceTransaction
            payments = FinanceTransaction.objects.filter(
                dealer=dealer,
                type=FinanceTransaction.TransactionType.INCOME,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                date__gte=initial_date,
                date__lte=end_prior,
            )
            payments_total = sum(p.amount_usd or 0 for p in payments)
            print(f"\nPAYMENTS (Credit -):")
            for p in payments.order_by('date'):
                print(f"  {p.date}: {p.account.name if p.account else 'N/A'} = ${p.amount_usd}")
            print(f"  TOTAL PAYMENTS: ${payments_total}")
            
            # Refunds
            refunds = FinanceTransaction.objects.filter(
                dealer=dealer,
                type=FinanceTransaction.TransactionType.DEALER_REFUND,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                date__gte=initial_date,
                date__lte=end_prior,
            )
            refunds_total = sum(r.amount_usd or 0 for r in refunds)
            print(f"\nREFUNDS (Debit +):")
            for r in refunds.order_by('date'):
                print(f"  {r.date}: {r.account.name if r.account else 'N/A'} = ${r.amount_usd}")
            print(f"  TOTAL REFUNDS: ${refunds_total}")
            
            net_payments = payments_total - refunds_total
            print(f"\nNET PAYMENTS: ${payments_total} - ${refunds_total} = ${net_payments}")
            
            # Returns
            from orders.models import OrderReturn
            from returns.models import Return as ProductReturn
            
            order_returns = OrderReturn.objects.filter(
                order__dealer=dealer,
                created_at__date__gte=initial_date,
                created_at__date__lte=end_prior,
            )
            returns_total = sum(r.amount_usd or 0 for r in order_returns)
            
            product_returns = ProductReturn.objects.filter(
                dealer=dealer,
                created_at__date__gte=initial_date,
                created_at__date__lte=end_prior,
            )
            product_returns_total = sum(r.total_sum or 0 for r in product_returns)
            
            total_returns = returns_total + product_returns_total
            print(f"\nRETURNS (Credit -):")
            print(f"  Order Returns: ${returns_total}")
            print(f"  Product Returns: ${product_returns_total}")
            print(f"  TOTAL RETURNS: ${total_returns}")
            
            # Calculate opening balance
            opening_balance = initial_balance + Decimal(orders_total) - Decimal(net_payments) - Decimal(total_returns)
            
            print(f"\n{'='*60}")
            print(f"OPENING BALANCE CALCULATION:")
            print(f"{'='*60}")
            print(f"  Initial Balance:    ${initial_balance}")
            print(f"  + Orders:           ${orders_total}")
            print(f"  - Net Payments:     ${net_payments}")
            print(f"  - Returns:          ${total_returns}")
            print(f"  ─────────────────────────────")
            print(f"  = Opening Balance:  ${opening_balance}")
            print(f"\nExpected in frontend: ${opening_balance}")
