"""
Ledger Export Views - API Endpoints
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from core.permissions import IsAdmin, IsAccountant, IsOwner
from .utils import generate_ledger_pdf, generate_ledger_excel


@api_view(['GET'])
@permission_classes([IsAdmin | IsAccountant | IsOwner])
def ledger_export_view(request):
    """
    Kassa eksporti - PDF yoki XLSX
    GET /api/ledger/export/?date_from=2025-01-01&date_to=2025-12-31&currency=USD&format=pdf
    """
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    currency = request.query_params.get('currency', 'USD')
    fmt = request.query_params.get('format', 'xlsx').lower()
    
    if fmt not in ['pdf', 'xlsx']:
        return Response({'error': 'format pdf yoki xlsx bo\'lishi kerak'}, status=400)
    
    try:
        if fmt == 'pdf':
            return generate_ledger_pdf(date_from, date_to, currency)
        else:
            return generate_ledger_excel(date_from, date_to, currency)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Export error: {e}", exc_info=True)
        return Response({'error': str(e)}, status=500)
