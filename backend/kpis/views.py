from decimal import Decimal
from datetime import timedelta, datetime
from collections import defaultdict

from django.db.models import (
    Avg, Sum, Count, Max, Q, F, DecimalField, Case, When, Value,
    OuterRef, Subquery, ExpressionWrapper
)
from django.db.models.functions import Coalesce, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from dealers.models import Dealer, Region
from catalog.models import Product, Brand, Category
from orders.models import Order, OrderItem, OrderReturn
from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse, IsManager

from finance.models import FinanceTransaction, ExchangeRate
from .models import KPIRecord
from .serializers import KPIRecordSerializer, ManagerKPIOverviewSerializer, KPILeaderboardSerializer


def parse_category_ids(categories_param):
    """
    Parse categories parameter into list of integers.
    Accepts comma-separated category IDs: "1,3,7" or "1, 3, 7"
    Returns empty list if None or invalid.
    """
    if not categories_param:
        return []
    try:
        return [int(cat_id.strip()) for cat_id in categories_param.split(',') if cat_id.strip()]
    except (ValueError, AttributeError):
        return []


class KPIRecordViewSet(viewsets.ModelViewSet):
    queryset = KPIRecord.objects.select_related('dealer').all()
    serializer_class = KPIRecordSerializer
    permission_classes = [IsAdmin | IsOwner]
    filterset_fields = ('dealer', 'name')


class OwnerKPIView(APIView):
    permission_classes = [IsAdmin | IsOwner | IsAccountant]

    def get(self, request):
        active_orders = Order.objects.filter(status__in=Order.Status.active_statuses(), is_imported=False)
        sales_total = active_orders.aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
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
    """
    Sales Manager KPI View with date range filtering.
    
    Query params:
    - from_date: Start date (YYYY-MM-DD). Defaults to first day of current month.
    - to_date: End date (YYYY-MM-DD). Defaults to today.
    
    Returns sales, payments, dealers count, regional breakdown, top dealers, and top categories.
    """
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request):
        from datetime import datetime
        
        user = request.user
        today = timezone.now().date()
        
        # Parse date parameters with fallback to current month
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        
        # Set default: first day of current month to today
        if from_date_str:
            try:
                from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                from_date = today.replace(day=1)
        else:
            from_date = today.replace(day=1)
        
        if to_date_str:
            try:
                to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                to_date = today
        else:
            to_date = today
        
        # Ensure from_date is not after to_date
        if from_date > to_date:
            from_date, to_date = to_date, from_date
        
        # Get manager's dealers (only those included in KPI)
        manager_dealers = Dealer.objects.filter(
            manager_user=user,
            include_in_manager_kpi=True
        )
        dealer_ids = list(manager_dealers.values_list('id', flat=True))
        
        # Filter orders by date range and manager's dealers
        confirmed_statuses = [
            Order.Status.CONFIRMED,
            Order.Status.PACKED,
            Order.Status.SHIPPED,
            Order.Status.DELIVERED,
        ]
        
        user_orders = Order.objects.filter(
            dealer_id__in=dealer_ids,
            status__in=confirmed_statuses,
            is_imported=False,
            value_date__gte=from_date,
            value_date__lte=to_date
        ).select_related('dealer__region')
        
        # Calculate sales metrics
        sales_total = user_orders.aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
        
        # Get payments in date range
        payments_total = FinanceTransaction.objects.filter(
            dealer_id__in=dealer_ids,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            created_at__date__gte=from_date,
            created_at__date__lte=to_date
        ).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
        
        # Regional breakdown
        regional_sales = user_orders.values('dealer__region__name').annotate(
            total_usd=Sum('total_usd')
        ).order_by('-total_usd')
        
        # Top dealers
        top_dealers = user_orders.values('dealer__name').annotate(
            total_usd=Sum('total_usd')
        ).order_by('-total_usd')[:10]
        
        # Top categories by total sales amount
        top_categories = (
            OrderItem.objects.filter(
                order__in=user_orders,
                order__status__in=confirmed_statuses
            )
            .exclude(product__category__isnull=True)
            .values('product__category__name')
            .annotate(
                total_amount=Sum(
                    F('qty') * F('price_usd'),
                    output_field=DecimalField(max_digits=18, decimal_places=2)
                )
            )
            .order_by('-total_amount')[:5]
        )

        data = {
            'my_sales_usd': float(sales_total),
            'my_payments_usd': float(payments_total),
            'my_dealers_count': manager_dealers.count(),
            'my_regions': [
                {
                    'region': item['dealer__region__name'] or 'Unknown',
                    'total_usd': float(item['total_usd'] or 0)
                }
                for item in regional_sales
            ],
            'my_top_dealers': [
                {
                    'dealer': item['dealer__name'],
                    'total_usd': float(item['total_usd'] or 0)
                }
                for item in top_dealers
            ],
            'top_categories': [
                {
                    'category': item['product__category__name'],
                    'amount': float(item['total_amount'] or 0)
                }
                for item in top_categories
            ],
        }
        return Response(data)


class SalesManagerKPIDetailView(APIView):
    """
    Sales Manager KPI Detail View - provides detailed dealer breakdown for PDF export.
    
    Query params:
    - from_date: Start date (YYYY-MM-DD). Defaults to first day of current month.
    - to_date: End date (YYYY-MM-DD). Defaults to today.
    - manager_id: Manager ID (optional). If provided and user is admin, shows that manager's data.
    
    Returns detailed breakdown by dealer with sales, payments by type, and KPI calculation.
    """
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request):
        from datetime import datetime
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        user = request.user
        today = timezone.now().date()
        
        # Get manager_id parameter for admin users
        manager_id = request.query_params.get('manager_id')
        if manager_id and user.role == 'admin':
            try:
                target_manager = User.objects.get(id=manager_id)
            except User.DoesNotExist:
                target_manager = user
        else:
            target_manager = user
        
        # Parse date parameters
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        
        if from_date_str:
            try:
                from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                from_date = today.replace(day=1)
        else:
            from_date = today.replace(day=1)
        
        if to_date_str:
            try:
                to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                to_date = today
        else:
            to_date = today
        
        if from_date > to_date:
            from_date, to_date = to_date, from_date
        
        # Get manager info
        manager_name = target_manager.get_full_name() or target_manager.username
        
        # Get manager's current dealers (only those included in KPI)
        current_dealers = Dealer.objects.filter(
            manager_user=target_manager,
            include_in_manager_kpi=True
        ).select_related('region')
        dealer_ids = list(current_dealers.values_list('id', flat=True))
        
        # Check for manager replacements
        from users.models import UserReplacement
        
        replacement_as_new = UserReplacement.objects.filter(
            new_user=target_manager,
            replacement_date__lte=to_date
        ).order_by('-replacement_date').first()
        
        if replacement_as_new and replacement_as_new.replacement_date > from_date:
            effective_from_date = max(from_date, replacement_as_new.replacement_date)
        else:
            effective_from_date = from_date
        
        # Get regions for title
        unique_regions = sorted(set([r for r in current_dealers.values_list('region__name', flat=True).distinct() if r]))
        if len(unique_regions) == 0:
            regions_str = 'Unknown'
        elif len(unique_regions) == 1:
            regions_str = unique_regions[0]
        elif len(unique_regions) == 2:
            regions_str = f"{unique_regions[0]} va {unique_regions[1]}"
        else:
            # Multiple regions: "Region1, Region2, Region3 va Region4"
            regions_str = ', '.join(unique_regions[:-1]) + ' va ' + unique_regions[-1]
        
        # Filter orders by date range
        confirmed_statuses = [
            Order.Status.CONFIRMED,
            Order.Status.PACKED,
            Order.Status.SHIPPED,
            Order.Status.DELIVERED,
        ]
        
        # Sales by dealer
        dealer_sales = Order.objects.filter(
            dealer_id__in=dealer_ids,
            status__in=confirmed_statuses,
            is_imported=False,
            value_date__gte=effective_from_date,
            value_date__lte=to_date
        ).values('dealer__id', 'dealer__name').annotate(
            sales_usd=Sum('total_usd')
        )
        
        # Payments by dealer and account type
        dealer_payments = FinanceTransaction.objects.filter(
            dealer_id__in=dealer_ids,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date__gte=effective_from_date,
            date__lte=to_date
        ).values('dealer__id', 'dealer__name', 'account__type').annotate(
            payment_usd=Sum('amount_usd')
        )
        
        # Organize data by dealer
        dealer_data_map = {}
        
        # Add sales data
        for item in dealer_sales:
            dealer_id = item['dealer__id']
            dealer_data_map[dealer_id] = {
                'dealer_name': item['dealer__name'],
                'sales_usd': float(item['sales_usd'] or 0),
                'payment_cash_usd': 0,
                'payment_card_usd': 0,
                'payment_bank_usd': 0,
            }
        
        # Add payment data by account type
        for item in dealer_payments:
            dealer_id = item['dealer__id']
            if dealer_id not in dealer_data_map:
                dealer_data_map[dealer_id] = {
                    'dealer_name': item['dealer__name'],
                    'sales_usd': 0,
                    'payment_cash_usd': 0,
                    'payment_card_usd': 0,
                    'payment_bank_usd': 0,
                }
            
            account_type = item['account__type']
            payment_amount = float(item['payment_usd'] or 0)
            
            # Include all payment types, even if account_type is None or unknown
            if account_type == 'cash':
                dealer_data_map[dealer_id]['payment_cash_usd'] += payment_amount
            elif account_type == 'card':
                dealer_data_map[dealer_id]['payment_card_usd'] += payment_amount
            elif account_type == 'bank':
                dealer_data_map[dealer_id]['payment_bank_usd'] += payment_amount
            else:
                # If account type is null or unknown, add to cash by default
                dealer_data_map[dealer_id]['payment_cash_usd'] += payment_amount
        
        # Calculate totals and KPI for each dealer
        dealers_list = []
        for dealer_id, data in dealer_data_map.items():
            total_payment = data['payment_cash_usd'] + data['payment_card_usd'] + data['payment_bank_usd']
            kpi_amount = total_payment * 0.01  # 1% KPI
            
            dealers_list.append({
                'dealer_name': data['dealer_name'],
                'sales_usd': data['sales_usd'],
                'payment_cash_usd': data['payment_cash_usd'],
                'payment_card_usd': data['payment_card_usd'],
                'payment_bank_usd': data['payment_bank_usd'],
                'total_payment_usd': total_payment,
                'kpi_usd': kpi_amount,
            })
        
        # Sort by sales descending
        dealers_list.sort(key=lambda x: x['sales_usd'], reverse=True)
        
        # Calculate grand totals
        totals = {
            'sales_usd': sum(d['sales_usd'] for d in dealers_list),
            'payment_cash_usd': sum(d['payment_cash_usd'] for d in dealers_list),
            'payment_card_usd': sum(d['payment_card_usd'] for d in dealers_list),
            'payment_bank_usd': sum(d['payment_bank_usd'] for d in dealers_list),
            'total_payment_usd': sum(d['total_payment_usd'] for d in dealers_list),
            'kpi_usd': sum(d['kpi_usd'] for d in dealers_list),
        }
        
        response_data = {
            'manager_name': manager_name,
            'regions': regions_str,
            'from_date': from_date.isoformat(),
            'to_date': to_date.isoformat(),
            'dealers': dealers_list,
            'totals': totals,
        }
        
        return Response(response_data)


class AccountantKPIView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        active_orders = Order.objects.filter(status__in=Order.Status.active_statuses(), is_imported=False)
        sales_total = active_orders.aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
        returns_total = OrderReturn.objects.filter(order__is_imported=False).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
        net_profit = sales_total - returns_total

        data = {
            'sales_total_usd': float(sales_total),
            'returns_total_usd': float(returns_total),
            'net_profit_usd': float(net_profit),
        }
        return Response(data)


class CardKPIView(APIView):
    """Card KPI - removed as payment cards are no longer available"""
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        return Response({'message': 'Card KPI removed - payment module no longer available'})


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
    - category_id: filter by single category (deprecated, use categories)
    - categories: comma-separated category IDs (e.g., "1,3,7")
    
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
        categories_param = request.query_params.get('categories')
        
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
        
        # Apply category filter (multiple categories support)
        category_ids = parse_category_ids(categories_param)
        if category_ids:
            filters &= Q(product__category_id__in=category_ids)
        elif category_id:
            # Backward compatibility with single category_id
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


class TopCategoriesAnalyticsView(APIView):
    """Returns top categories with their top products.
    
    Query params:
    - start_date: ISO date (YYYY-MM-DD)
    - end_date: ISO date (YYYY-MM-DD)
    - region_id: filter by region
    - dealer_id: filter by dealer
    - brand_id: filter by brand
    - categories: comma-separated category IDs
    
    Returns:
    {
      "topCategories": [
        {
          "category": "Category Name",
          "category_id": 1,
          "total_qty": 9420,
          "total_usd": 45800.50,
          "products": [
            {"name": "Product 1", "qty": 414, "total_usd": 2237.00},
            {"name": "Product 2", "qty": 297, "total_usd": 1041.00}
          ]
        }
      ]
    }
    """
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsManager]

    def get(self, request):
        # Parse filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        region_id = request.query_params.get('region_id')
        dealer_id = request.query_params.get('dealer_id')
        brand_id = request.query_params.get('brand_id')
        categories_param = request.query_params.get('categories')
        
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
        category_ids = parse_category_ids(categories_param)
        if category_ids:
            filters &= Q(product__category_id__in=category_ids)
        
        # Role-based filtering
        user = request.user
        if hasattr(user, 'role'):
            if user.role == 'manager':
                managed_dealers = Dealer.objects.filter(manager_user=user)
                filters &= Q(order__dealer__in=managed_dealers)
            elif user.role == 'sales':
                # Sales manager sees orders from their dealers (only those included in KPI)
                managed_dealers = Dealer.objects.filter(
                    manager_user=user,
                    include_in_manager_kpi=True
                )
                filters &= Q(order__dealer__in=managed_dealers)
        
        # Step 1: Aggregate by category
        category_stats = (
            OrderItem.objects.filter(filters)
            .exclude(product__category__isnull=True)
            .values(
                'product__category_id',
                'product__category__name'
            )
            .annotate(
                total_qty=Sum('qty'),
                total_usd=Sum(
                    F('qty') * F('price_usd'),
                    output_field=DecimalField(max_digits=18, decimal_places=2)
                )
            )
            .order_by('-total_usd')[:10]  # Top 10 categories
        )
        
        # Step 2: For each category, get top 5 products
        result = []
        for cat_stat in category_stats:
            category_id = cat_stat['product__category_id']
            category_name = cat_stat['product__category__name']
            
            # Get top 5 products in this category
            category_filters = filters & Q(product__category_id=category_id)
            top_products = (
                OrderItem.objects.filter(category_filters)
                .values('product__name')
                .annotate(
                    qty=Sum('qty'),
                    total_usd=Sum(
                        F('qty') * F('price_usd'),
                        output_field=DecimalField(max_digits=18, decimal_places=2)
                    )
                )
                .order_by('-total_usd')[:5]
            )
            
            products_list = [
                {
                    'name': p['product__name'],
                    'qty': float(p['qty'] or 0),
                    'total_usd': float(p['total_usd'] or 0),
                }
                for p in top_products
            ]
            
            result.append({
                'category': category_name,
                'category_id': category_id,
                'total_qty': float(cat_stat['total_qty'] or 0),
                'total_usd': float(cat_stat['total_usd'] or 0),
                'products': products_list,
            })
        
        return Response({'topCategories': result})


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
        categories_param = request.query_params.get('categories')
        
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
        
        # Apply category filter (multiple categories support)
        category_ids = parse_category_ids(categories_param)
        if category_ids:
            filters &= Q(product__category_id__in=category_ids)
        elif category_id:
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
        try:
            # Parse filters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            region_id = request.query_params.get('region_id')
            dealer_id = request.query_params.get('dealer_id')
            brand_id = request.query_params.get('brand_id')
            category_id = request.query_params.get('category_id')
            categories_param = request.query_params.get('categories')
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
            
            # Apply category filter (multiple categories support)
            category_ids = parse_category_ids(categories_param)
            if category_ids:
                filters &= Q(product__category_id__in=category_ids)
            elif category_id:
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
                # Skip items with no period (shouldn't happen, but handle gracefully)
                if not item['period']:
                    continue
                    
                # TruncMonth/TruncWeek already returns date object, not datetime
                period_key = item['period'].isoformat()
                
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
        except Exception as e:
            # Log error and return empty data instead of 500
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Product trend analytics error: {str(e)}", exc_info=True)
            return Response({'data': [], 'error': str(e)}, status=200)


class TopCategoriesSummaryView(APIView):
    """Returns top product categories by sales revenue (summary only, without products).
    
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
        categories_param = request.query_params.get('categories')
        
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
        
        # Apply category filter (multiple categories support)
        category_ids = parse_category_ids(categories_param)
        if category_ids:
            filters &= Q(product__category_id__in=category_ids)
        elif category_id:
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
        categories_param = request.query_params.get('categories')
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
        category_ids = parse_category_ids(categories_param)
        if brand_id or category_ids or category_id:
            item_filters = Q()
            if brand_id:
                item_filters &= Q(items__product__brand_id=brand_id)
            if category_ids:
                item_filters &= Q(items__product__category_id__in=category_ids)
            elif category_id:
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


class ManagerKPIOverviewView(APIView):
    """
    Manager KPI Overview - optimized for performance with annotations.
    Shows sales, payments, bonus, regional breakdown, top products, and trends.
    
    GET /api/kpi/manager/<id>/overview/?from_date=2025-01-01&to_date=2025-12-31
    """
    permission_classes = [IsAdmin | IsOwner | IsSales]
    
    def get(self, request, manager_id):
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get manager
        try:
            manager = User.objects.get(id=manager_id, role='sales')
        except User.DoesNotExist:
            return Response({'error': 'Manager not found'}, status=404)
        
        # Parse dates
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            try:
                from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
            except ValueError:
                from_date = timezone.now().date().replace(day=1)
        else:
            from_date = timezone.now().date().replace(day=1)
        
        if to_date:
            try:
                to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                to_date = timezone.now().date()
        else:
            to_date = timezone.now().date()
        
        # Get manager's current dealers (only those included in KPI)
        current_dealers = Dealer.objects.filter(
            manager_user=manager,
            include_in_manager_kpi=True
        )
        dealer_ids = list(current_dealers.values_list('id', flat=True))
        
        # Check for manager replacements within the period
        from users.models import UserReplacement
        
        # Find if this manager replaced someone (new_user=manager)
        replacement_as_new = UserReplacement.objects.filter(
            new_user=manager,
            replacement_date__lte=to_date
        ).order_by('-replacement_date').first()
        
        # If manager is a replacement, adjust from_date
        if replacement_as_new and replacement_as_new.replacement_date > from_date:
            # This manager only counts from replacement_date onwards
            effective_from_date = max(from_date, replacement_as_new.replacement_date)
        else:
            effective_from_date = from_date
        
        # Orders: confirmed or higher status, not imported
        confirmed_statuses = [
            Order.Status.CONFIRMED,
            Order.Status.PACKED,
            Order.Status.SHIPPED,
            Order.Status.DELIVERED,
        ]
        
        orders_qs = Order.objects.filter(
            dealer_id__in=dealer_ids,
            status__in=confirmed_statuses,
            is_imported=False,
            value_date__gte=effective_from_date,
            value_date__lte=to_date
        ).select_related('dealer__region')
        
        # Calculate total sales (use stored exchange rates)
        sales_agg = orders_qs.aggregate(
            total_usd=Coalesce(Sum('total_usd'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2))),
            total_uzs=Coalesce(Sum('total_uzs'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
        )
        
        # Payments: approved only
        payments_qs = FinanceTransaction.objects.filter(
            dealer_id__in=dealer_ids,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            date__gte=effective_from_date,
            date__lte=to_date
        )
        
        payments_agg = payments_qs.aggregate(
            total_usd=Coalesce(Sum('amount_usd'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2))),
            total_uzs=Coalesce(Sum('amount_uzs'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
        )
        
        # Bonus = payments × 0.01 (1%)
        bonus_usd = (payments_agg['total_usd'] * Decimal('0.01')).quantize(Decimal('0.01'))
        
        # Calculate bonus_uzs using each payment's exchange rate on payment date
        payments_with_bonus = payments_qs.annotate(
            # Get exchange rate on or before payment date
            payment_exchange_rate=Coalesce(
                Subquery(
                    ExchangeRate.objects.filter(
                        rate_date__lte=OuterRef('date')
                    ).order_by('-rate_date').values('usd_to_uzs')[:1]
                ),
                Value(Decimal('12800'), output_field=DecimalField(max_digits=12, decimal_places=2))
            )
        ).annotate(
            # Calculate bonus for each payment: amount_usd × 0.01 × exchange_rate
            payment_bonus_uzs=ExpressionWrapper(
                F('amount_usd') * Decimal('0.01') * F('payment_exchange_rate'),
                output_field=DecimalField(max_digits=18, decimal_places=2)
            )
        )
        
        # Sum all payment bonuses
        bonus_uzs_result = payments_with_bonus.aggregate(
            total_bonus=Coalesce(
                Sum('payment_bonus_uzs'),
                Value(Decimal('0'), output_field=DecimalField(max_digits=18, decimal_places=2))
            )
        )
        bonus_uzs = bonus_uzs_result['total_bonus'].quantize(Decimal('0.01'))
        
        # Sales by region
        sales_by_region = (
            orders_qs
            .values(region_name=F('dealer__region__name'))
            .annotate(
                total_usd=Coalesce(Sum('total_usd'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
            )
            .order_by('-total_usd')
        )
        
        # Top products (by quantity)
        top_products = (
            OrderItem.objects.filter(order__in=orders_qs)
            .values(
                product_name=F('product__name'),
                product_sku=F('product__sku')
            )
            .annotate(
                total_quantity=Sum('qty'),
                total_amount=Coalesce(
                    Sum(F('qty') * F('price_usd'), output_field=DecimalField(max_digits=18, decimal_places=2)),
                    Value(0, output_field=DecimalField(max_digits=18, decimal_places=2))
                )
            )
            .order_by('-total_quantity')[:10]
        )
        
        # Weekly sales trend
        weekly_sales = (
            orders_qs
            .annotate(week=TruncWeek('value_date'))
            .values('week')
            .annotate(
                total_usd=Coalesce(Sum('total_usd'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
            )
            .order_by('week')
        )
        
        # Monthly payments
        monthly_payments = (
            payments_qs
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(
                total_usd=Coalesce(Sum('amount_usd'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
            )
            .order_by('month')
        )
        
        # Dealer counts
        total_dealers = current_dealers.count()
        active_dealers = current_dealers.filter(is_active=True).count()
        
        # Build response
        data = {
            'manager_id': manager.id,
            'manager_name': manager.get_full_name() or manager.username,
            'total_sales_usd': sales_agg['total_usd'],
            'total_sales_uzs': sales_agg['total_uzs'],
            'total_payments_usd': payments_agg['total_usd'],
            'total_payments_uzs': payments_agg['total_uzs'],
            'bonus_usd': bonus_usd,
            'bonus_uzs': bonus_uzs,
            'period_start': from_date,
            'period_end': to_date,
            'sales_by_region': [
                {
                    'region': item['region_name'] or 'No Region',
                    'total_usd': float(item['total_usd'])
                }
                for item in sales_by_region
            ],
            'top_products': [
                {
                    'product_name': item['product_name'],
                    'product_sku': item['product_sku'],
                    'quantity': int(item['total_quantity']),
                    'total_amount': float(item['total_amount'])
                }
                for item in top_products
            ],
            'weekly_sales': [
                {
                    'week': item['week'].isoformat(),
                    'total_usd': float(item['total_usd'])
                }
                for item in weekly_sales
            ],
            'monthly_payments': [
                {
                    'month': item['month'].isoformat(),
                    'total_usd': float(item['total_usd'])
                }
                for item in monthly_payments
            ],
            'total_dealers': total_dealers,
            'active_dealers': active_dealers,
        }
        
        serializer = ManagerKPIOverviewSerializer(data)
        return Response(serializer.data)


class KPILeaderboardView(APIView):
    """
    KPI Leaderboard for all managers.
    Shows ranking by total sales, bonus, and debt management performance.

    GET /api/kpi/leaderboard/?from_date=2025-01-01&to_date=2025-12-31
    """
    permission_classes = [IsAdmin | IsOwner]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from dealers.services.balance import calculate_dealer_balance

        User = get_user_model()

        # Parse dates
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')

        if from_date:
            try:
                from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
            except ValueError:
                from_date = timezone.now().date().replace(day=1)
        else:
            from_date = timezone.now().date().replace(day=1)

        if to_date:
            try:
                to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                to_date = timezone.now().date()
        else:
            to_date = timezone.now().date()

        # Get all sales managers
        managers = User.objects.filter(role='sales')

        confirmed_statuses = [
            Order.Status.CONFIRMED,
            Order.Status.PACKED,
            Order.Status.SHIPPED,
            Order.Status.DELIVERED,
        ]

        leaderboard = []

        for manager in managers:
            dealers = Dealer.objects.filter(manager_user=manager)
            dealer_ids = list(dealers.values_list('id', flat=True))

            if not dealer_ids:
                continue

            # Sales
            sales = Order.objects.filter(
                dealer_id__in=dealer_ids,
                status__in=confirmed_statuses,
                is_imported=False,
                value_date__gte=from_date,
                value_date__lte=to_date
            ).aggregate(
                total=Coalesce(Sum('total_usd'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
            )['total']

            # Payments with bonus calculation
            payments_qs = FinanceTransaction.objects.filter(
                dealer_id__in=dealer_ids,
                type=FinanceTransaction.TransactionType.INCOME,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                date__gte=from_date,
                date__lte=to_date
            )
            
            payments_with_bonus = payments_qs.annotate(
                payment_exchange_rate=Coalesce(
                    Subquery(
                        ExchangeRate.objects.filter(
                            rate_date__lte=OuterRef('date')
                        ).order_by('-rate_date').values('usd_to_uzs')[:1]
                    ),
                    Value(Decimal('12800'), output_field=DecimalField(max_digits=12, decimal_places=2))
                ),
                payment_bonus_uzs=ExpressionWrapper(
                    F('amount_usd') * Decimal('0.01') * F('payment_exchange_rate'),
                    output_field=DecimalField(max_digits=18, decimal_places=2)
                )
            )
            
            payments_agg = payments_with_bonus.aggregate(
                total_usd=Coalesce(
                    Sum('amount_usd'), 
                    Value(0, output_field=DecimalField(max_digits=18, decimal_places=2))
                ),
                total_bonus_uzs=Coalesce(
                    Sum('payment_bonus_uzs'),
                    Value(0, output_field=DecimalField(max_digits=18, decimal_places=2))
                )
            )
            
            payments = payments_agg['total_usd']
            bonus = (payments * Decimal('0.01')).quantize(Decimal('0.01'))
            bonus_uzs = payments_agg['total_bonus_uzs'].quantize(Decimal('0.01'))

            # Debt management metrics
            starting_debt = Decimal('0')
            ending_debt = Decimal('0')

            for dealer in dealers:
                # Calculate debt at period start
                start_balance = calculate_dealer_balance(dealer, as_of_date=from_date)
                starting_debt += start_balance['balance_usd']

                # Calculate debt at period end
                end_balance = calculate_dealer_balance(dealer, as_of_date=to_date)
                ending_debt += end_balance['balance_usd']

            # Debt change (negative means debt decreased = good)
            debt_change = ending_debt - starting_debt

            # Debt change percentage
            debt_change_percentage = Decimal('0')
            if starting_debt > 0:
                debt_change_percentage = ((debt_change / starting_debt) * 100).quantize(Decimal('0.01'))

            leaderboard.append({
                'manager_id': manager.id,
                'manager_name': manager.get_full_name() or manager.username,
                'total_sales_usd': sales,
                'total_payments_usd': payments,
                'bonus_usd': bonus,
                'bonus_uzs': bonus_uzs,  # ← QOSHILDI
                'dealer_count': len(dealer_ids),
                'starting_debt_usd': starting_debt,
                'ending_debt_usd': ending_debt,
                'debt_change_usd': debt_change,
                'debt_change_percentage': debt_change_percentage,
            })

        # Sort by sales descending
        leaderboard.sort(key=lambda x: x['total_sales_usd'], reverse=True)

        # Add rank
        for idx, item in enumerate(leaderboard, start=1):
            item['rank'] = idx

        data = {
            'period_start': from_date,
            'period_end': to_date,
            'managers': leaderboard,
        }

        serializer = KPILeaderboardSerializer(data)
        return Response(serializer.data)
