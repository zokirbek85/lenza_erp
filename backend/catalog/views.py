from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.db import models
from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse
from core.mixins.export_mixins import ExportMixin

from .models import Brand, Category, Product
from .serializers import BrandSerializer, CategorySerializer, ProductSerializer
from .utils.excel_tools import export_products_to_excel, generate_import_template, import_products_from_excel


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAdmin | IsWarehouse | IsSales]
    search_fields = ('name',)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdmin | IsWarehouse | IsSales]
    search_fields = ('name',)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'brand', 'dealer').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdmin | IsAccountant | IsWarehouse | IsSales | IsOwner]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('dealer', 'is_active', 'category', 'brand')
    search_fields = ('sku', 'name', 'barcode')
    ordering_fields = ('name', 'sell_price_usd', 'stock_ok', 'stock_defect')

    def get_queryset(self):
        queryset = super().get_queryset()
        query = self.request.query_params.get('q')
        if query:
            queryset = queryset.filter(models.Q(name__icontains=query) | models.Q(barcode__icontains=query))

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset

    def list(self, request, *args, **kwargs):
        limit = request.query_params.get('limit')
        queryset = self.filter_queryset(self.get_queryset())
        if limit == 'all':
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)

    def _ensure_manager(self):
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only admin or accountant can modify products.')

    def perform_create(self, serializer):
        self._ensure_manager()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_manager()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_manager()
        instance.delete()

    @action(detail=True, methods=['patch'], url_path='adjust')
    def adjust_stock(self, request, pk=None):
        if not (request.user.is_superuser or getattr(request.user, 'role', None) == 'warehouse'):
            raise PermissionDenied('Only warehouse users can adjust stock levels.')
        product = self.get_object()
        stock_ok = request.data.get('stock_ok')
        stock_defect = request.data.get('stock_defect')
        updates = {}
        try:
            if stock_ok is not None:
                value = Decimal(str(stock_ok))
                updates['stock_ok'] = value.quantize(Decimal('0.01')) if value >= 0 else Decimal('0.00')
            if stock_defect is not None:
                value = Decimal(str(stock_defect))
                updates['stock_defect'] = value.quantize(Decimal('0.01')) if value >= 0 else Decimal('0.00')
        except (InvalidOperation, TypeError, ValueError):
            return Response({'detail': 'Stock values must be decimals.'}, status=400)
        if not updates:
            return Response({'detail': 'Provide stock_ok or stock_defect values.'}, status=400)
        Product.objects.filter(pk=product.pk).update(**updates)
        product.refresh_from_db()
        return Response(self.get_serializer(product).data)


class ProductExportExcelView(APIView):
    permission_classes = [IsAdmin | IsAccountant]

    def get(self, request):
        file_path = Path(export_products_to_excel())
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response


class ProductImportExcelView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({'detail': 'Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_products_from_excel(excel_file)
        return Response(result, status=status.HTTP_201_CREATED)


class ProductImportTemplateView(APIView):
    permission_classes = [IsAdmin | IsAccountant]

    def get(self, request):
        file_path = Path(generate_import_template())
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response


class ProductReportPDFView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsSales | IsWarehouse]

    def get(self, request):
        products = Product.objects.select_related('brand', 'category').all()
        return self.render_pdf_with_qr(
            'reports/products_report.html',
            {'products': products},
            filename_prefix='products_report',
            request=request,
            doc_type='products-report',
            doc_id='bulk',
        )
