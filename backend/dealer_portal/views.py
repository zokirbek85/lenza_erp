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
        returns = self.get_queryset()
        order_returns = OrderReturn.objects.filter(order__dealer=dealer)

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
            'returns': returns,
            'order_returns': order_returns,
            'logo_path': logo_data_uri,
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
        dealer = self.request.user
        refunds = self.get_queryset()

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
            'refunds': refunds,
            'total_usd': sum(r.amount_usd for r in refunds),
            'total_uzs': sum(r.amount_uzs for r in refunds),
            'logo_path': logo_data_uri,
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

    try:
        data = get_reconciliation_data(
            dealer_id=dealer.id,
            from_date=from_date,
            to_date=to_date,
            user=mock_user,
            detailed=False
        )

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
        data['logo_path'] = logo_data_uri

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


# ==================== CART VIEWS ====================

class DealerCartViewSet(viewsets.ModelViewSet):
    """
    ViewSet for dealer shopping cart management.
    Dealers can view cart, add/update/remove items, and submit orders.
    """
    serializer_class = DealerCartSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        """Return cart for current dealer."""
        from .models import DealerCart
        dealer = self.request.user.dealer
        return DealerCart.objects.filter(dealer=dealer).prefetch_related('items__product')

    def get_object(self):
        """Get or create cart for current dealer."""
        from .models import DealerCart
        dealer = self.request.user.dealer
        cart, created = DealerCart.objects.get_or_create(dealer=dealer)
        return cart

    def list(self, request, *args, **kwargs):
        """Get current dealer's cart."""
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add product to cart or update quantity if already exists."""
        from .models import DealerCart, DealerCartItem
        from .serializers import AddToCartSerializer
        from catalog.models import Product

        # Validate input
        input_serializer = AddToCartSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        product_id = input_serializer.validated_data['product_id']
        quantity = input_serializer.validated_data['quantity']

        # Get or create cart
        dealer = request.user.dealer
        cart, _ = DealerCart.objects.get_or_create(dealer=dealer)

        # Get product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Mahsulot topilmadi'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if item already in cart
        cart_item, created = DealerCartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            # Update quantity if item already exists
            cart_item.quantity += quantity
            # Validate stock again
            if product.stock_ok < cart_item.quantity:
                return Response({
                    'error': f"Omborda yetarli mahsulot yo'q. Mavjud: {product.stock_ok} {product.unit}"
                }, status=status.HTTP_400_BAD_REQUEST)
            cart_item.save()

        # Return updated cart
        cart_serializer = DealerCartSerializer(cart)
        return Response({
            'message': 'Mahsulot savatchaga qo\'shildi' if created else 'Miqdor yangilandi',
            'cart': cart_serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear all items from cart."""
        cart = self.get_object()
        cart.clear()
        return Response({
            'message': 'Savatcha tozalandi'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def submit_order(self, request):
        """Create order from cart items."""
        from .models import DealerCart
        from orders.models import Order, OrderItem
        from catalog.models import Product
        from django.db import transaction
        from core.utils.currency import get_exchange_rate

        cart = self.get_object()

        # Validate cart has items
        if not cart.items.exists():
            return Response({
                'error': 'Savatcha bo\'sh'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate all items have sufficient stock
        for item in cart.items.all():
            if item.product.stock_ok < item.quantity:
                return Response({
                    'error': f"{item.product.name}: Omborda yetarli mahsulot yo'q. Mavjud: {item.product.stock_ok} {item.product.unit}"
                }, status=status.HTTP_400_BAD_REQUEST)

        # Create order atomically
        try:
            with transaction.atomic():
                # Get exchange rate
                exchange_rate, rate_date = get_exchange_rate()

                # Create order
                order = Order.objects.create(
                    dealer=request.user.dealer,
                    created_by=request.user,
                    status=Order.Status.CREATED,
                    note=request.data.get('note', ''),
                    exchange_rate=exchange_rate,
                    exchange_rate_date=rate_date
                )

                # Create order items from cart
                for cart_item in cart.items.all():
                    OrderItem.objects.create(
                        order=order,
                        product=cart_item.product,
                        qty=cart_item.quantity,
                        price_usd=cart_item.product.price_usd,
                        price_at_time=cart_item.product.price_usd,
                        currency='USD',
                        status=OrderItem.ItemStatus.RESERVED
                    )

                # Recalculate order totals
                order.recalculate_totals()
                order.save()

                # Clear cart
                cart.clear()

                # Send Telegram notification to manager
                try:
                    self._send_telegram_notification(order, request.user.dealer)
                except Exception as e:
                    # Log error but don't fail the order creation
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send Telegram notification: {e}")

                return Response({
                    'message': 'Buyurtma muvaffaqiyatli yaratildi',
                    'order_id': order.id,
                    'order_number': order.display_no
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': f'Buyurtma yaratishda xatolik: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _send_telegram_notification(self, order, dealer):
        """Send Telegram notification to manager about new order."""
        import requests
        import os

        # Get bot token and chat ID from settings/env
        bot_token = os.getenv('TELEGRAM_BOT_TOKEN')

        # Get manager's telegram chat ID
        if dealer.manager_user and hasattr(dealer.manager_user, 'telegram_chat_id'):
            chat_id = dealer.manager_user.telegram_chat_id
        else:
            # Fallback to group chat
            chat_id = os.getenv('TELEGRAM_MANAGER_CHAT_ID')

        if not bot_token or not chat_id:
            return  # Telegram not configured

        # Format message
        items_text = "\n".join([
            f"  • {item.product.name} - {item.qty} {item.product.unit} x ${item.price_usd} = ${item.qty * item.price_usd}"
            for item in order.items.all()
        ])

        message = f"""
🆕 YANGI BUYURTMA

📦 Buyurtma: #{order.display_no}
👤 Diler: {dealer.name}
📅 Sana: {order.created_at.strftime('%d.%m.%Y %H:%M')}

📋 Mahsulotlar:
{items_text}

💰 Jami: ${order.total_usd}

Buyurtmani tasdiqlash uchun tizimga kiring:
https://erp.lenza.uz/orders
        """.strip()

        # Send message
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        requests.post(url, json=data, timeout=5)


class DealerCartItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual cart items.
    Dealers can update quantity or remove items.
    """
    from .serializers import DealerCartItemSerializer
    serializer_class = DealerCartItemSerializer
    permission_classes = [IsDealerAuthenticated]
    authentication_classes = [DealerAuthentication]
    http_method_names = ['patch', 'delete']

    def get_queryset(self):
        """Return cart items for current dealer."""
        from .models import DealerCartItem
        dealer = self.request.user.dealer
        return DealerCartItem.objects.filter(cart__dealer=dealer).select_related('product')

    def partial_update(self, request, *args, **kwargs):
        """Update item quantity."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Miqdor yangilandi',
            'item': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        """Remove item from cart."""
        instance = self.get_object()
        product_name = instance.product.name
        instance.delete()

        return Response({
            'message': f'{product_name} savatchadan o\'chirildi'
        }, status=status.HTTP_200_OK)
