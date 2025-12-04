from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsOwner, IsSales
from core.utils.company_info import get_company_info
from core.mixins.export_mixins import ExportMixin

from .models import Order


class OrderInvoiceView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.prefetch_related('items__product', 'dealer'), pk=pk)
        
        # Get exchange rate on order date
        from finance.models import ExchangeRate
        rate = ExchangeRate.objects.filter(
            rate_date__lte=order.value_date
        ).order_by('-rate_date').first()
        
        if not rate:
            # Fallback to latest rate if none found for order date
            rate = ExchangeRate.objects.order_by('-rate_date').first()
        
        currency_rate = rate.usd_to_uzs if rate else 12700
        currency_rate_date = rate.rate_date if rate else order.value_date
        
        context = {
            'order': order,
            'items': order.items.all(),
            'company': get_company_info(),
            'currency_rate': currency_rate,
            'currency_rate_date': currency_rate_date,
        }
        return self.render_pdf_with_qr(
            'orders/invoice.html',
            context,
            filename_prefix=order.display_no,
            request=request,
            doc_type='order',
            doc_id=order.pk,
        )


class OrderSummaryPDFView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request):
        orders = Order.objects.select_related('dealer').prefetch_related('items').all()
        context = {
            'orders': orders,
        }
        return self.render_pdf_with_qr(
            'reports/orders_report.html',
            context,
            filename_prefix='orders_report',
            request=request,
            doc_type='orders-report',
            doc_id='bulk',
        )
