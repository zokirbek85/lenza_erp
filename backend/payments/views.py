from datetime import datetime, timedelta

from django.db import models
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAccountant, IsAdmin, IsOwner
from core.utils.exporter import export_payments_to_excel
from core.mixins.report_mixin import BaseReportMixin
from core.mixins.export_mixins import ExportMixin

from .models import CurrencyRate, Payment, PaymentCard
from .serializers import CurrencyRateSerializer, PaymentSerializer, PaymentCardSerializer


class CurrencyRateViewSet(viewsets.ModelViewSet):
    queryset = CurrencyRate.objects.all()
    serializer_class = CurrencyRateSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filterset_fields = ('rate_date',)
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering = ('-rate_date',)


class PaymentViewSet(viewsets.ModelViewSet, BaseReportMixin, ExportMixin):
    queryset = Payment.objects.select_related('dealer', 'rate', 'card').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = {
        'dealer': ['exact'],
        'currency': ['exact'],
        'method': ['exact'],
        'pay_date': ['gte', 'lte'],
    }
    search_fields = ('dealer__name', 'note')
    ordering_fields = ('pay_date', 'amount_usd', 'created_at')
    
    # BaseReportMixin configuration
    date_field = "pay_date"
    filename_prefix = "payments"
    title_prefix = "To'lovlar hisoboti"
    report_template = "payments/report.html"

    def _ensure_writer(self):
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin may modify payments.')

    def perform_create(self, serializer):
        self._ensure_writer()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_writer()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_writer()
        instance.delete()
    
    def get_report_rows(self, queryset):
        """Generate rows for payment report."""
        from decimal import Decimal
        rows = []
        for p in queryset.order_by('pay_date', 'id'):
            rows.append({
                'Sana': p.pay_date.strftime('%d.%m.%Y') if p.pay_date else '',
                'Diler': p.dealer.name if p.dealer else '',
                'Miqdor': f"{float(p.amount):,.2f}",
                'Valyuta': p.currency,
                'Usul': p.method,
                'Karta': p.card.name if p.card else '',
                'USD': f"{float(p.amount_usd):,.2f}",
                'Izoh': p.note or '',
            })
        return rows
    
    def get_report_total(self, queryset):
        """Calculate total amount in USD."""
        total = queryset.aggregate(models.Sum('amount_usd'))['amount_usd__sum'] or 0
        return total

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Unified export for payments: ?format=pdf|xlsx"""
        fmt = request.query_params.get('format', 'xlsx')
        qs = self.filter_queryset(self.get_queryset())
        rows = [{
            'Sana': (p.pay_date.isoformat() if p.pay_date else ''),
            'Diler': (p.dealer.name if p.dealer else ''),
            'Miqdor': float(p.amount),
            'Valyuta': p.currency,
            'Usul': p.method,
            'Karta': (p.card.name if p.card else ''),
            'Izoh': (p.note or ''),
        } for p in qs.order_by('pay_date', 'id')]
        if fmt == 'pdf':
            return self.render_pdf_with_qr(
                'payments/export.html',
                {'rows': rows, 'title': 'To‘lovlar hisobot'},
                'tolovlar',
                request=request,
                doc_type='payment-export',
                doc_id=None,
            )
        return self.render_xlsx(rows, 'tolovlar')


class PaymentCardViewSet(viewsets.ModelViewSet):
    queryset = PaymentCard.objects.all()
    serializer_class = PaymentCardSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = {
        'is_active': ['exact'],
    }
    search_fields = ('name', 'number', 'holder_name')
    ordering = ('-created_at',)

    def _ensure_writer(self):
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin may modify company cards.')

    def perform_create(self, serializer):
        self._ensure_writer()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_writer()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_writer()
        instance.delete()


class CurrencyRateHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = timezone.now().date() - timedelta(days=30)
        rates = CurrencyRate.objects.filter(rate_date__gte=start_date).order_by('rate_date')
        data = CurrencyRateSerializer(rates, many=True).data
        return Response(data)


class PaymentReportPDFView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        date_param = request.query_params.get('date')
        if date_param:
            try:
                report_date = datetime.fromisoformat(date_param).date()
            except ValueError:
                return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)
        else:
            report_date = timezone.now().date()
        payments = Payment.objects.select_related('dealer').filter(pay_date=report_date)
        return self.render_pdf_with_qr(
            'reports/payments_report.html',
            {
                'payments': payments,
                'report_date': report_date,
                'total': payments.aggregate(total_amount=models.Sum('amount_usd'))['total_amount'] or 0,
            },
            filename_prefix=f'payments_{report_date}',
            request=request,
            doc_type='payments-report',
            doc_id=str(report_date),
        )


class PaymentExportExcelView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        qs = Payment.objects.select_related('dealer', 'card').all().order_by('pay_date', 'id')
        rows = [{
            'Sana': (p.pay_date.isoformat() if p.pay_date else ''),
            'Diler': (p.dealer.name if p.dealer else ''),
            'Miqdor': float(p.amount),
            'Valyuta': p.currency,
            'Usul': p.method,
            'Karta': (p.card.name if p.card else ''),
            'Izoh': (p.note or ''),
        } for p in qs]
        return self.render_xlsx(rows, 'payments')
