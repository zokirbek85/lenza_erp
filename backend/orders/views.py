from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsOwner, IsSales, IsWarehouse
from core.utils.exporter import export_orders_to_excel
from core.mixins.report_mixin import BaseReportMixin

from .models import Order, OrderItem, OrderStatusLog
from .returns import process_return
from .serializers import OrderItemSerializer, OrderSerializer, OrderStatusLogSerializer


STATUS_FLOW = {
    Order.Status.CREATED: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PACKED, Order.Status.CANCELLED},
    Order.Status.PACKED: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED, Order.Status.CANCELLED},
}


class OrderViewSet(viewsets.ModelViewSet, BaseReportMixin):
    queryset = Order.objects.prefetch_related('items__product', 'status_logs', 'returns').select_related('dealer')
    serializer_class = OrderSerializer
    permission_classes = [IsAdmin | IsSales | IsOwner | IsWarehouse]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('status', 'dealer', 'is_reserve')
    search_fields = ('display_no', 'dealer__name')
    ordering_fields = ('created_at', 'value_date', 'total_usd')
    
    # BaseReportMixin configuration
    date_field = "value_date"
    filename_prefix = "orders"
    title_prefix = "Buyurtmalar hisoboti"
    report_template = "orders/report.html"

    def perform_create(self, serializer):
        serializer.save()
    
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
