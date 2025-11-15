from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAccountant, IsAdmin, IsOwner
from .report_utils import (
    build_monthly_payload,
    build_pdf_context,
    render_pdf_response,
    render_xlsx_response,
    resolve_date_range,
)


class MonthlyExpenseReportView(APIView):
    """Aggregated monthly expenses summary with export support."""

    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    format_kwarg = None

    def get(self, request):
        fmt = request.query_params.get('format', 'json').lower()
        month_raw = request.query_params.get('month')
        date_from = request.query_params.get('from') or request.query_params.get('date_from')
        date_to = request.query_params.get('to') or request.query_params.get('date_to')

        try:
            start_date, end_date, month_label = resolve_date_range(month_raw, date_from, date_to)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payload = build_monthly_payload(start_date, end_date, month_label)

        if fmt == 'json':
            return Response(payload)
        if fmt == 'pdf':
            context = build_pdf_context(request, payload)
            return render_pdf_response(
                request,
                context,
                month_label,
                template='expenses/export_monthly_pdf.html',
            )
        if fmt == 'xlsx':
            return render_xlsx_response(payload)

        return Response({'detail': 'format must be json, pdf, or xlsx'}, status=status.HTTP_400_BAD_REQUEST)
