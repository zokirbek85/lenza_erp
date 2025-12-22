"""
Dealer portal views.
Provides API endpoints for dealer self-service portal.
"""
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q

from .authentication import authenticate_dealer, DealerAuthentication
from .serializers import (
    DealerLoginSerializer,
    DealerProfileSerializer,
    DealerOrderSerializer,
    DealerPaymentSerializer,
    DealerReturnSerializer,
    OrderReturnSerializer
)
from .permissions import IsDealerAuthenticated
from dealers.models import Dealer
from orders.models import Order, OrderReturn
from finance.models import FinanceTransaction
from returns.models import Return


@api_view(['POST'])
@permission_classes([AllowAny])
def dealer_login(request):
    """
    Dealer login endpoint.
    Authenticates dealer and creates session.
    """
    serializer = DealerLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    username = serializer.validated_data['username']
    password = serializer.validated_data['password']

    dealer = authenticate_dealer(username, password)

    if dealer is None:
        return Response(
            {'detail': 'Invalid credentials or portal access disabled.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Create session
    request.session['dealer_id'] = dealer.id
    request.session['dealer_code'] = dealer.code

    # Return dealer profile
    profile_serializer = DealerProfileSerializer(dealer)
    return Response({
        'dealer': profile_serializer.data,
        'message': 'Login successful'
    })


@api_view(['POST'])
@permission_classes([IsDealerAuthenticated])
def dealer_logout(request):
    """
    Dealer logout endpoint.
    Destroys session.
    """
    request.session.flush()
    return Response({'message': 'Logout successful'})


@api_view(['GET'])
@permission_classes([IsDealerAuthenticated])
def dealer_profile(request):
    """
    Get current dealer profile.
    """
    dealer = request.user  # This is the Dealer instance from DealerAuthentication
    serializer = DealerProfileSerializer(dealer)
    return Response(serializer.data)


class DealerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dealer to view their orders.
    Read-only access with detail view and PDF export.
    """
    serializer_class = DealerOrderSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]

    def get_queryset(self):
        """Return only orders for the authenticated dealer."""
        dealer = self.request.user
        return Order.objects.filter(dealer=dealer).prefetch_related(
            'items__product',
            'created_by'
        ).order_by('-created_at')

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        Export single order as PDF.
        """
        order = self.get_object()

        # Import PDF generation function
        from orders.views import generate_order_pdf

        pdf_content = generate_order_pdf(order)

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="order_{order.display_no}.pdf"'
        return response


class DealerPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dealer to view their payments.
    Read-only access with detail view and PDF export.
    """
    serializer_class = DealerPaymentSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]

    def get_queryset(self):
        """Return only payments for the authenticated dealer."""
        dealer = self.request.user
        return FinanceTransaction.objects.filter(
            dealer=dealer,
            type='INCOME'
        ).select_related(
            'account',
            'created_by'
        ).order_by('-date')

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """
        Export all dealer payments as PDF.
        """
        dealer = self.request.user
        transactions = self.get_queryset()

        # Generate PDF using template
        from django.template.loader import render_to_string
        from weasyprint import HTML
        from django.conf import settings
        import os

        context = {
            'dealer': dealer,
            'transactions': transactions,
            'total_usd': sum(t.amount_usd for t in transactions),
            'total_uzs': sum(t.amount_uzs for t in transactions),
        }

        html_string = render_to_string('dealer_portal/payments_report.html', context)
        html = HTML(string=html_string)
        pdf_content = html.write_pdf()

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="payments_{dealer.code}.pdf"'
        return response


class DealerReturnViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dealer to view their returns.
    Includes both Return documents and OrderReturn items.
    """
    serializer_class = DealerReturnSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]

    def get_queryset(self):
        """Return only returns for the authenticated dealer."""
        dealer = self.request.user
        return Return.objects.filter(
            dealer=dealer
        ).prefetch_related(
            'items_set__product',
            'created_by'
        ).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def order_returns(self, request):
        """
        Get order-specific returns for the dealer.
        """
        dealer = self.request.user
        order_returns = OrderReturn.objects.filter(
            order__dealer=dealer
        ).select_related(
            'order',
            'item__product',
            'processed_by'
        ).order_by('-created_at')

        serializer = OrderReturnSerializer(order_returns, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """
        Export all dealer returns as PDF.
        """
        dealer = self.request.user
        returns = self.get_queryset()
        order_returns = OrderReturn.objects.filter(order__dealer=dealer)

        from django.template.loader import render_to_string
        from weasyprint import HTML

        context = {
            'dealer': dealer,
            'returns': returns,
            'order_returns': order_returns,
        }

        html_string = render_to_string('dealer_portal/returns_report.html', context)
        html = HTML(string=html_string)
        pdf_content = html.write_pdf()

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="returns_{dealer.code}.pdf"'
        return response


class DealerRefundViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dealer to view their refunds (dealer_refund transactions).
    """
    serializer_class = DealerPaymentSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]

    def get_queryset(self):
        """Return only refunds for the authenticated dealer."""
        dealer = self.request.user
        return FinanceTransaction.objects.filter(
            dealer=dealer,
            type='DEALER_REFUND'
        ).select_related(
            'account',
            'created_by'
        ).order_by('-date')

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """
        Export all dealer refunds as PDF.
        """
        dealer = self.request.user
        refunds = self.get_queryset()

        from django.template.loader import render_to_string
        from weasyprint import HTML

        context = {
            'dealer': dealer,
            'refunds': refunds,
            'total_usd': sum(r.amount_usd for r in refunds),
            'total_uzs': sum(r.amount_uzs for r in refunds),
        }

        html_string = render_to_string('dealer_portal/refunds_report.html', context)
        html = HTML(string=html_string)
        pdf_content = html.write_pdf()

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="refunds_{dealer.code}.pdf"'
        return response
