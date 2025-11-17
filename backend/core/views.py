from django.http import FileResponse
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import permissions, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.serializers import ProductSerializer
from core.permissions import IsAdmin, IsOwner
from dealers.models import Dealer
from dealers.serializers import DealerSerializer
from orders.models import Order
from orders.serializers import OrderSerializer
from payments.models import Payment
from expenses.models import Expense
from django.db import connections
from django.db.utils import OperationalError

from .config import load_config, update_config
from .middleware import AuditLog
from .utils.backup import create_backup, get_latest_backup
from .models import CompanyInfo, UserManual
from .serializers import AuditLogSerializer, CompanyInfoSerializer, UserManualSerializer


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
        })


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
