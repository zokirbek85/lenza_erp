# Manager KPI views addition

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
        
        # Get manager's dealers
        manager_dealers = Dealer.objects.filter(manager_user=manager)
        dealer_ids = list(manager_dealers.values_list('id', flat=True))
        
        # Orders: confirmed or higher status, not imported
        confirmed_statuses = [
            Order.Status.CONFIRMED,
            Order.Status.DELIVERING,
            Order.Status.DELIVERED,
        ]
        
        orders_qs = Order.objects.filter(
            dealer_id__in=dealer_ids,
            status__in=confirmed_statuses,
            is_imported=False,
            value_date__gte=from_date,
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
            date__gte=from_date,
            date__lte=to_date
        )
        
        payments_agg = payments_qs.aggregate(
            total_usd=Coalesce(Sum('amount_usd'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2))),
            total_uzs=Coalesce(Sum('amount_uzs'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
        )
        
        # Bonus = payments × 0.01 (1%)
        bonus_usd = (payments_agg['total_usd'] * Decimal('0.01')).quantize(Decimal('0.01'))
        
        # Convert bonus to UZS using current rate
        current_rate = ExchangeRate.objects.order_by('-rate_date').first()
        exchange_rate = current_rate.usd_to_uzs if current_rate else Decimal('1')
        bonus_uzs = (bonus_usd * exchange_rate).quantize(Decimal('0.01'))
        
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
                total_quantity=Sum('quantity'),
                total_amount=Coalesce(Sum('total'), Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)))
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
        total_dealers = manager_dealers.count()
        active_dealers = manager_dealers.filter(is_active=True).count()
        
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
