from decimal import Decimal
from datetime import timedelta

from django.db.models import Avg, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from dealers.models import Dealer
from catalog.models import Product
from orders.models import Order, OrderItem, OrderReturn
from payments.models import Payment
from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse

from .models import KPIRecord
from .serializers import KPIRecordSerializer


class KPIRecordViewSet(viewsets.ModelViewSet):
    queryset = KPIRecord.objects.select_related('dealer').all()
    serializer_class = KPIRecordSerializer
    permission_classes = [IsAdmin | IsOwner]
    filterset_fields = ('dealer', 'name')


class OwnerKPIView(APIView):
    permission_classes = [IsAdmin | IsOwner]

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
        low_stock = Product.objects.filter(stock_ok__lt=10).values('sku', 'name', 'stock_ok')[:20]
        defect_stock = Product.objects.filter(stock_defect__gt=0).values('sku', 'name', 'stock_defect')
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
            'top_products': [{'name': item['product__name'], 'quantity': item['total_qty']} for item in top_products],
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
