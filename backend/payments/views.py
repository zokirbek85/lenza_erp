from datetime import datetime, timedelta

from django.db import models
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAccountant, IsAdmin, IsOwner
from core.utils.exporter import export_payments_to_excel
from core.utils.pdf import render_pdf

from .models import CurrencyRate, Payment
from .serializers import CurrencyRateSerializer, PaymentSerializer


class CurrencyRateViewSet(viewsets.ModelViewSet):
    queryset = CurrencyRate.objects.all()
    serializer_class = CurrencyRateSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filterset_fields = ('rate_date',)
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering = ('-rate_date',)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('dealer', 'rate').all()
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


class CurrencyRateHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = timezone.now().date() - timedelta(days=30)
        rates = CurrencyRate.objects.filter(rate_date__gte=start_date).order_by('rate_date')
        data = CurrencyRateSerializer(rates, many=True).data
        return Response(data)


class PaymentReportPDFView(APIView):
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
        pdf_bytes = render_pdf(
            'reports/payments_report.html',
            {
                'payments': payments,
                'report_date': report_date,
                'total': payments.aggregate(total_amount=models.Sum('amount_usd'))['total_amount'] or 0,
            },
        )
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=payments_{report_date}.pdf'
        return response


class PaymentExportExcelView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        payments = Payment.objects.select_related('dealer').all()
        file_path = export_payments_to_excel(payments)
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
