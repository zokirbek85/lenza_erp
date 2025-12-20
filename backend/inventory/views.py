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
        from types import SimpleNamespace
        from returns.models import Return, ReturnItem
        from collections import defaultdict
        from datetime import datetime
        
        # Use returns app (not orders.OrderReturn or inventory.ReturnedProduct)
        returns_qs = Return.objects.select_related('dealer').prefetch_related(
            'items__product'
        ).order_by('-created_at')
        
        # Aggregate by dealer, product, date, and type
        aggregated = defaultdict(lambda: {
            'quantity': 0,
            'reasons': set(),
            'created_at': None,
        })
        
        for ret in returns_qs:
            date_key = ret.created_at.date()  # Group by date only
            for item in ret.items.all():
                key = (
                    ret.dealer.id if ret.dealer else None,
                    item.product.id if item.product else None,
                    date_key,
                    item.status
                )
                
                aggregated[key]['quantity'] += item.quantity
                aggregated[key]['dealer'] = ret.dealer
                aggregated[key]['product'] = item.product
                aggregated[key]['return_type'] = 'defective' if item.status == ReturnItem.Status.DEFECT else 'good'
                if item.comment:
                    aggregated[key]['reasons'].add(item.comment)
                if ret.general_comment:
                    aggregated[key]['reasons'].add(ret.general_comment)
                if not aggregated[key]['created_at']:
                    aggregated[key]['created_at'] = ret.created_at
        
        # Transform to list for template
        returns_data = []
        for data in aggregated.values():
            reasons_text = '; '.join(data['reasons']) if data['reasons'] else ''
            returns_data.append(SimpleNamespace(
                dealer=data['dealer'],
                product=data['product'],
                quantity=data['quantity'],
                return_type=data['return_type'],
                reason=reasons_text,
                created_at=data['created_at'],
            ))
        
        # Sort by date descending
        returns_data.sort(key=lambda x: x.created_at, reverse=True)
        
        return self.render_pdf_with_qr(
            'reports/returns_report.html',
            {'returns': returns_data},
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
