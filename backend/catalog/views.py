from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.files.base import ContentFile
from django.db import models
from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse
from core.mixins.export_mixins import ExportMixin
from services.image_processing import process_product_image, delete_product_image, ImageProcessingError

from .models import Brand, Category, Product
from .serializers import BrandSerializer, CategorySerializer, ProductSerializer, CatalogProductSerializer
from .utils.excel_tools import export_products_to_excel, generate_import_template, import_products_from_excel


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAdmin | IsWarehouse | IsSales | IsAccountant | IsOwner]
    search_fields = ('name',)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdmin | IsWarehouse | IsSales | IsAccountant | IsOwner]
    search_fields = ('name',)

    def get_queryset(self):
        queryset = super().get_queryset()
        brand_id = self.request.query_params.get('brand')
        if brand_id:
            queryset = queryset.filter(products__brand_id=brand_id).distinct()
        return queryset


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
        if getattr(user, 'role', None) not in {'admin', 'owner'}:
            raise PermissionDenied('Only admin users can modify products.')

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

    @action(detail=True, methods=['post'], url_path='upload-image', parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        """Upload and process product image with automatic background removal."""
        self._ensure_manager()
        product = self.get_object()
        
        # Validate file presence
        image_file = request.FILES.get('image')
        if not image_file:
            raise ValidationError({'image': 'Image file is required.'})
        
        # Validate file size (10 MB max)
        max_size = 10 * 1024 * 1024  # 10 MB
        if image_file.size > max_size:
            raise ValidationError({'image': 'Image file too large. Maximum size is 10 MB.'})
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        content_type = getattr(image_file, 'content_type', '')
        if content_type not in allowed_types:
            raise ValidationError({'image': 'Invalid image format. Allowed: JPEG, PNG, WebP.'})
        
        try:
            # Delete old image if exists
            if product.image:
                old_path = product.image.name
                product.image.delete(save=False)
                delete_product_image(old_path)
            
            # Process image
            processed_bytes = process_product_image(
                image_file,
                max_size=1200,
                quality=85,
                remove_bg=True,
            )
            
            # Save processed image
            filename = f"{product.id}_{int(request.user.id or 0)}.webp"
            product.image.save(filename, ContentFile(processed_bytes), save=True)
            
            # Return updated product data
            serializer = self.get_serializer(product)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except ImageProcessingError as e:
            raise ValidationError({'image': f'Image processing failed: {str(e)}'})
        except Exception as e:
            raise ValidationError({'image': f'Unexpected error: {str(e)}'})

    @action(detail=True, methods=['delete'], url_path='remove-image')
    def remove_image(self, request, pk=None):
        """Remove product image."""
        self._ensure_manager()
        product = self.get_object()
        
        if not product.image:
            return Response({'detail': 'No image to remove.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            old_path = product.image.name
            product.image.delete(save=False)
            product.image = None
            product.save(update_fields=['image'])
            delete_product_image(old_path)
            
            serializer = self.get_serializer(product)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            raise ValidationError({'detail': f'Failed to remove image: {str(e)}'})


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


class CatalogView(APIView):
    """
    Catalog page API - returns door panel products grouped by brand with stock breakdown by width.
    Only shows products from category "Дверное полотно".
    """
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request):
        # Filter products by category "Дверное полотно"
        products = Product.objects.filter(
            category__name='Дверное полотно',
            is_active=True
        ).select_related('brand', 'category').order_by('brand__name', 'name')
        
        serializer = CatalogProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
