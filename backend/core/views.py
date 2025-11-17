from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db import connections
from django.db.models import Count, DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.db.utils import OperationalError
from django.http import FileResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.serializers import ProductSerializer
from core.permissions import IsAdmin, IsOwner
from dealers.models import Dealer
from dealers.serializers import DealerSerializer
from expenses.models import Expense
from orders.models import Order, OrderReturn
from orders.serializers import OrderSerializer
from payments.models import Payment

from .config import load_config, update_config
from .middleware import AuditLog
from .models import CompanyInfo, UserManual
from .serializers import (
    AuditLogSerializer,
    CompanyInfoSerializer,
    DebtAnalyticsSerializer,
    UserManualSerializer,
)
from .utils.backup import create_backup, get_latest_backup


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin | IsOwner]
    filterset_fields = ('method',)


class SystemConfigView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(load_config())

    def put(self, request):
        config = update_config(request.data)
        return Response(config)


class SystemBackupView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        latest = get_latest_backup()
        if not latest:
            latest = create_backup()
        return FileResponse(open(latest, 'rb'), as_attachment=True, filename=latest.name)


class SearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'products': [], 'dealers': [], 'orders': []})

        products = Product.objects.filter(name__icontains=query)[:10]
        dealers = Dealer.objects.filter(name__icontains=query)[:10]
        orders = Order.objects.filter(display_no__icontains=query)[:10]

        context = {'request': request}
        return Response(
            {
                'products': ProductSerializer(products, many=True, context=context).data,
                'dealers': DealerSerializer(dealers, many=True, context=context).data,
                'orders': OrderSerializer(orders, many=True, context=context).data,
            }
        )


class CompanyInfoViewSet(viewsets.ModelViewSet):
    queryset = CompanyInfo.objects.all()
    serializer_class = CompanyInfoSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return CompanyInfo.objects.all()[:1]

    def create(self, request, *args, **kwargs):
        instance = CompanyInfo.objects.first()
        if instance:
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)


def decimal_or_zero(value) -> Decimal:
    if value is None:
        return Decimal('0')
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


class DashboardSummaryView(APIView):
    """Dashboard summary statistics"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Orders statistics
        orders_today = Order.objects.filter(created_at__date=today).count()
        orders_week = Order.objects.filter(created_at__date__gte=week_ago).count()
        orders_month = Order.objects.filter(created_at__date__gte=month_ago).count()
        orders_total = Order.objects.count()

        # Payments statistics
        payments_today = Payment.objects.filter(pay_date=today).aggregate(
            total_usd=Sum('amount_usd'), total_uzs=Sum('amount_uzs')
        )
        payments_week = Payment.objects.filter(pay_date__gte=week_ago).aggregate(
            total_usd=Sum('amount_usd'), total_uzs=Sum('amount_uzs')
        )
        payments_month = Payment.objects.filter(pay_date__gte=month_ago).aggregate(
            total_usd=Sum('amount_usd'), total_uzs=Sum('amount_uzs')
        )

        # Expenses statistics
        from django.db.models import Case, When, DecimalField
        
        expenses_today = Expense.objects.filter(date=today, status='approved').aggregate(
            total_usd=Sum(
                Case(
                    When(currency='USD', then='amount'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            total_uzs=Sum(
                Case(
                    When(currency='UZS', then='amount'),
                    default=0,
                    output_field=DecimalField()
                )
            )
        )
        expenses_month = Expense.objects.filter(date__gte=month_ago, status='approved').aggregate(
            total_usd=Sum(
                Case(
                    When(currency='USD', then='amount'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            total_uzs=Sum(
                Case(
                    When(currency='UZS', then='amount'),
                    default=0,
                    output_field=DecimalField()
                )
            )
        )

        # Products and Dealers
        total_products = Product.objects.count()
        total_dealers = Dealer.objects.count()

        opening_balance = decimal_or_zero(Dealer.objects.aggregate(total=Sum('opening_balance_usd'))['total'])
        orders_total = decimal_or_zero(Order.objects.aggregate(total=Sum('total_usd'))['total'])
        payments_total = decimal_or_zero(Payment.objects.aggregate(total=Sum('amount_usd'))['total'])
        returns_total = decimal_or_zero(OrderReturn.objects.aggregate(total=Sum('amount_usd'))['total'])
        total_debt = opening_balance + orders_total - payments_total - returns_total

        return Response({
            'orders': {
                'today': orders_today,
                'week': orders_week,
                'month': orders_month,
                'total': orders_total,
            },
            'payments': {
                'today': {
                    'usd': payments_today.get('total_usd') or 0,
                    'uzs': payments_today.get('total_uzs') or 0,
                },
                'week': {
                    'usd': payments_week.get('total_usd') or 0,
                    'uzs': payments_week.get('total_uzs') or 0,
                },
                'month': {
                    'usd': payments_month.get('total_usd') or 0,
                    'uzs': payments_month.get('total_uzs') or 0,
                },
            },
            'expenses': {
                'today': {
                    'usd': expenses_today.get('total_usd') or 0,
                    'uzs': expenses_today.get('total_uzs') or 0,
                },
                'month': {
                    'usd': expenses_month.get('total_usd') or 0,
                    'uzs': expenses_month.get('total_uzs') or 0,
                },
            },
            'products': total_products,
            'dealers': total_dealers,
            'total_debt_usd': float(total_debt),
        })


class DebtAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = getattr(user, 'role', None)
        allowed_roles = {'admin', 'owner', 'accountant', 'sales'}
        if not (getattr(user, 'is_superuser', False) or role in allowed_roles):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        dealer_qs = Dealer.objects.select_related('region')
        if not getattr(user, 'is_superuser', False):
            if role == 'sales':
                dealer_qs = dealer_qs.filter(manager_user=user)
            elif role not in {'admin', 'owner', 'accountant'}:
                dealer_qs = dealer_qs.none()

        order_subquery = (
            Order.objects.filter(dealer=OuterRef('pk'))
            .values('dealer')
            .annotate(total=Sum('total_usd'))
            .values('total')[:1]
        )
        payment_subquery = (
            Payment.objects.filter(dealer=OuterRef('pk'))
            .values('dealer')
            .annotate(total=Sum('amount_usd'))
            .values('total')[:1]
        )
        return_subquery = (
            OrderReturn.objects.filter(order__dealer=OuterRef('pk'))
            .values('order__dealer')
            .annotate(total=Sum('amount_usd'))
            .values('total')[:1]
        )
        zero_value = Value(0, output_field=DecimalField(max_digits=20, decimal_places=2))

        dealers_qs = dealer_qs.annotate(
            orders_total=Coalesce(Subquery(order_subquery), zero_value),
            payments_total=Coalesce(Subquery(payment_subquery), zero_value),
            returns_total=Coalesce(Subquery(return_subquery), zero_value),
        )

        dealers = list(dealers_qs)
        dealer_ids = [dealer.id for dealer in dealers]

        by_dealers = []
        region_totals: dict[str, Decimal] = defaultdict(Decimal)
        total_debt = Decimal('0')

        for dealer in dealers:
            opening = decimal_or_zero(dealer.opening_balance_usd)
            orders_total = decimal_or_zero(dealer.orders_total)
            payments_total = decimal_or_zero(dealer.payments_total)
            returns_total = decimal_or_zero(dealer.returns_total)
            debt = opening + orders_total - payments_total - returns_total
            if debt == 0:
                continue
            total_debt += debt
            by_dealers.append({'dealer': dealer.name, 'debt': float(debt)})
            region_name = dealer.region.name if dealer.region else 'Boshqa'
            region_totals[region_name] += debt

        by_dealers.sort(key=lambda item: item['debt'], reverse=True)

        by_regions = [
            {'region': name, 'debt': float(amount)}
            for name, amount in sorted(region_totals.items(), key=lambda item: item[1], reverse=True)
        ]

        monthly_points = []
        months = []
        today = timezone.now().date().replace(day=1)
        base_total = today.year * 12 + (today.month - 1)
        for offset in range(-11, 1):
            total_months = base_total + offset
            year = total_months // 12
            month = total_months % 12 + 1
            months.append(date(year, month, 1))

        start_date = months[0]

        if dealer_ids:
            orders_monthly = (
                Order.objects.filter(dealer_id__in=dealer_ids, value_date__gte=start_date)
                .annotate(month=TruncMonth('value_date'))
                .values('month')
                .annotate(total=Sum('total_usd'))
                .order_by('month')
            )
            payments_monthly = (
                Payment.objects.filter(dealer_id__in=dealer_ids, pay_date__gte=start_date)
                .annotate(month=TruncMonth('pay_date'))
                .values('month')
                .annotate(total=Sum('amount_usd'))
                .order_by('month')
            )
            returns_monthly = (
                OrderReturn.objects.filter(order__dealer_id__in=dealer_ids, created_at__date__gte=start_date)
                .annotate(month=TruncMonth('created_at'))
                .values('month')
                .annotate(total=Sum('amount_usd'))
                .order_by('month')
            )
        else:
            orders_monthly = payments_monthly = returns_monthly = []

        def build_map(entries):
            mapping = {}
            for entry in entries:
                month_value = entry['month']
                if month_value is None:
                    continue
                mapping[month_value.strftime('%Y-%m')] = decimal_or_zero(entry['total'])
            return mapping

        orders_map = build_map(orders_monthly)
        payments_map = build_map(payments_monthly)
        returns_map = build_map(returns_monthly)

        opening_total = sum((decimal_or_zero(dealer.opening_balance_usd) for dealer in dealers), Decimal('0'))
        running_debt = opening_total

        for index, month_date in enumerate(months):
            key = month_date.strftime('%Y-%m')
            delta = orders_map.get(key, Decimal('0')) - payments_map.get(key, Decimal('0')) - returns_map.get(
                key, Decimal('0')
            )
            if index == 0:
                running_debt = opening_total + delta
            else:
                running_debt += delta
            monthly_points.append({'month': key, 'debt': float(running_debt)})

        analytics_payload = {
            'total_debt': float(total_debt if dealers else Decimal('0')),
            'by_dealers': by_dealers,
            'by_regions': by_regions,
            'monthly': monthly_points,
        }
        serializer = DebtAnalyticsSerializer(data=analytics_payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class UserManualViewSet(viewsets.ModelViewSet):
    queryset = UserManual.objects.all()
    serializer_class = UserManualSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 'admin' or superuser can see all
        if getattr(user, 'is_superuser', False) or getattr(user, 'role', None) == 'admin':
            return UserManual.objects.all()
        role = getattr(user, 'role', None)
        if role:
            return UserManual.objects.filter(role=role)
        return UserManual.objects.none()


class HealthCheckView(APIView):
    """Lightweight health endpoint for load balancers and uptime checks."""
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        status_payload = {'status': 'ok'}
        try:
            with connections['default'].cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
            status_payload['database'] = 'ok'
        except OperationalError as exc:
            status_payload['database'] = 'error'
            status_payload['error'] = str(exc)
            return Response(status_payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(status_payload)
