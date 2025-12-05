from pathlib import Path

from django.http import FileResponse, HttpResponse
from django.utils.text import slugify
from django_filters import rest_framework as filters
from rest_framework import filters as drf_filters, status
from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action

from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse
from core.utils.company_info import get_company_info
from core.mixins.export_mixins import ExportMixin
from core.utils.exporter import export_reconciliation_to_excel
from services.reconciliation import get_reconciliation_data

from .models import Dealer, Region
from .serializers import DealerSerializer, RegionSerializer
from .utils.excel_tools import (
    export_dealers_to_excel,
    generate_dealer_import_template,
    import_dealers_from_excel,
)


class DealerFilter(filters.FilterSet):
    region_id = filters.NumberFilter(field_name='region_id')

    class Meta:
        model = Dealer
        fields = ('is_active', 'region_id')


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.select_related('manager_user').all()
    serializer_class = RegionSerializer
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsSales | IsWarehouse]
    filter_backends = (filters.DjangoFilterBackend, drf_filters.SearchFilter)
    filterset_fields = ('manager_user',)
    search_fields = ('name',)


class DealerViewSet(viewsets.ModelViewSet):
    queryset = Dealer.objects.select_related('region', 'manager_user').all()
    serializer_class = DealerSerializer
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner | IsWarehouse]
    filterset_class = DealerFilter
    search_fields = ('name', 'code', 'contact', 'phone', 'address')
    ordering_fields = ('name', 'created_at', 'code')
    filter_backends = (filters.DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)

    def get_queryset(self):
        """
        Sales (menejer) roli faqat o'ziga tayinlangan dilerlarni ko'radi.
        Boshqa rollar barcha dilerlarni ko'radi.
        
        For list actions, uses optimized with_balances() to eliminate N+1 queries.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Use optimized queryset for list views
        if self.action == 'list':
            queryset = queryset.with_balances()
        
        # Superuser va admin/owner/accountant barcha dilerlarni ko'radi
        if user.is_superuser or getattr(user, 'role', None) in ['admin', 'owner', 'accountant']:
            return queryset
        
        # Sales (menejer) faqat o'ziga tayinlangan dilerlarni ko'radi
        if getattr(user, 'role', None) == 'sales':
            return queryset.filter(manager_user=user)
        
        # Warehouse hamma dilerlarni ko'radi (order delivery uchun kerak)
        return queryset

    @action(detail=False, methods=['get'], url_path='list-all')
    def list_all(self, request):
        """
        Unpaginated dealer list for dropdowns.
        Respects role-based visibility from get_queryset.
        Uses lightweight serializer without computed debt fields.
        """
        from .serializers import DealerListSerializer
        
        queryset = self.filter_queryset(self.get_queryset()).order_by('name')
        serializer = DealerListSerializer(queryset, many=True)
        return Response(serializer.data)


class DealerExportExcelView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        file_path = Path(export_dealers_to_excel())
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response


class DealerImportTemplateView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        file_path = Path(generate_dealer_import_template())
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response


class DealerImportExcelView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({'detail': 'Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_dealers_from_excel(excel_file)
        return Response(result, status=status.HTTP_201_CREATED)


class DealerBalancePDFView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        dealers = Dealer.objects.select_related('region').all()
        return self.render_pdf_with_qr(
            'reports/dealer_balance.html',
            {'dealers': dealers},
            filename_prefix='dealer_balances',
            request=request,
            doc_type='dealer-balances',
            doc_id='bulk',
        )


class DealerReconciliationView(APIView):
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        detailed = request.query_params.get('detailed') == 'true'
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
            detailed=detailed,
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
        if data.get('detailed'):
            def _serialize_order_detail(entry):
                formatted = entry.copy()
                value = formatted.get('date')
                if hasattr(value, 'isoformat'):
                    formatted['date'] = value.isoformat()
                return formatted

            payload['detailed'] = True
            payload['orders_detailed'] = [_serialize_order_detail(o) for o in data.get('orders_detailed', [])]
        return Response(payload)


class DealerReconciliationPDFView(APIView):
    """
    Generate professional reconciliation PDF using document system.
    
    GET /api/dealers/{id}/reconciliation/pdf/
    """
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        from documents import ReconciliationDocument
        
        # Get language from Accept-Language header
        lang = request.headers.get('Accept-Language', 'uz')[:2]
        
        # Get reconciliation data
        detailed = request.query_params.get('detailed') == 'true'
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
            detailed=detailed,
        )
        
        # Generate reconciliation using document system
        reconciliation = ReconciliationDocument(
            data=data,
            show_detailed=detailed,
            language=lang,
        )
        
        dealer_slug = slugify(data['dealer']) or f'dealer-{pk}'
        statement_date = data['to_date'].strftime('%Y%m%d')
        filename = f'reconciliation_{dealer_slug}_{statement_date}.pdf'
        
        return reconciliation.get_response(filename=filename, inline=True)


class DealerReconciliationExcelView(APIView):
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        # Get language from Accept-Language header
        lang = request.headers.get('Accept-Language', 'uz')
        
        detailed = request.query_params.get('detailed') == 'true'
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
            detailed=detailed,
        )
        file_path = Path(export_reconciliation_to_excel(data, detailed=detailed, language=lang))
        dealer_slug = slugify(data['dealer']) or f'dealer-{pk}'
        filename = f"reconciliation_{dealer_slug}.xlsx"
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8'
        return response
