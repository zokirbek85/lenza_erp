from pathlib import Path
from datetime import datetime, date
from decimal import Decimal
from django.db.models import Sum, Q

from django.http import FileResponse, HttpResponse
from django.utils.text import slugify
from django_filters import rest_framework as filters
from rest_framework import filters as drf_filters, status
from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action

from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales, IsWarehouse
from core.utils.company_info import get_company_info
from core.mixins.export_mixins import ExportMixin
from core.utils.exporter import export_reconciliation_to_excel
from services.reconciliation import get_reconciliation_data

from .models import Dealer, Region
from .serializers import DealerSerializer, RegionSerializer
from .utils.excel_tools import (
    export_dealers_to_excel,
    generate_dealer_import_template,
    import_dealers_from_excel,
)


class DealerFilter(filters.FilterSet):
    region_id = filters.NumberFilter(field_name='region_id')

    class Meta:
        model = Dealer
        fields = ('is_active', 'region_id')


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.select_related('manager_user').all()
    serializer_class = RegionSerializer
    permission_classes = [IsAdmin | IsOwner | IsAccountant | IsSales | IsWarehouse]
    filter_backends = (filters.DjangoFilterBackend, drf_filters.SearchFilter)
    filterset_fields = ('manager_user',)
    search_fields = ('name',)


class DealerViewSet(viewsets.ModelViewSet):
    queryset = Dealer.objects.select_related('region', 'manager_user').all()
    serializer_class = DealerSerializer
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner | IsWarehouse]
    filterset_class = DealerFilter
    search_fields = ('name', 'code', 'contact', 'phone', 'address')
    ordering_fields = ('name', 'created_at', 'code')
    filter_backends = (filters.DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)

    def get_queryset(self):
        """
        Sales (menejer) roli faqat o'ziga tayinlangan dilerlarni ko'radi.
        Boshqa rollar barcha dilerlarni ko'radi.
        
        For list actions, uses optimized with_balances() to eliminate N+1 queries.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Use optimized queryset for list views
        if self.action == 'list':
            queryset = queryset.with_balances()
        
        # Superuser va admin/owner/accountant barcha dilerlarni ko'radi
        if user.is_superuser or getattr(user, 'role', None) in ['admin', 'owner', 'accountant']:
            return queryset
        
        # Sales (menejer) faqat o'ziga tayinlangan dilerlarni ko'radi
        if getattr(user, 'role', None) == 'sales':
            return queryset.filter(manager_user=user)
        
        # Warehouse hamma dilerlarni ko'radi (order delivery uchun kerak)
        return queryset

    @action(detail=False, methods=['get'], url_path='list-all')
    def list_all(self, request):
        """
        Unpaginated dealer list for dropdowns.
        Respects role-based visibility from get_queryset.
        Uses lightweight serializer without computed debt fields.
        """
        from .serializers import DealerListSerializer
        
        queryset = self.filter_queryset(self.get_queryset()).order_by('name')
        serializer = DealerListSerializer(queryset, many=True)
        return Response(serializer.data)


class DealerExportExcelView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        file_path = Path(export_dealers_to_excel())
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response


class DealerImportTemplateView(APIView):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        file_path = Path(generate_dealer_import_template())
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response


class DealerImportExcelView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({'detail': 'Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_dealers_from_excel(excel_file)
        return Response(result, status=status.HTTP_201_CREATED)


class DealerBalancePDFView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        dealers = Dealer.objects.select_related('region').all()
        return self.render_pdf_with_qr(
            'reports/dealer_balance.html',
            {'dealers': dealers},
            filename_prefix='dealer_balances',
            request=request,
            doc_type='dealer-balances',
            doc_id='bulk',
        )


class DealerExportPDFView(APIView, ExportMixin):
    """
    Export dealers report with orders, payments breakdown by type, and final debt.
    Shows data for selected period with proper currency conversion to USD.
    
    GET /api/dealers/export/pdf/?start_date=2025-11-01&end_date=2025-11-30
    """
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        from orders.models import Order
        from finance.models import FinanceTransaction
        
        # Get date range from query params
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Default to current month if not provided
        if not start_date_str or not end_date_str:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            # Last day of current month
            from calendar import monthrange
            last_day = monthrange(today.year, today.month)[1]
            end_date = date(today.year, today.month, last_day)
        else:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Get all dealers
        dealers = Dealer.objects.select_related('region', 'manager_user').all().order_by('name')
        
        dealers_data = []
        for idx, dealer in enumerate(dealers, start=1):
            # 1. Calculate opening balance (balance before start_date)
            # Get all orders before start_date
            orders_before = Order.objects.filter(
                dealer=dealer,
                value_date__lt=start_date,
                status__in=['confirmed', 'packed', 'shipped', 'delivered'],
                is_imported=False,
            ).aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
            
            # Get all returns before start_date
            returns_before = Order.objects.filter(
                dealer=dealer,
                value_date__lt=start_date,
                status='returned',
                is_imported=False,
            ).aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
            
            from orders.models import OrderReturn
            from returns.models import Return
            
            order_returns_before = OrderReturn.objects.filter(
                order__dealer=dealer,
                created_at__date__lt=start_date,
            ).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
            
            return_items_before = Return.objects.filter(
                dealer=dealer,
                created_at__date__lt=start_date,
            ).aggregate(total=Sum('total_sum'))['total'] or Decimal('0')
            
            # Get all payments before start_date
            payments_before = FinanceTransaction.objects.filter(
                dealer=dealer,
                type=FinanceTransaction.TransactionType.INCOME,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                date__lt=start_date,
            ).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
            
            # Get all refunds before start_date
            refunds_before = FinanceTransaction.objects.filter(
                dealer=dealer,
                type=FinanceTransaction.TransactionType.DEALER_REFUND,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                date__lt=start_date,
            ).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
            
            # Opening balance = dealer.opening_balance + orders - returns - payments + refunds
            opening_balance = (
                dealer.opening_balance_usd +
                orders_before -
                returns_before -
                order_returns_before -
                return_items_before -
                payments_before +
                refunds_before
            )
            
            # 2. Calculate orders sum (completed/shipped only) for the period
            orders_total = Order.objects.filter(
                dealer=dealer,
                value_date__gte=start_date,
                value_date__lte=end_date,
                status__in=['confirmed', 'packed', 'shipped', 'delivered'],
                is_imported=False,
            ).aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
            
            # 3. Calculate returns for the period
            returns_total = Order.objects.filter(
                dealer=dealer,
                value_date__gte=start_date,
                value_date__lte=end_date,
                status='returned',
                is_imported=False,
            ).aggregate(total=Sum('total_usd'))['total'] or Decimal('0')
            
            order_returns = OrderReturn.objects.filter(
                order__dealer=dealer,
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
            ).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
            
            return_items_sum = Return.objects.filter(
                dealer=dealer,
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
            ).aggregate(total=Sum('total_sum'))['total'] or Decimal('0')
            
            # Total returns for period
            total_returns = returns_total + order_returns + return_items_sum
            
            # 4. Get payments by type for the period
            # All payments are income transactions
            payments = FinanceTransaction.objects.filter(
                dealer=dealer,
                type=FinanceTransaction.TransactionType.INCOME,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                date__gte=start_date,
                date__lte=end_date,
            ).select_related('account')
            
            # Split by account type (cash/card/bank)
            cash_income = Decimal('0')
            card_income = Decimal('0')
            bank_income = Decimal('0')
            
            for payment in payments:
                # Get amount in USD (convert if needed)
                amount_usd = payment.amount_usd or Decimal('0')
                
                # Account type mapping from FinanceAccount
                if payment.account:
                    account_type = payment.account.type
                    if account_type == 'cash':
                        cash_income += amount_usd
                    elif account_type == 'card':
                        card_income += amount_usd
                    elif account_type == 'bank':
                        bank_income += amount_usd
                    else:
                        # Default to cash if unknown
                        cash_income += amount_usd
                else:
                    # No account - default to cash
                    cash_income += amount_usd
            
            total_income = cash_income + card_income + bank_income
            
            # 5. Get refunds for the period (money returned to dealer)
            refunds_period = FinanceTransaction.objects.filter(
                dealer=dealer,
                type=FinanceTransaction.TransactionType.DEALER_REFUND,
                status=FinanceTransaction.TransactionStatus.APPROVED,
                date__gte=start_date,
                date__lte=end_date,
            ).aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')
            
            # Final debt formula:
            # Opening Balance + Orders - Returns - Payments + Refunds
            final_debt = opening_balance + orders_total - total_returns - total_income + refunds_period
            
            dealers_data.append({
                'index': idx,
                'dealer': dealer,
                'opening_balance': f"{float(opening_balance):,.2f}",
                'orders_sum': f"{float(orders_total):,.2f}",
                'returns_sum': f"{float(total_returns):,.2f}",
                'cash_income': f"{float(cash_income):,.2f}",
                'card_income': f"{float(card_income):,.2f}",
                'bank_income': f"{float(bank_income):,.2f}",
                'total_income': f"{float(total_income):,.2f}",
                'refunds': f"{float(refunds_period):,.2f}",
                'final_debt': f"{float(final_debt):,.2f}",
                'final_debt_raw': float(final_debt),  # For conditional formatting
            })
        
        # Prepare context for template
        # Get language from Accept-Language header
        lang = request.headers.get('Accept-Language', 'uz')[:2]
        
        context = {
            'dealers_data': dealers_data,
            'start_date': start_date.strftime('%d.%m.%Y'),
            'end_date': end_date.strftime('%d.%m.%Y'),
            'generated_date': date.today().strftime('%d.%m.%Y'),
            'LANGUAGE_CODE': lang,
        }
        
        filename = f'dealers_report_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.pdf'
        
        return self.render_pdf_simple(
            template_path='reports/dealers_export.html',
            context=context,
            filename=filename,
            request=request,
        )


class DealerReconciliationView(APIView):
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        detailed = request.query_params.get('detailed') == 'true'
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
            detailed=detailed,
        )

        def _serialize_entry(entry):
            formatted = entry.copy()
            value = formatted.get('date')
            if hasattr(value, 'isoformat'):
                formatted['date'] = value.isoformat()
            return formatted

        payload = {
            'dealer': data['dealer'],
            'dealer_code': data['dealer_code'],
            'period': data['period'],
            'opening_balance': data['opening_balance'],
            'closing_balance': data['closing_balance'],
            'orders': [_serialize_entry(order) for order in data['orders']],
            'payments': [_serialize_entry(payment) for payment in data['payments']],
            'returns': [_serialize_entry(item) for item in data['returns']],
            'movements': [_serialize_entry(item) for item in data['movements']],
            'generated_at': data['generated_at'].isoformat(),
            'from_date': data['from_date'].isoformat(),
            'to_date': data['to_date'].isoformat(),
        }
        if data.get('detailed'):
            def _serialize_order_detail(entry):
                formatted = entry.copy()
                value = formatted.get('date')
                if hasattr(value, 'isoformat'):
                    formatted['date'] = value.isoformat()
                return formatted

            payload['detailed'] = True
            payload['orders_detailed'] = [_serialize_order_detail(o) for o in data.get('orders_detailed', [])]
        return Response(payload)


class DealerReconciliationPDFView(APIView):
    """
    Generate professional reconciliation PDF using document system.
    
    GET /api/dealers/{id}/reconciliation/pdf/
    """
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        from documents import ReconciliationDocument
        
        # Get language from Accept-Language header
        lang = request.headers.get('Accept-Language', 'uz')[:2]
        
        # Get reconciliation data
        detailed = request.query_params.get('detailed') == 'true'
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
            detailed=detailed,
        )
        
        # Generate reconciliation using document system
        reconciliation = ReconciliationDocument(
            data=data,
            show_detailed=detailed,
            language=lang,
        )
        
        dealer_slug = slugify(data['dealer']) or f'dealer-{pk}'
        statement_date = data['to_date'].strftime('%Y%m%d')
        filename = f'reconciliation_{dealer_slug}_{statement_date}.pdf'
        
        return reconciliation.get_response(filename=filename, inline=True)


class DealerReconciliationExcelView(APIView):
    permission_classes = [IsAdmin | IsSales | IsAccountant | IsOwner]

    def get(self, request, pk: int):
        # Get language from Accept-Language header
        lang = request.headers.get('Accept-Language', 'uz')
        
        detailed = request.query_params.get('detailed') == 'true'
        data = get_reconciliation_data(
            dealer_id=pk,
            from_date=request.query_params.get('from_date'),
            to_date=request.query_params.get('to_date'),
            user=request.user,
            detailed=detailed,
        )
        file_path = Path(export_reconciliation_to_excel(data, detailed=detailed, language=lang))
        dealer_slug = slugify(data['dealer']) or f'dealer-{pk}'
        filename = f"reconciliation_{dealer_slug}.xlsx"
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response
