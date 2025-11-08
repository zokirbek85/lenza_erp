from django.http import HttpResponse
from django.utils.text import slugify
from django_filters import rest_framework as filters
from rest_framework import filters as drf_filters
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse
from core.utils.pdf import render_pdf
from services.reconciliation import get_reconciliation_data

from .models import Dealer, Region
from .serializers import DealerSerializer, RegionSerializer


class DealerFilter(filters.FilterSet):
    region_id = filters.NumberFilter(field_name='region_id')

    class Meta:
        model = Dealer
        fields = ('is_active', 'region_id')


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.select_related('manager_user').all()
    serializer_class = RegionSerializer
    permission_classes = [IsAdmin | IsOwner]
    filter_backends = (filters.DjangoFilterBackend, drf_filters.SearchFilter)
    filterset_fields = ('manager_user',)
    search_fields = ('name',)


class DealerViewSet(viewsets.ModelViewSet):
    queryset = Dealer.objects.select_related('region', 'manager_user').all()
    serializer_class = DealerSerializer
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner | IsWarehouse]
    filterset_class = DealerFilter
    search_fields = ('name', 'code', 'contact')
    ordering_fields = ('name', 'created_at')
    filter_backends = (filters.DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)


class DealerBalancePDFView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        dealers = Dealer.objects.select_related('region').all()
        pdf_bytes = render_pdf(
            'reports/dealer_balance.html',
            {'dealers': dealers},
        )
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename=dealer_balances.pdf'
        return response


class DealerReconciliationView(APIView):
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
        )

        def _serialize_entry(entry):
            formatted = entry.copy()
            value = formatted.get('date')
            if hasattr(value, 'isoformat'):
                formatted['date'] = value.isoformat()
            return formatted

        payload = {
            'dealer': data['dealer'],
            'dealer_code': data['dealer_code'],
            'period': data['period'],
            'opening_balance': data['opening_balance'],
            'closing_balance': data['closing_balance'],
            'orders': [_serialize_entry(order) for order in data['orders']],
            'payments': [_serialize_entry(payment) for payment in data['payments']],
            'returns': [_serialize_entry(item) for item in data['returns']],
            'movements': [_serialize_entry(item) for item in data['movements']],
            'generated_at': data['generated_at'].isoformat(),
            'from_date': data['from_date'].isoformat(),
            'to_date': data['to_date'].isoformat(),
        }
        return Response(payload)


class DealerReconciliationPDFView(APIView):
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
        )
        pdf_bytes = render_pdf(
            'reports/reconciliation.html',
            {'data': data},
        )
        dealer_slug = slugify(data['dealer']) or f'dealer-{pk}'
        statement_date = data['to_date'].strftime('%Y%m%d')
        filename = f'reconciliation_{dealer_slug}_{statement_date}.pdf'
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename=\"{filename}\"'
        return response
