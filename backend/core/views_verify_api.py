"""
API endpoints for document verification (QR code scanning).
These endpoints are public (AllowAny) and return JSON data.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_order(request, id):
    """
    Public endpoint to verify an order document via QR code.
    Returns JSON with order details if valid.
    """
    try:
        from orders.models import Order
        from dealers.models import Dealer
    except Exception:
        return Response({'valid': False, 'error': 'System error'}, status=500)
    
    try:
        order = get_object_or_404(Order, pk=id)
        dealer = order.dealer
        
        return Response({
            'valid': True,
            'id': order.id,
            'order_number': order.display_no,
            'dealer': dealer.name if dealer else 'N/A',
            'dealer_code': dealer.code if dealer else 'N/A',
            'date': order.value_date.isoformat() if order.value_date else order.created_at.date().isoformat(),
            'total_usd': float(order.total_usd or 0),
            'total_uzs': float(order.total_uzs or 0),
            'status': order.status,
            'status_display': order.get_status_display(),
            'created_at': order.created_at.isoformat(),
        })
    except Exception as e:
        return Response({'valid': False, 'error': str(e)}, status=404)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_reconciliation(request, id):
    """
    Public endpoint to verify a reconciliation document via QR code.
    Returns JSON with reconciliation summary if valid.
    
    Note: Reconciliation documents are generated on-the-fly, so we verify
    by checking if the dealer exists and returning a summary.
    The ID here represents the dealer_id used in the reconciliation.
    """
    try:
        from dealers.models import Dealer
    except Exception:
        return Response({'valid': False, 'error': 'System error'}, status=500)
    
    try:
        # For reconciliation, the ID in QR is the dealer ID
        dealer = get_object_or_404(Dealer, pk=id)
        
        return Response({
            'valid': True,
            'id': dealer.id,
            'dealer': dealer.name,
            'dealer_code': dealer.code,
            'region': dealer.region.name if dealer.region else 'N/A',
            'opening_balance': float(dealer.opening_balance_usd or 0),
            'phone': dealer.phone_number or 'N/A',
            'type': 'reconciliation',
            'note': 'Akt sverka hujjati tasdiqlangan',
        })
    except Exception as e:
        return Response({'valid': False, 'error': str(e)}, status=404)
