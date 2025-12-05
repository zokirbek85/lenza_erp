from decimal import Decimal

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Return, ReturnItem
from .serializers import ReturnSerializer
from .permissions import IsReturnEditor


class ReturnViewSet(viewsets.ModelViewSet):
    queryset = (
        Return.objects.select_related('dealer', 'created_by')
        .prefetch_related('items', 'items__product', 'items__product__brand', 'items__product__category')
        .all()
    )
    serializer_class = ReturnSerializer
    permission_classes = [IsAuthenticated & IsReturnEditor]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """
        Delete return document (admin only).
        Rollback stock and dealer debt changes.
        """
        instance = self.get_object()
        
        # Rollback stock changes
        items = instance.items.select_related('product').all()
        for item in items:
            qty = item.quantity
            product = item.product
            if item.status == ReturnItem.Status.HEALTHY:
                product.stock_ok = (product.stock_ok or Decimal('0')) - qty
                product.save(update_fields=['stock_ok'])
            else:
                product.stock_defect = (product.stock_defect or Decimal('0')) - qty
                product.save(update_fields=['stock_defect'])
        
        # Rollback dealer debt
        dealer = instance.dealer
        total_sum = instance.total_sum
        if hasattr(dealer, 'debt_usd'):
            dealer.debt_usd = (dealer.debt_usd or Decimal('0.00')) + total_sum
            dealer.save(update_fields=['debt_usd'])
        
        # Delete the return document
        instance.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
