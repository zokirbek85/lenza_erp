from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from documents import ReturnInvoiceDocument
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
    
    @action(detail=True, methods=['get'], url_path='export-pdf')
    def export_pdf(self, request, pk=None):
        """
        Export individual return document as PDF.
        
        GET /api/returns/{id}/export-pdf/
        
        Returns:
            PDF file download with return details, items table, totals, and QR code
        """
        return_document = get_object_or_404(
            Return.objects.select_related('dealer', 'created_by')
            .prefetch_related('items__product__brand', 'items__product__category'),
            pk=pk
        )
        
        # Get language from request headers
        language = request.headers.get('Accept-Language', 'uz')[:2]
        
        # Generate return invoice PDF
        invoice = ReturnInvoiceDocument(
            return_document=return_document,
            request=request,
            show_qr=True,
            language=language,
        )
        
        filename = f'return_{return_document.id}.pdf'
        return invoice.get_response(filename=filename, inline=False)
