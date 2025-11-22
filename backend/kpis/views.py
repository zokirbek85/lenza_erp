from decimal import Decimal
from datetime import timedelta, datetime

from django.db.models import Avg, Sum, Count, Max, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from dealers.models import Dealer
from catalog.models import Product
from orders.models import Order, OrderItem, OrderReturn
from payments.models import Payment, PaymentCard
from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse

from .models import KPIRecord
from .serializers import KPIRecordSerializer


class KPIRecordViewSet(viewsets.ModelViewSet):
    queryset = KPIRecord.objects.select_related('dealer').all()
    serializer_class = KPIRecordSerializer
    permission_classes = [IsAdmin | IsOwner]
    filterset_fields = ('dealer', 'name')


class OwnerKPIView(APIView):
    permission_classes = [IsAdmin | IsOwner | IsAccountant]

    def get(self, request):
        active_orders = Order.objects.filter(status__in=Order.Status.active_statuses())
        sales_total = active_orders.aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
        payments_total = Payment.objects.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
        top_dealers = (
            active_orders.values('dealer__id', 'dealer__name')
            .annotate(total=Sum('total_usd'))
            .order_by('-total')[:5]
        )
        balances = [
            {
                'dealer': dealer.name,
                'balance_usd': float(dealer.balance_usd),
            }
            for dealer in Dealer.objects.all()
        ]
        data = {
            'total_sales_usd': float(sales_total),
            'total_payments_usd': float(payments_total),
            'top_dealers': [
                {'dealer_id': row['dealer__id'], 'dealer': row['dealer__name'], 'total_usd': float(row['total'])}
                for row in top_dealers
            ],
            'balances': balances,
        }
        return Response(data)


class WarehouseKPIView(APIView):
    permission_classes = [IsAdmin | IsWarehouse]

    def get(self, request):
        low_stock_queryset = Product.objects.filter(stock_ok__lt=10).values('sku', 'name', 'stock_ok')[:20]
        defect_stock_queryset = Product.objects.filter(stock_defect__gt=0).values('sku', 'name', 'stock_defect')
        low_stock = [
            {'sku': row['sku'], 'name': row['name'], 'stock_ok': float(row['stock_ok'])}
            for row in low_stock_queryset
        ]
        defect_stock = [
            {'sku': row['sku'], 'name': row['name'], 'stock_defect': float(row['stock_defect'])}
            for row in defect_stock_queryset
        ]
        data = {
            'low_stock': list(low_stock),
            'defect_stock': list(defect_stock),
        }
        return Response(data)


class SalesManagerKPIView(APIView):
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        current_month_start = today.replace(day=1)
        previous_month_end = current_month_start - timedelta(days=1)
        previous_month_start = previous_month_end.replace(day=1)

        user_orders = Order.objects.filter(created_by=user, status__in=Order.Status.active_statuses())
        today_total = user_orders.filter(value_date=today).aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
        current_month_total = (
            user_orders.filter(value_date__gte=current_month_start).aggregate(total=Sum('total_usd'))['total']
            or Decimal('0')
        )
        previous_month_total = (
            user_orders.filter(value_date__range=(previous_month_start, previous_month_end))
            .aggregate(total=Sum('total_usd'))['total']
            or Decimal('0')
        )
        avg_order = user_orders.aggregate(avg=Avg('total_usd'))['avg'] or Decimal('0')
        top_products = (
            OrderItem.objects.filter(order__created_by=user)
            .values('product__name')
            .annotate(total_qty=Sum('qty'))
            .order_by('-total_qty')[:5]
        )

        data = {
            'today_sales_usd': float(today_total),
            'current_month_sales_usd': float(current_month_total),
            'previous_month_sales_usd': float(previous_month_total),
            'average_order_value_usd': float(avg_order),
            'top_products': [
                {'name': item['product__name'], 'quantity': float(item['total_qty'] or 0)} for item in top_products
            ],
        }
        return Response(data)


class AccountantKPIView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        active_orders = Order.objects.filter(status__in=Order.Status.active_statuses())
        sales_total = active_orders.aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
        payments_total = Payment.objects.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
        returns_total = OrderReturn.objects.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
        outstanding = sales_total - payments_total
        net_profit = sales_total - returns_total

        data = {
            'sales_total_usd': float(sales_total),
            'payments_total_usd': float(payments_total),
            'outstanding_balance_usd': float(outstanding),
            'returns_total_usd': float(returns_total),
            'net_profit_usd': float(net_profit),
        }
        return Response(data)


class CardKPIView(APIView):
    """KPI per active PaymentCard for card payments only, with optional date range filters.

    Returns list of dicts with:
    - card_id, card_name, holder_name
    - total_amount (USD), payments_count, last_payment_date
    """
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        from_param = request.query_params.get('from')
        to_param = request.query_params.get('to')

        payment_filters = Q(method=Payment.Method.CARD)
        if from_param:
            try:
                from_date = datetime.fromisoformat(from_param).date()
                payment_filters &= Q(pay_date__gte=from_date)
            except ValueError:
                payment_filters &= Q(pay_date__gte=from_param)
        if to_param:
            try:
                to_date = datetime.fromisoformat(to_param).date()
                payment_filters &= Q(pay_date__lte=to_date)
            except ValueError:
                payment_filters &= Q(pay_date__lte=to_param)

        data = []
        for card in PaymentCard.objects.filter(is_active=True):
            card_payments = card.payments.filter(payment_filters)

            total = card_payments.aggregate(total=Sum('amount_usd'))['total'] or 0
            count = card_payments.count()
            last_date = card_payments.aggregate(last=Max('pay_date'))['last']
            
            data.append({
                'card_id': card.id,
                'card_name': card.name,
                'holder_name': card.holder_name,
                'total_amount': float(total),
                'payments_count': count,
                'last_payment_date': last_date,
            })
        
        # Sort by total_amount descending
        data.sort(key=lambda x: x['total_amount'], reverse=True)

        return Response(data)


class InventoryStatsView(APIView):
    """Returns inventory statistics: total healthy stock quantity and total value in USD.
    
    Returns:
    - total_quantity: sum of all stock_ok across all products
    - total_value_usd: sum of (stock_ok * sell_price_usd) for all products
    """
    permission_classes = [IsAdmin | IsOwner | IsWarehouse | IsAccountant]

    def get(self, request):
        from django.db.models import F, DecimalField
        from django.db.models.functions import Coalesce
        
        products = Product.objects.all()
        
        # Calculate total quantity (sum of stock_ok)
        total_quantity = products.aggregate(
            total=Coalesce(Sum('stock_ok'), Decimal('0'), output_field=DecimalField())
        )['total'] or Decimal('0')
        
        # Calculate total value (sum of stock_ok * sell_price_usd)
        total_value = products.aggregate(
            total=Coalesce(
                Sum(F('stock_ok') * F('sell_price_usd'), output_field=DecimalField()),
                Decimal('0'),
                output_field=DecimalField()
            )
        )['total'] or Decimal('0')
        
        data = {
            'total_quantity': float(total_quantity),
            'total_value_usd': float(total_value),
        }
        
        return Response(data)
