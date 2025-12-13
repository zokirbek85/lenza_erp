"""
Defects view based on Product.stock_defect field.
Returns products with stock_defect > 0 in ProductDefect-like format.
"""

from decimal import Decimal
from django.db.models import Q, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Product, Brand, Category
from core.permissions import IsAdmin, IsWarehouse, IsOwner


class ProductDefectSerializer:
    """
    Serializer-like converter for Product to ProductDefect format.
    Converts Product with stock_defect to match frontend expectations.
    """
    
    @staticmethod
    def to_representation(product):
        """Convert Product instance to ProductDefect-like dict"""
        return {
            'id': product.id,  # Using product ID as defect ID
            'product': product.id,
            'product_name': product.name,
            'product_sku': product.sku,
            'product_image': product.image.url if product.image else None,
            'qty': float(product.stock_defect or 0),
            'repairable_qty': 0,  # Not tracked separately in Product model
            'non_repairable_qty': float(product.stock_defect or 0),
            'status': 'detected',  # Default status for stock_defect items
            'status_display': 'Detected',
            'defect_summary': f'{product.stock_defect} defective items',
            'created_by_name': None,
            'created_at': product.created_at.isoformat() if hasattr(product, 'created_at') else None,
            'updated_at': product.updated_at.isoformat() if hasattr(product, 'updated_at') else None,
        }


class ProductDefectFromStockViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet that shows products with stock_defect > 0.
    Read-only - defects are managed by editing Product.stock_defect.
    
    This replaces ProductDefectViewSet for simpler defect tracking.
    """
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ('name', 'sku')
    ordering_fields = ('name', 'stock_defect', 'created_at')
    ordering = ('-stock_defect',)
    
    def get_queryset(self):
        """Return products with stock_defect > 0"""
        queryset = Product.objects.filter(
            stock_defect__gt=0
        ).select_related('brand', 'category').order_by('-stock_defect')
        
        # Filter by brand
        brand_id = self.request.query_params.get('product__brand')
        if brand_id:
            queryset = queryset.filter(brand_id=brand_id)
        
        # Filter by search query
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(sku__icontains=search)
            )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """List all products with defects"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            data = [ProductDefectSerializer.to_representation(p) for p in page]
            return self.get_paginated_response(data)
        
        data = [ProductDefectSerializer.to_representation(p) for p in queryset]
        return Response(data)
    
    def retrieve(self, request, *args, **kwargs):
        """Get single product defect details"""
        try:
            product = Product.objects.get(pk=kwargs['pk'])
            data = ProductDefectSerializer.to_representation(product)
            return Response(data)
        except Product.DoesNotExist:
            return Response(
                {'detail': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Get defect statistics based on stock_defect field.
        
        Returns:
        - total_defects: Total number of products with defects
        - total_qty: Total quantity of defective items
        - by_product: Top 10 products with most defects
        - by_brand: Defects by brand
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Overall statistics
        total_defects = queryset.count()
        total_qty = queryset.aggregate(
            total=Sum('stock_defect')
        )['total'] or Decimal('0.00')
        
        # By product (top 10)
        by_product = [
            {
                'product__id': p.id,
                'product__name': p.name,
                'product__sku': p.sku,
                'defect_count': 1,
                'defect_qty': float(p.stock_defect or 0),
            }
            for p in queryset.order_by('-stock_defect')[:10]
        ]
        
        # By brand
        brands = Brand.objects.filter(
            products__stock_defect__gt=0
        ).distinct().values('id', 'name')
        
        by_brand = []
        for brand in brands:
            brand_defect_qty = Product.objects.filter(
                brand_id=brand['id'],
                stock_defect__gt=0
            ).aggregate(
                total=Sum('stock_defect')
            )['total'] or Decimal('0.00')
            
            by_brand.append({
                'brand_id': brand['id'],
                'brand_name': brand['name'],
                'total_qty': float(brand_defect_qty),
            })
        
        by_brand = sorted(by_brand, key=lambda x: x['total_qty'], reverse=True)
        
        # By status (all are 'detected' since we're using stock_defect)
        by_status = [
            {
                'status': 'detected',
                'count': total_defects,
                'qty_sum': float(total_qty),
            }
        ]
        
        return Response({
            'totals': {
                'total_defects': total_defects,
                'total_qty': float(total_qty),
                'total_repairable': 0,  # Not tracked separately
                'total_non_repairable': float(total_qty),
            },
            'by_status': by_status,
            'by_product': by_product,
            'by_brand': by_brand,
            'by_defect_type': [],  # Not applicable for stock_defect
        })
    
    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        """
        Export defects to Excel.
        """
        from openpyxl import Workbook
        from django.http import HttpResponse
        from datetime import datetime
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Create workbook
        wb = Workbook()
        ws = wb.active
        ws.title = 'Defects'
        
        # Headers
        headers = ['ID', 'SKU', 'Product Name', 'Brand', 'Category', 'Defect Qty', 'Stock OK', 'Total Stock']
        ws.append(headers)
        
        # Data rows
        for product in queryset:
            ws.append([
                product.id,
                product.sku,
                product.name,
                product.brand.name if product.brand else '',
                product.category.name if product.category else '',
                float(product.stock_defect or 0),
                float(product.stock_ok or 0),
                float((product.stock_ok or 0) + (product.stock_defect or 0)),
            ])
        
        # Auto-size columns
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(cell.value)
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=defects_{datetime.now().strftime("%Y%m%d")}.xlsx'
        wb.save(response)
        
        return response