"""
Defect management views for stock_defect module.
Handles defect tracking, repair, disposal, and outlet sales.
"""

from decimal import Decimal
from datetime import datetime

from django.db import transaction
from django.db.models import Sum, Q, Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsAdmin, IsOwner, IsWarehouse, IsAccountant, IsSales

from .models import (
    DefectType, ProductDefect, DefectAuditLog, Product
)
from .serializers import (
    DefectTypeSerializer,
    ProductDefectListSerializer,
    ProductDefectDetailSerializer,
    DefectAuditLogSerializer,
    DefectRepairSerializer,
    DefectDisposeSerializer,
    DefectSellOutletSerializer,
)


class DefectTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for defect types management.
    Admin only can create/update/delete.
    All authorized users can read.
    """
    queryset = DefectType.objects.all().order_by('name')
    serializer_class = DefectTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ('is_active',)
    search_fields = ('name', 'description')
    ordering_fields = ('name', 'created_at')
    ordering = ('name',)
    
    def get_permissions(self):
        """Admin/Owner can modify, others can read"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin | IsOwner]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class ProductDefectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for product defects management.
    
    Permissions:
    - Admin/Warehouse: Full access (create, update, delete)
    - Director/Accountant/Sales: Read-only
    
    Custom Actions:
    - repair: Mark defect items as repaired and return to stock_ok
    - dispose: Mark defect items as disposed (utilized)
    - sell_outlet: Mark defect items as sold via outlet
    - audit_logs: Get audit log for a defect
    """
    queryset = ProductDefect.objects.select_related(
        'product__brand',
        'product__category',
        'created_by',
        'updated_by'
    ).all().order_by('-created_at')
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ('status', 'product', 'product__brand', 'created_by')
    search_fields = ('product__name', 'product__sku', 'description')
    ordering_fields = ('created_at', 'updated_at', 'qty', 'status')
    ordering = ('-created_at',)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ProductDefectListSerializer
        return ProductDefectDetailSerializer
    
    def get_permissions(self):
        """Admin/Warehouse can modify, others can read"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'repair', 'dispose', 'sell_outlet']:
            permission_classes = [IsAdmin | IsWarehouse | IsOwner]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Apply query filters"""
        queryset = super().get_queryset()
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=date_to)
            except ValueError:
                pass
        
        # Filter by repairable/non-repairable
        has_repairable = self.request.query_params.get('has_repairable')
        if has_repairable == 'true':
            queryset = queryset.filter(repairable_qty__gt=0)
        elif has_repairable == 'false':
            queryset = queryset.filter(repairable_qty=0)
        
        has_non_repairable = self.request.query_params.get('has_non_repairable')
        if has_non_repairable == 'true':
            queryset = queryset.filter(non_repairable_qty__gt=0)
        elif has_non_repairable == 'false':
            queryset = queryset.filter(non_repairable_qty=0)
        
        return queryset
    
    @action(detail=True, methods=['post'], url_path='repair')
    def repair(self, request, pk=None):
        """
        Repair defective items.
        
        Required fields:
        - quantity: Number of items to repair
        - materials: List of materials used (optional)
          [{"product_id": 123, "qty": 2}, ...]
        - description: Repair description (optional)
        
        Process:
        1. Validate quantity <= repairable_qty
        2. Validate material availability
        3. Deduct materials from stock_ok
        4. Deduct quantity from repairable_qty
        5. Add quantity to product.stock_ok
        6. Update defect status if needed
        7. Create audit log
        """
        defect = self.get_object()
        serializer = DefectRepairSerializer(
            data=request.data,
            context={'defect': defect, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        quantity = serializer.validated_data['quantity']
        materials = serializer.validated_data.get('materials', [])
        description = serializer.validated_data.get('description', '')
        
        with transaction.atomic():
            # Deduct materials from stock
            for material in materials:
                product = Product.objects.select_for_update().get(id=material['product_id'])
                product.stock_ok -= Decimal(str(material['qty']))
                product.save(update_fields=['stock_ok'])
            
            # Update defect quantities
            defect.repairable_qty -= quantity
            defect.qty -= quantity
            defect.repair_materials = materials
            defect.repair_completed_at = timezone.now()
            
            # Update status if needed
            if defect.qty == 0:
                defect.status = ProductDefect.Status.REPAIRED
            elif defect.repairable_qty == 0 and defect.non_repairable_qty > 0:
                defect.status = ProductDefect.Status.INSPECTED
            else:
                defect.status = ProductDefect.Status.REPAIRED
            
            defect.updated_by = request.user if hasattr(request, 'user') else None
            defect.save()
            
            # Add quantity to product stock_ok
            product = Product.objects.select_for_update().get(id=defect.product_id)
            product.stock_ok += quantity
            product.save(update_fields=['stock_ok'])
            
            # Create audit log
            DefectAuditLog.objects.create(
                defect=defect,
                action=DefectAuditLog.Action.REPAIRED,
                old_data={
                    'repairable_qty': str(defect.repairable_qty + quantity),
                    'qty': str(defect.qty + quantity),
                },
                new_data={
                    'repairable_qty': str(defect.repairable_qty),
                    'qty': str(defect.qty),
                    'repaired_qty': str(quantity),
                    'materials_used': materials,
                },
                description=f'Repaired {quantity} items. {description}',
                user=request.user if hasattr(request, 'user') else None,
            )
        
        # Return updated defect
        result_serializer = ProductDefectDetailSerializer(
            defect,
            context={'request': request}
        )
        return Response(result_serializer.data)
    
    @action(detail=True, methods=['post'], url_path='dispose')
    def dispose(self, request, pk=None):
        """
        Dispose (utilize) non-repairable defect items.
        
        Required fields:
        - quantity: Number of items to dispose
        - description: Reason for disposal (optional)
        
        Process:
        1. Validate quantity <= non_repairable_qty
        2. Deduct quantity from non_repairable_qty
        3. Deduct quantity from defect.qty
        4. Update status if needed
        5. Create audit log
        """
        defect = self.get_object()
        serializer = DefectDisposeSerializer(
            data=request.data,
            context={'defect': defect, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        quantity = serializer.validated_data['quantity']
        description = serializer.validated_data.get('description', '')
        
        with transaction.atomic():
            # Update defect quantities
            old_non_repairable = defect.non_repairable_qty
            old_qty = defect.qty
            
            defect.non_repairable_qty -= quantity
            defect.qty -= quantity
            defect.disposed_at = timezone.now()
            
            # Update status if all disposed
            if defect.qty == 0:
                defect.status = ProductDefect.Status.DISPOSED
            
            defect.updated_by = request.user if hasattr(request, 'user') else None
            defect.save()
            
            # Create audit log
            DefectAuditLog.objects.create(
                defect=defect,
                action=DefectAuditLog.Action.DISPOSED,
                old_data={
                    'non_repairable_qty': str(old_non_repairable),
                    'qty': str(old_qty),
                },
                new_data={
                    'non_repairable_qty': str(defect.non_repairable_qty),
                    'qty': str(defect.qty),
                    'disposed_qty': str(quantity),
                },
                description=f'Disposed {quantity} items. {description}',
                user=request.user if hasattr(request, 'user') else None,
            )
        
        # Return updated defect
        result_serializer = ProductDefectDetailSerializer(
            defect,
            context={'request': request}
        )
        return Response(result_serializer.data)
    
    @action(detail=True, methods=['post'], url_path='sell-outlet')
    def sell_outlet(self, request, pk=None):
        """
        Sell defect items via outlet at discounted price.
        
        Required fields:
        - quantity: Number of items to sell
        - sale_price_usd: Discounted sale price per item
        - description: Sale details (optional)
        
        Process:
        1. Validate quantity <= non_repairable_qty
        2. Deduct quantity from non_repairable_qty
        3. Deduct quantity from defect.qty
        4. Update status if needed
        5. Create audit log
        
        Note: Actual transaction/payment creation is handled separately
        """
        defect = self.get_object()
        serializer = DefectSellOutletSerializer(
            data=request.data,
            context={'defect': defect, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        quantity = serializer.validated_data['quantity']
        sale_price_usd = serializer.validated_data['sale_price_usd']
        description = serializer.validated_data.get('description', '')
        
        with transaction.atomic():
            # Update defect quantities
            old_non_repairable = defect.non_repairable_qty
            old_qty = defect.qty
            
            defect.non_repairable_qty -= quantity
            defect.qty -= quantity
            defect.sold_outlet_at = timezone.now()
            
            # Update status if all sold
            if defect.qty == 0:
                defect.status = ProductDefect.Status.SOLD_OUTLET
            
            defect.updated_by = request.user if hasattr(request, 'user') else None
            defect.save()
            
            # Create audit log
            DefectAuditLog.objects.create(
                defect=defect,
                action=DefectAuditLog.Action.SOLD_OUTLET,
                old_data={
                    'non_repairable_qty': str(old_non_repairable),
                    'qty': str(old_qty),
                },
                new_data={
                    'non_repairable_qty': str(defect.non_repairable_qty),
                    'qty': str(defect.qty),
                    'sold_qty': str(quantity),
                    'sale_price_usd': str(sale_price_usd),
                    'total_revenue_usd': str(quantity * sale_price_usd),
                },
                description=f'Sold {quantity} items via outlet at ${sale_price_usd}/item. {description}',
                user=request.user if hasattr(request, 'user') else None,
            )
        
        # Return updated defect
        result_serializer = ProductDefectDetailSerializer(
            defect,
            context={'request': request}
        )
        return Response(result_serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='change-status')
    def change_status(self, request, pk=None):
        """
        Manually change defect status.
        
        Required fields:
        - status: New status (detected, inspected, repairing, repaired, disposed, sold_outlet)
        """
        defect = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            raise ValidationError({'status': 'Status field is required'})
        
        if new_status not in dict(ProductDefect.Status.choices):
            raise ValidationError({
                'status': f'Invalid status. Allowed: {", ".join(dict(ProductDefect.Status.choices).keys())}'
            })
        
        old_status = defect.status
        defect.status = new_status
        defect.updated_by = request.user if hasattr(request, 'user') else None
        defect.save()
        
        # Create audit log
        DefectAuditLog.objects.create(
            defect=defect,
            action=DefectAuditLog.Action.STATUS_CHANGED,
            old_data={'status': old_status},
            new_data={'status': new_status},
            description=f'Status changed from {defect.get_status_display()} to {new_status}',
            user=request.user if hasattr(request, 'user') else None,
        )
        
        result_serializer = ProductDefectDetailSerializer(
            defect,
            context={'request': request}
        )
        return Response(result_serializer.data)
    
    @action(detail=True, methods=['get'], url_path='audit-logs')
    def audit_logs(self, request, pk=None):
        """Get audit logs for a defect"""
        defect = self.get_object()
        logs = defect.audit_logs.all().order_by('-created_at')
        serializer = DefectAuditLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Get defect statistics.
        
        Returns:
        - total_defects: Total number of defect records
        - total_qty: Total quantity of defective items
        - total_repairable: Total repairable quantity
        - total_non_repairable: Total non-repairable quantity
        - by_status: Breakdown by status
        - by_product: Top 10 products with most defects
        - by_defect_type: Defects by type (from defect_details)
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply date filters if provided
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=date_to)
            except ValueError:
                pass
        
        # Overall statistics
        totals = queryset.aggregate(
            total_defects=Count('id'),
            total_qty=Sum('qty'),
            total_repairable=Sum('repairable_qty'),
            total_non_repairable=Sum('non_repairable_qty'),
        )
        
        # By status
        by_status = list(
            queryset.values('status')
            .annotate(
                count=Count('id'),
                qty_sum=Sum('qty')
            )
            .order_by('-qty_sum')
        )
        
        # By product (top 10)
        by_product = list(
            queryset.values('product__id', 'product__name', 'product__sku')
            .annotate(
                defect_count=Count('id'),
                defect_qty=Sum('qty')
            )
            .order_by('-defect_qty')[:10]
        )
        
        # By defect type (aggregate from JSON defect_details)
        defect_types = {}
        for defect in queryset:
            if defect.defect_details:
                for detail in defect.defect_details:
                    type_name = detail.get('type_name', 'Unknown')
                    qty = Decimal(str(detail.get('qty', 0)))
                    
                    if type_name in defect_types:
                        defect_types[type_name] += qty
                    else:
                        defect_types[type_name] = qty
        
        by_defect_type = [
            {'type_name': name, 'total_qty': float(qty)}
            for name, qty in sorted(defect_types.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return Response({
            'totals': {
                'total_defects': totals['total_defects'] or 0,
                'total_qty': float(totals['total_qty'] or 0),
                'total_repairable': float(totals['total_repairable'] or 0),
                'total_non_repairable': float(totals['total_non_repairable'] or 0),
            },
            'by_status': by_status,
            'by_product': by_product,
            'by_defect_type': by_defect_type,
        })


class DefectAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for defect audit logs.
    All authorized users can read audit logs.
    """
    queryset = DefectAuditLog.objects.select_related(
        'defect__product',
        'user'
    ).all().order_by('-created_at')
    serializer_class = DefectAuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ('defect', 'action', 'user')
    search_fields = ('defect__product__name', 'description')
    ordering_fields = ('created_at',)
    ordering = ('-created_at',)
    
    def get_queryset(self):
        """Apply date filters"""
        queryset = super().get_queryset()
        
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=date_to)
            except ValueError:
                pass
        
        return queryset
