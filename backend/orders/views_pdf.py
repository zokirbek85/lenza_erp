from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsOwner, IsSales
from documents import InvoiceDocument

from .models import Order


class OrderInvoiceView(APIView):
    """
    Generate professional invoice PDF using document system.
    
    GET /api/orders/{id}/invoice/
    """
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.prefetch_related('items__product', 'dealer'),
            pk=pk
        )
        
        # Generate invoice using document system
        invoice = InvoiceDocument(
            order=order,
            request=request,
            show_qr=True,
            language=request.headers.get('Accept-Language', 'uz')[:2],
        )
        
        filename = f'invoice_{order.display_no}.pdf'
        return invoice.get_response(filename=filename, inline=True)


class OrderSummaryPDFView(APIView):
    """
    Generate orders summary report (legacy view - kept for backward compatibility).
    Consider using new document system in future.
    """
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request):
        from core.mixins.export_mixins import ExportMixin
        
        orders = Order.objects.select_related('dealer').prefetch_related('items').all()
        context = {
            'orders': orders,
        }
        
        # Use legacy export mixin temporarily
        mixin = ExportMixin()
        return mixin.render_pdf_with_qr(
            'reports/orders_report.html',
            context,
            filename_prefix='orders_report',
            request=request,
            doc_type='orders-report',
            doc_id='bulk',
        )
