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
    OrderReturnSerializer,
    DealerProductSerializer
)
from .permissions import IsDealerAuthenticated
from dealers.models import Dealer
from orders.models import Order, OrderReturn
from finance.models import FinanceTransaction
from returns.models import Return
from catalog.models import Product
from core.mixins.export_mixins import ExportMixin
from services.reconciliation import get_reconciliation_data


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
@permission_classes([AllowAny])
def dealer_logout(request):
    """
    Dealer logout endpoint.
    Destroys session.
    """
    try:
        request.session.flush()
    except Exception:
        pass  # Ignore any session errors
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


class DealerOrderViewSet(viewsets.ReadOnlyModelViewSet, ExportMixin):
    """
    ViewSet for dealer to view their orders.
    Read-only access with detail view and PDF export.
    """
    serializer_class = DealerOrderSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]

    def get_queryset(self):
        """Return only orders for the authenticated dealer, excluding cancelled orders."""
        dealer = self.request.user
        return Order.objects.filter(
            dealer=dealer
        ).exclude(
            status='cancelled'
        ).prefetch_related(
            'items__product',
            'created_by'
        ).order_by('-created_at')

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        Export single order as PDF.
        """
        order = self.get_object()
        
        # Get logo as base64
        from django.conf import settings
        import os
        import base64
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')
        try:
            with open(logo_path, 'rb') as f:
                logo_base64 = base64.b64encode(f.read()).decode('utf-8')
                logo_data_uri = f'data:image/png;base64,{logo_base64}'
        except:
            logo_data_uri = ''

        context = {
            'order': order,
            'dealer': order.dealer,
            'items': order.items.all(),
            'logo_path': logo_data_uri,
        }

        return self.render_pdf_with_qr(
            template_path='dealer_portal/order_pdf.html',
            context=context,
            filename_prefix=f'order_{order.display_no}',
            request=request,
            doc_type='order',
            doc_id=order.id
        )


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
            type='income'
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
        import base64
        
        # Get logo as base64
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')
        try:
            with open(logo_path, 'rb') as f:
                logo_base64 = base64.b64encode(f.read()).decode('utf-8')
                logo_data_uri = f'data:image/png;base64,{logo_base64}'
        except:
            logo_data_uri = ''

        context = {
            'dealer': dealer,
            'transactions': transactions,
            'total_usd': sum(t.amount_usd for t in transactions),
            'total_uzs': sum(t.amount_uzs for t in transactions),
            'logo_path': logo_data_uri,
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
        import base64
        
        # Get logo as base64
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')
        try:
            with open(logo_path, 'rb') as f:
                logo_base64 = base64.b64encode(f.read()).decode('utf-8')
                logo_data_uri = f'data:image/png;base64,{logo_base64}'
        except:
            logo_data_uri = ''

        context = {
            'dealer': dealer,
            'returns': returns,
            'order_returns': order_returns,
            'logo_path': logo_data_uri
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')

        context = {
            'dealer': dealer,
            'returns': returns,
            'order_returns': order_returns,
            'logo_path': logo_path,
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
            type='dealer_refund'
        ).select_related(
            'account',
            'created_by'
        ).order_by('-date')

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """
        Export all dealer refunds as PDF.
        """
        import base64
        
        # Get logo as base64
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')
        try:
            with open(logo_path, 'rb') as f:
                logo_base64 = base64.b64encode(f.read()).decode('utf-8')
                logo_data_uri = f'data:image/png;base64,{logo_base64}'
        except:
            logo_data_uri = ''

        context = {
            'dealer': dealer,
            'refunds': refunds,
            'total_usd': sum(r.amount_usd for r in refunds),
            'total_uzs': sum(r.amount_uzs for r in refunds),
            'logo_path': logo_data_uriettings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')

        context = {
            'dealer': dealer,
            'refunds': refunds,
            'total_usd': sum(r.amount_usd for r in refunds),
            'total_uzs': sum(r.amount_uzs for r in refunds),
            'logo_path': logo_path,
        }

        html_string = render_to_string('dealer_portal/refunds_report.html', context)
        html = HTML(string=html_string)
        pdf_content = html.write_pdf()

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="refunds_{dealer.code}.pdf"'
        return response


@api_view(['GET'])
@permission_classes([IsDealerAuthenticated])
def dealer_reconciliation(request):
    """
    Get reconciliation (akt sverka) data for authenticated dealer.
    Query params: from_date, to_date (format: YYYY-MM-DD)
    """
    dealer = request.user  # This is the Dealer instance
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    # Create a mock user object for reconciliation service
    # The service expects a user object with role attribute
    class DealerUser:
        def __init__(self, dealer):
            self.dealer = dealer
            self.is_superuser = False
            self.role = 'dealer'  # Special role for dealers

    mock_user = DealerUser(dealer)

    try:
        data = get_reconciliation_data(
            dealer_id=dealer.id,
            from_date=from_date,
            to_date=to_date,
            user=mock_user,
            detailed=False
        )
        return Response(data)
    except Exception as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsDealerAuthenticated])
def dealer_reconciliation_pdf(request):
    """
    Export reconciliation (akt sverka) as PDF for authenticated dealer.
    Query params: from_date, to_date (format: YYYY-MM-DD)
    """
    dealer = request.user
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    class DealerUser:
        def __init__(self, dealer):
            self.dealer = dealer
            self.is_superuser = False
            self.role = 'dealer'

    mock_user = DealerUser(dealer)
import base64
        
        # Get logo as base64
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')
        try:
            with open(logo_path, 'rb') as f:
                logo_base64 = base64.b64encode(f.read()).decode('utf-8')
                logo_data_uri = f'data:image/png;base64,{logo_base64}'
        except:
            logo_data_uri = ''
        data['logo_path'] = logo_data_uri
            from_date=from_date,
            to_date=to_date,
            user=mock_user,
            detailed=False
        )

        from django.template.loader import render_to_string
        from weasyprint import HTML
        from django.conf import settings
        import os
        
        # Get logo path
        logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo-lenza-light.png')
        data['logo_path'] = logo_path

        html_string = render_to_string('dealer_portal/reconciliation_pdf.html', data)
        html = HTML(string=html_string)
        pdf_content = html.write_pdf()

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="akt_sverka_{dealer.code}_{from_date}_{to_date}.pdf"'
        return response
    except Exception as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


class DealerProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dealer to view product catalog with stock information.
    Read-only access, no prices or editing.
    """
    serializer_class = DealerProductSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]
    filterset_fields = ['category', 'brand']
    search_fields = ['name', 'sku']
    pagination_class = None  # Disable pagination to return all products

    def get_queryset(self):
        """Return all products with category and brand info."""
        return Product.objects.select_related('category', 'brand').all().order_by('name')
