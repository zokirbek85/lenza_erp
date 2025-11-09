from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsOwner, IsSales, IsWarehouse
from core.utils.exporter import export_orders_to_excel

from .models import Order, OrderItem
from .returns import process_return
from .serializers import OrderItemSerializer, OrderSerializer


STATUS_FLOW = {
    Order.Status.CREATED: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PACKED, Order.Status.CANCELLED},
    Order.Status.PACKED: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED, Order.Status.CANCELLED},
}


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related('items__product', 'status_logs', 'returns').select_related('dealer')
    serializer_class = OrderSerializer
    permission_classes = [IsAdmin | IsSales | IsOwner | IsWarehouse]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('status', 'dealer', 'is_reserve')
    search_fields = ('display_no', 'dealer__name')
    ordering_fields = ('created_at', 'value_date', 'total_usd')

    def perform_create(self, serializer):
        serializer.save()

    def _set_status(self, order: Order, new_status: str | None):
        if not new_status:
            raise ValidationError({'status': 'Status is required.'})
        if new_status not in dict(Order.Status.choices):
            raise ValidationError({'status': 'Invalid status value.'})
        allowed = STATUS_FLOW.get(order.status, set())
        if allowed and new_status not in allowed:
            raise ValidationError({'status': f'{order.status} -> {new_status} is not permitted.'})
        order._status_actor = self.request.user
        order.status = new_status
        order.save(update_fields=['status'])

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        order = self.get_object()
        self._set_status(order, request.data.get('status'))
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['patch'], url_path='status')
    def patch_status(self, request, pk=None):
        order = self.get_object()
        self._set_status(order, request.data.get('status'))
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


class OrderExportExcelView(APIView):
    permission_classes = [IsAdmin | IsOwner | IsSales]

    def get(self, request):
        orders = Order.objects.select_related('dealer').all()
        file_path = export_orders_to_excel(orders)
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
