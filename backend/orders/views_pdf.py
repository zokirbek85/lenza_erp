from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from rest_framework.views import APIView
from weasyprint import HTML

from core.permissions import IsAdmin, IsOwner, IsSales
from core.utils.company_info import get_company_info

from .models import Order


class OrderInvoiceView(APIView):
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.prefetch_related('items__product', 'dealer'), pk=pk)
        html = render_to_string(
            'orders/invoice.html',
            {
                'order': order,
                'items': order.items.all(),
                'company': get_company_info(),
            },
        )
        pdf = HTML(string=html).write_pdf()
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{order.display_no}.pdf"'
        return response


class OrderSummaryPDFView(APIView):
    permission_classes = [IsAdmin | IsSales | IsOwner]

    def get(self, request):
        orders = Order.objects.select_related('dealer').prefetch_related('items').all()
        html = render_to_string(
            'reports/orders_report.html',
            {
                'orders': orders,
            },
        )
        pdf = HTML(string=html).write_pdf()
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="orders_report.pdf"'
        return response
