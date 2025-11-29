from decimal import Decimal
from datetime import timedelta, datetime
from collections import defaultdict

from django.db.models import Avg, Sum, Count, Max, Q, F, DecimalField, Case, When, Value
from django.db.models.functions import Coalesce, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from dealers.models import Dealer, Region
from catalog.models import Product, Brand, Category
from orders.models import Order, OrderItem, OrderReturn
from payments.models import Payment, PaymentCard
from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse, IsManager

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
        payments_total = Payment.objects.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
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

        payment_filters = Q(method=Payment.Method.CARD) & Q(status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED])
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


class TopProductsAnalyticsView(APIView):
    """Returns top 10 products by total sales revenue.
    
    Query params:
    - start_date: ISO date (YYYY-MM-DD)
    - end_date: ISO date (YYYY-MM-DD)
    - region_id: filter by region
    - dealer_id: filter by dealer
    - brand_id: filter by brand
    - category_id: filter by category
    
    Returns list of dicts:
    - product_id, product_name, brand_name, category_name
    - total_qty, total_sum_usd
    """
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsManager]

    def get(self, request):
        # Parse filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        region_id = request.query_params.get('region_id')
        dealer_id = request.query_params.get('dealer_id')
        brand_id = request.query_params.get('brand_id')
        category_id = request.query_params.get('category_id')
        
        # Base queryset: active orders only
        filters = Q(order__status__in=Order.Status.active_statuses())
        
        # Apply date range
        if start_date:
            filters &= Q(order__value_date__gte=start_date)
        if end_date:
            filters &= Q(order__value_date__lte=end_date)
        
        # Apply region filter
        if region_id:
            filters &= Q(order__dealer__region_id=region_id)
        
        # Apply dealer filter
        if dealer_id:
            filters &= Q(order__dealer_id=dealer_id)
        
        # Apply brand filter
        if brand_id:
            filters &= Q(product__brand_id=brand_id)
        
        # Apply category filter
        if category_id:
            filters &= Q(product__category_id=category_id)
        
        # Role-based filtering
        user = request.user
        if hasattr(user, 'role'):
            if user.role == 'manager':
                # Manager sees only their assigned dealers
                managed_dealers = Dealer.objects.filter(manager_user=user)
                filters &= Q(order__dealer__in=managed_dealers)
            elif user.role == 'sales':
                # Sales sees only their own orders
                filters &= Q(order__created_by=user)
        
        # Aggregate top products
        top_products = (
            OrderItem.objects.filter(filters)
            .select_related('product__brand', 'product__category')
            .values(
                'product_id',
                'product__name',
                'product__brand__name',
                'product__category__name'
            )
            .annotate(
                total_qty=Sum('qty'),
                total_sum_usd=Sum(
                    F('qty') * F('price_usd'),
                    output_field=DecimalField(max_digits=18, decimal_places=2)
                )
            )
            .order_by('-total_sum_usd')[:10]
        )
        
        data = [
            {
                'product_id': item['product_id'],
                'product_name': item['product__name'],
                'brand_name': item['product__brand__name'] or '',
                'category_name': item['product__category__name'] or '',
                'total_qty': float(item['total_qty'] or 0),
                'total_sum_usd': float(item['total_sum_usd'] or 0),
            }
            for item in top_products
        ]
        
        return Response(data)


class RegionProductAnalyticsView(APIView):
    """Returns region -> product sales mapping.
    
    Query params: same as TopProductsAnalyticsView
    
    Returns list of dicts:
    - region_id, region_name
    - products: list of {product_id, product_name, total_sum_usd}
    """
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsManager]

    def get(self, request):
        # Parse filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        region_id = request.query_params.get('region_id')
        dealer_id = request.query_params.get('dealer_id')
        brand_id = request.query_params.get('brand_id')
        category_id = request.query_params.get('category_id')
        
        # Base queryset
        filters = Q(order__status__in=Order.Status.active_statuses())
        filters &= Q(order__dealer__region__isnull=False)  # Only orders with region
        
        if start_date:
            filters &= Q(order__value_date__gte=start_date)
        if end_date:
            filters &= Q(order__value_date__lte=end_date)
        if region_id:
            filters &= Q(order__dealer__region_id=region_id)
        if dealer_id:
            filters &= Q(order__dealer_id=dealer_id)
        if brand_id:
            filters &= Q(product__brand_id=brand_id)
        if category_id:
            filters &= Q(product__category_id=category_id)
        
        # Role-based filtering
        user = request.user
        if hasattr(user, 'role'):
            if user.role == 'manager':
                managed_dealers = Dealer.objects.filter(manager_user=user)
                filters &= Q(order__dealer__in=managed_dealers)
            elif user.role == 'sales':
                filters &= Q(order__created_by=user)
        
        # Get region-product combinations
        region_products = (
            OrderItem.objects.filter(filters)
            .select_related('order__dealer__region', 'product')
            .values(
                'order__dealer__region_id',
                'order__dealer__region__name',
                'product_id',
                'product__name'
            )
            .annotate(
                total_sum_usd=Sum(
                    F('qty') * F('price_usd'),
                    output_field=DecimalField(max_digits=18, decimal_places=2)
                )
            )
            .order_by('order__dealer__region__name', '-total_sum_usd')
        )
        
        # Group by region
        regions_map = defaultdict(lambda: {'products': []})
        for item in region_products:
            region_id = item['order__dealer__region_id']
            region_name = item['order__dealer__region__name']
            
            if region_id not in regions_map:
                regions_map[region_id]['region_id'] = region_id
                regions_map[region_id]['region_name'] = region_name
            
            regions_map[region_id]['products'].append({
                'product_id': item['product_id'],
                'product_name': item['product__name'],
                'total_sum_usd': float(item['total_sum_usd'] or 0),
            })
        
        # Convert to list and limit products per region to top 5
        data = []
        for region_data in regions_map.values():
            region_data['products'] = region_data['products'][:5]
            data.append(region_data)
        
        # Sort regions by total sales
        data.sort(key=lambda x: sum(p['total_sum_usd'] for p in x['products']), reverse=True)
        
        return Response(data)


class ProductTrendAnalyticsView(APIView):
    """Returns monthly or weekly product sales trend.
    
    Query params:
    - start_date, end_date, region_id, dealer_id, brand_id, category_id
    - period: 'month' (default) or 'week'
    - limit: max number of products to show (default 5)
    
    Returns list of dicts:
    - period: ISO date string (first day of month/week)
    - products: list of {product_id, product_name, total_sum_usd}
    """
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsManager]

    def get(self, request):
        # Parse filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        region_id = request.query_params.get('region_id')
        dealer_id = request.query_params.get('dealer_id')
        brand_id = request.query_params.get('brand_id')
        category_id = request.query_params.get('category_id')
        period = request.query_params.get('period', 'month')
        limit = int(request.query_params.get('limit', '5'))
        
        # Base queryset
        filters = Q(order__status__in=Order.Status.active_statuses())
        
        if start_date:
            filters &= Q(order__value_date__gte=start_date)
        if end_date:
            filters &= Q(order__value_date__lte=end_date)
        if region_id:
            filters &= Q(order__dealer__region_id=region_id)
        if dealer_id:
            filters &= Q(order__dealer_id=dealer_id)
        if brand_id:
            filters &= Q(product__brand_id=brand_id)
        if category_id:
            filters &= Q(product__category_id=category_id)
        
        # Role-based filtering
        user = request.user
        if hasattr(user, 'role'):
            if user.role == 'manager':
                managed_dealers = Dealer.objects.filter(manager_user=user)
                filters &= Q(order__dealer__in=managed_dealers)
            elif user.role == 'sales':
                filters &= Q(order__created_by=user)
        
        # Choose truncation function
        trunc_func = TruncMonth if period == 'month' else TruncWeek
        
        # Get trend data
        trend_data = (
            OrderItem.objects.filter(filters)
            .annotate(period=trunc_func('order__value_date'))
            .values('period', 'product_id', 'product__name')
            .annotate(
                total_sum_usd=Sum(
                    F('qty') * F('price_usd'),
                    output_field=DecimalField(max_digits=18, decimal_places=2)
                )
            )
            .order_by('period', '-total_sum_usd')
        )
        
        # Group by period
        periods_map = defaultdict(lambda: {'products': []})
        for item in trend_data:
            period_key = item['period'].date().isoformat()
            
            if period_key not in periods_map:
                periods_map[period_key]['period'] = period_key
            
            periods_map[period_key]['products'].append({
                'product_id': item['product_id'],
                'product_name': item['product__name'],
                'total_sum_usd': float(item['total_sum_usd'] or 0),
            })
        
        # Limit products per period and convert to list
        data = []
        for period_data in periods_map.values():
            period_data['products'] = period_data['products'][:limit]
            data.append(period_data)
        
        # Sort by period
        data.sort(key=lambda x: x['period'])
        
        return Response(data)


class TopCategoriesAnalyticsView(APIView):
    """Returns top product categories by sales revenue.
    
    Query params: same as TopProductsAnalyticsView
    
    Returns list of dicts:
    - category_id, category_name
    - total_sum_usd, percentage
    """
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsManager]

    def get(self, request):
        # Parse filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        region_id = request.query_params.get('region_id')
        dealer_id = request.query_params.get('dealer_id')
        brand_id = request.query_params.get('brand_id')
        category_id = request.query_params.get('category_id')
        
        # Base queryset
        filters = Q(order__status__in=Order.Status.active_statuses())
        filters &= Q(product__category__isnull=False)  # Only items with category
        
        if start_date:
            filters &= Q(order__value_date__gte=start_date)
        if end_date:
            filters &= Q(order__value_date__lte=end_date)
        if region_id:
            filters &= Q(order__dealer__region_id=region_id)
        if dealer_id:
            filters &= Q(order__dealer_id=dealer_id)
        if brand_id:
            filters &= Q(product__brand_id=brand_id)
        if category_id:
            filters &= Q(product__category_id=category_id)
        
        # Role-based filtering
        user = request.user
        if hasattr(user, 'role'):
            if user.role == 'manager':
                managed_dealers = Dealer.objects.filter(manager_user=user)
                filters &= Q(order__dealer__in=managed_dealers)
            elif user.role == 'sales':
                filters &= Q(order__created_by=user)
        
        # Aggregate by category
        categories = (
            OrderItem.objects.filter(filters)
            .values(
                'product__category_id',
                'product__category__name'
            )
            .annotate(
                total_sum_usd=Sum(
                    F('qty') * F('price_usd'),
                    output_field=DecimalField(max_digits=18, decimal_places=2)
                )
            )
            .order_by('-total_sum_usd')
        )
        
        # Calculate total for percentage
        total_sales = sum(float(c['total_sum_usd'] or 0) for c in categories)
        
        data = [
            {
                'category_id': item['product__category_id'],
                'category_name': item['product__category__name'],
                'total_sum_usd': float(item['total_sum_usd'] or 0),
                'percentage': round((float(item['total_sum_usd'] or 0) / total_sales * 100), 2) if total_sales > 0 else 0,
            }
            for item in categories
        ]
        
        return Response(data)


class TopDealersAnalyticsView(APIView):
    """Returns top dealers by sales revenue.
    
    Query params: same as TopProductsAnalyticsView
    
    Returns list of dicts:
    - dealer_id, dealer_name, region_name
    - total_sum_usd, orders_count
    """
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsManager]

    def get(self, request):
        # Parse filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        region_id = request.query_params.get('region_id')
        dealer_id = request.query_params.get('dealer_id')
        brand_id = request.query_params.get('brand_id')
        category_id = request.query_params.get('category_id')
        limit = int(request.query_params.get('limit', '10'))
        
        # Base queryset
        filters = Q(status__in=Order.Status.active_statuses())
        
        if start_date:
            filters &= Q(value_date__gte=start_date)
        if end_date:
            filters &= Q(value_date__lte=end_date)
        if region_id:
            filters &= Q(dealer__region_id=region_id)
        if dealer_id:
            filters &= Q(dealer_id=dealer_id)
        
        # Brand/category filters require join to OrderItem
        if brand_id or category_id:
            item_filters = Q()
            if brand_id:
                item_filters &= Q(items__product__brand_id=brand_id)
            if category_id:
                item_filters &= Q(items__product__category_id=category_id)
            filters &= item_filters
        
        # Role-based filtering
        user = request.user
        if hasattr(user, 'role'):
            if user.role == 'manager':
                managed_dealers = Dealer.objects.filter(manager_user=user)
                filters &= Q(dealer__in=managed_dealers)
            elif user.role == 'sales':
                filters &= Q(created_by=user)
        
        # Aggregate by dealer
        top_dealers = (
            Order.objects.filter(filters)
            .select_related('dealer__region')
            .values(
                'dealer_id',
                'dealer__name',
                'dealer__region__name'
            )
            .annotate(
                total_sum_usd=Sum('total_usd'),
                orders_count=Count('id', distinct=True)
            )
            .order_by('-total_sum_usd')[:limit]
        )
        
        data = [
            {
                'dealer_id': item['dealer_id'],
                'dealer_name': item['dealer__name'],
                'region_name': item['dealer__region__name'] or '',
                'total_sum_usd': float(item['total_sum_usd'] or 0),
                'orders_count': item['orders_count'],
            }
            for item in top_dealers
        ]
        
        return Response(data)
