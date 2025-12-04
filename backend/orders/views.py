from pathlib import Path

from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsOwner, IsSales, IsWarehouse, IsAccountant
from core.utils.exporter import export_orders_to_excel
from core.mixins.report_mixin import BaseReportMixin

from .models import Order, OrderItem, OrderStatusLog
from .filters import OrderFilter
from .returns import process_return
from .serializers import OrderItemSerializer, OrderSerializer, OrderStatusLogSerializer
from .utils.excel_tools import generate_import_template, import_orders_from_excel


STATUS_FLOW = {
    Order.Status.CREATED: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PACKED, Order.Status.CANCELLED},
    Order.Status.PACKED: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED, Order.Status.RETURNED, Order.Status.CANCELLED},
    Order.Status.DELIVERED: {Order.Status.RETURNED},
}


class OrderViewSet(viewsets.ModelViewSet, BaseReportMixin):
    queryset = Order.objects.prefetch_related('items__product', 'status_logs', 'returns').select_related('dealer', 'created_by').order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdmin | IsSales | IsOwner | IsWarehouse | IsAccountant]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_class = OrderFilter
    search_fields = ('display_no', 'dealer__name')
    ordering_fields = ('created_at', 'value_date', 'total_usd')
    ordering = ['-created_at']  # Default ordering: newest first
    
    # BaseReportMixin configuration
    date_field = "value_date"
    filename_prefix = "orders"
    title_prefix = "Buyurtmalar hisoboti"
    report_template = "orders/report.html"

    def perform_create(self, serializer):
        """Create order with stock validation (good stock only)."""
        # Validate stock_ok for each item before creating order
        # stock_defect is NOT used in order creation
        from catalog.models import Product
        items_data = self.request.data.get('items', [])
        for item in items_data:
            product_id = item.get('product')
            if product_id:
                try:
                    product = Product.objects.get(id=product_id)
                    # Only check stock_ok - defect stock is ignored
                    if product.stock_ok <= 0:
                        raise ValidationError({
                            'detail': f'Mahsulot "{product.name}" omborda mavjud emas. Qoldiq: 0'
                        })
                except Product.DoesNotExist:
                    raise ValidationError({'detail': f'Mahsulot ID {product_id} topilmadi.'})
        serializer.save()
    
    def perform_update(self, serializer):
        """
        Edit order with separate permissions for status and items:
        - Status change: admin/accountant always, manager for own orders, warehouse only following workflow
        - Items edit: admin/accountant always, manager only for CREATED status
        """
        order = self.get_object()
        user = self.request.user
        
        # Superuser can do anything
        if user.is_superuser:
            serializer.save()
            return
        
        # Check what's being updated
        is_status_change = 'status' in self.request.data
        is_items_change = 'items' in self.request.data
        
        # Validate status change permission with new_status
        if is_status_change:
            new_status = self.request.data.get('status')
            if not order.can_change_status(user, new_status):
                from rest_framework.exceptions import PermissionDenied
                if hasattr(user, 'role') and user.role == 'warehouse':
                    from orders.models import WAREHOUSE_FLOW
                    allowed = WAREHOUSE_FLOW.get(order.status)
                    if allowed:
                        raise PermissionDenied(f'Warehouse faqat "{order.status}" dan "{allowed}" ga o\'tkazishi mumkin.')
                    else:
                        raise PermissionDenied(f'Warehouse "{order.status}" statusidan keyingi bosqichga o\'tkaza olmaydi.')
                else:
                    raise PermissionDenied('Sizda bu buyurtma statusini o\'zgartirish huquqi yo\'q.')
        
        # Validate items change permission
        if is_items_change and not order.can_edit_items(user):
            from rest_framework.exceptions import PermissionDenied
            if hasattr(user, 'role') and user.role == 'sales':
                raise PermissionDenied('Manager faqat "created" statusdagi buyurtmalarda mahsulotlarni tahrirlashi mumkin.')
            else:
                raise PermissionDenied('Sizda bu buyurtma mahsulotlarini tahrirlash huquqi yo\'q.')
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only admin/owner can delete orders."""
        user = self.request.user
        
        if user.is_superuser:
            instance.delete()
            return
        
        if hasattr(user, 'role') and user.role in ['admin', 'owner']:
            instance.delete()
            return
        
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('Faqat admin va owner o\'chirishi mumkin.')
    
    def get_report_rows(self, queryset):
        """Generate rows for order report."""
        rows = []
        for order in queryset.order_by('value_date', 'id'):
            rows.append({
                'Raqam': order.display_no or f"#{order.id}",
                'Sana': order.value_date.strftime('%d.%m.%Y') if order.value_date else '',
                'Diler': order.dealer.name if order.dealer else '',
                'Holat': order.get_status_display(),
                'USD': f"{float(order.total_usd):,.2f}",
                'UZS': f"{float(order.total_uzs):,.0f}",
            })
        return rows
    
    def get_report_total(self, queryset):
        """Calculate total amount in USD."""
        from django.db.models import Sum
        total = queryset.aggregate(Sum('total_usd'))['total_usd__sum'] or 0
        return total

    def _set_status(self, order: Order, new_status: str | None):
        if not new_status:
            raise ValidationError({'status': 'Status is required.'})
        if new_status not in dict(Order.Status.choices):
            raise ValidationError({'status': 'Invalid status value.'})
        allowed = STATUS_FLOW.get(order.status, set())
        if allowed and new_status not in allowed:
            raise ValidationError({'status': f'{order.status} -> {new_status} is not permitted.'})
        
        print(f'[Order Status Change] Changing order {order.id} status from {order.status} to {new_status}')
        
        order._status_actor = self.request.user
        order.status = new_status
        # update_fields ni olib tashladik, shunda signal to'liq ishlaydi
        order.save()

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        order = self.get_object()
        self._set_status(order, request.data.get('status'))
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['patch'], url_path='status')
    def patch_status(self, request, pk=None):
        print(f'[API] patch_status called for order {pk}')
        print(f'[API] Request data: {request.data}')
        print(f'[API] User: {request.user}')
        
        order = self.get_object()
        print(f'[API] Current order status: {order.status}')
        
        self._set_status(order, request.data.get('status'))
        
        print(f'[API] Order status after change: {order.status}')
        
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], url_path='returns')
    def register_return(self, request, pk=None):
        order = self.get_object()
        item_id = request.data.get('item')
        quantity = request.data.get('quantity')
        is_defect = bool(request.data.get('is_defect', False))
        try:
            item = order.items.get(pk=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            record = process_return(item=item, quantity=quantity, is_defect=is_defect, user=request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = OrderSerializer(order, context=self.get_serializer_context())
        return Response({'order': serializer.data, 'return_id': record.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='items')
    def list_items(self, request, pk=None):
        order = self.get_object()
        serializer = OrderItemSerializer(order.items.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='history')
    def status_history(self, request, pk=None):
        """Get status change history for an order"""
        order = self.get_object()
        logs = order.status_logs.select_related('by_user').all()
        serializer = OrderStatusLogSerializer(logs, many=True)
        return Response(serializer.data)


class OrderExportExcelView(APIView):
    permission_classes = [IsAdmin | IsOwner | IsSales]

    def get(self, request):
        orders = Order.objects.select_related('dealer').all()
        file_path = export_orders_to_excel(orders)
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)


class OrderImportTemplateView(APIView):
    """Generate Excel template for bulk order import."""
    permission_classes = [IsAdmin | IsOwner | IsSales]

    def get(self, request):
        file_path = Path(generate_import_template())
        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=file_path.name
        )


class OrderImportExcelView(APIView):
    """Import historical orders from Excel file."""
    permission_classes = [IsAdmin | IsOwner | IsSales]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        if not file_obj.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'error': 'Invalid file format. Please upload an Excel file (.xlsx or .xls)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import orders
        result = import_orders_from_excel(file_obj, created_by=request.user)
        
        return Response({
            'orders_created': result['orders_created'],
            'items_created': result['items_created'],
            'errors': result['errors'],
        }, status=status.HTTP_200_OK)
