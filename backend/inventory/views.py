from io import BytesIO

from django.db.models import Sum
from django.http import FileResponse, HttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView

from core.utils.exporter import export_returns_to_excel
from core.mixins.export_mixins import ExportMixin
from users.permissions import IsAdmin, IsWarehouse

from .models import InventoryAdjustment, ReturnedProduct
from .serializers import (
    AuditImportRequestSerializer,
    InventoryAdjustmentSerializer,
    ReturnedProductSerializer,
)
from .services import AuditExportService, AuditImportService


class ReturnedProductViewSet(ModelViewSet):
    queryset = (
        ReturnedProduct.objects.select_related('dealer', 'product', 'created_by')
        .all()
        .order_by('-created_at')
    )
    serializer_class = ReturnedProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset
        role = getattr(user, 'role', '') or ''
        if role in {'admin', 'accountant', 'owner'}:
            return qs
        if role in {'warehouse'}:
            return qs
        if role in {'sales', 'sales_manager'}:
            return qs.filter(dealer__manager_user=user)
        return qs.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ReturnedProductStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        aggregates = (
            ReturnedProduct.objects.values('return_type')
            .order_by()
            .annotate(total=Sum('quantity'))
        )
        stats = {'good': 0, 'defective': 0}
        for row in aggregates:
            key = row['return_type']
            if key in stats and row['total'] is not None:
                stats[key] = float(row['total'])
        return Response(stats)


class ReturnsExportExcelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        returns = ReturnedProduct.objects.select_related('dealer', 'product').order_by('-created_at')
        file_path = export_returns_to_excel(returns)
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)


class ReturnsReportPDFView(APIView, ExportMixin):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        returns = ReturnedProduct.objects.select_related('dealer', 'product').order_by('-created_at')
        return self.render_pdf_with_qr(
            'reports/returns_report.html',
            {'returns': returns},
            filename_prefix='returns_report',
            request=request,
            doc_type='returns-report',
            doc_id='bulk',
        )


class InventoryAdjustmentViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for viewing inventory audit adjustment history.
    Read-only: adjustments are created automatically during audit imports.
    """
    queryset = (
        InventoryAdjustment.objects
        .select_related('product', 'created_by')
        .order_by('-created_at')
    )
    serializer_class = InventoryAdjustmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['product', 'date', 'created_by']
    search_fields = ['product__sku', 'product__name', 'comment']


class AuditExportView(APIView):
    """
    Export current inventory state to Excel for physical audit.
    GET /api/inventory/audit/export/
    """
    permission_classes = [IsAuthenticated, IsWarehouse | IsAdmin]
    
    def get(self, request):
        """
        Generate and download Excel file with current inventory.
        """
        try:
            excel_buffer = AuditExportService.export_to_excel()
            
            response = HttpResponse(
                excel_buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="inventory_audit_export.xlsx"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate export: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AuditImportView(APIView):
    """
    Import physical audit results and create stock adjustments.
    POST /api/inventory/audit/import/
    """
    permission_classes = [IsAuthenticated, IsWarehouse | IsAdmin]
    
    def post(self, request):
        """
        Process uploaded Excel file with audit results.
        
        Request body (multipart/form-data):
            - file: Excel file (.xlsx)
            - date: Audit date (optional, defaults to today)
            - comment: Optional comment (optional)
        
        Response:
            - success: Boolean
            - total_products: Total products processed
            - updated_products: Products with changes
            - unchanged_products: Products without changes
            - adjustments: List of adjustment details
            - errors: List of error messages
        """
        serializer = AuditImportRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = serializer.validated_data['file']
        audit_date = serializer.validated_data.get('date')
        comment = serializer.validated_data.get('comment', '')
        
        # Read file into BytesIO
        file_data = BytesIO(file.read())
        
        try:
            result = AuditImportService.process_audit_import(
                file_data=file_data,
                user=request.user,
                audit_date=audit_date,
                comment=comment,
            )
            
            if result.get('success'):
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to process import: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
