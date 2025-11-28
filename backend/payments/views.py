from datetime import datetime, timedelta

from django.db import models
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAccountant, IsAdmin, IsOwner, IsSales
from core.utils.exporter import export_payments_to_excel
from core.mixins.report_mixin import BaseReportMixin
from core.mixins.export_mixins import ExportMixin

from .models import (
    CashboxOpeningBalance,
    CurrencyRate,
    Expense,
    ExpenseCategory,
    FinanceLog,
    FinanceSource,
    Payment,
    PaymentCard,
)
from .serializers import (
    CashboxOpeningBalanceSerializer,
    CurrencyRateSerializer,
    ExpenseSerializer,
    ExpenseCategorySerializer,
    FinanceLogSerializer,
    FinanceSourceSerializer,
    PaymentSerializer,
    PaymentCardSerializer,
)


class CurrencyRateViewSet(viewsets.ModelViewSet):
    queryset = CurrencyRate.objects.all()
    serializer_class = CurrencyRateSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner | IsSales]
    filterset_fields = ('rate_date',)
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering = ('-rate_date',)


class PaymentViewSet(viewsets.ModelViewSet, BaseReportMixin, ExportMixin):
    queryset = Payment.objects.select_related('dealer', 'rate', 'card', 'created_by', 'approved_by').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner | IsSales]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = {
        'dealer': ['exact'],
        'currency': ['exact'],
        'method': ['exact'],
        'pay_date': ['gte', 'lte'],
        'status': ['exact'],
    }
    search_fields = ('dealer__name', 'note')
    ordering_fields = ('pay_date', 'amount_usd', 'created_at')
    
    # BaseReportMixin configuration
    date_field = "pay_date"
    filename_prefix = "payments"
    title_prefix = "To'lovlar hisoboti"
    report_template = "payments/report.html"

    def _ensure_can_create(self):
        """Check if user can create payments: sales, accountant, admin"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant', 'sales'}:
            raise PermissionDenied('Only sales, accountant, or admin can create payments.')

    def _ensure_can_approve(self):
        """Check if user can approve/reject payments: accountant, admin only"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin can approve/reject payments.')

    def _ensure_can_modify(self, payment):
        """Check if user can edit/delete: admin/accountant, only if pending"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin can modify payments.')
        if payment.status != Payment.Status.PENDING:
            raise PermissionDenied('Only pending payments can be modified.')

    def perform_create(self, serializer):
        self._ensure_can_create()
        # Set created_by and default status to PENDING
        serializer.save(created_by=self.request.user, status=Payment.Status.PENDING)

    def perform_update(self, serializer):
        self._ensure_can_modify(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_can_modify(instance)
        instance.delete()

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Approve a payment (accountant/admin only)"""
        self._ensure_can_approve()
        payment = self.get_object()
        
        if payment.status == Payment.Status.APPROVED:
            return Response({'detail': 'Payment is already approved.'}, status=400)
        if payment.status == Payment.Status.REJECTED:
            return Response({'detail': 'Cannot approve a rejected payment.'}, status=400)
        
        payment.status = Payment.Status.APPROVED
        payment.approved_by = request.user
        payment.approved_at = timezone.now()
        payment.save()
        
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reject a payment (accountant/admin only)"""
        self._ensure_can_approve()
        payment = self.get_object()
        
        if payment.status == Payment.Status.APPROVED:
            return Response({'detail': 'Cannot reject an approved payment.'}, status=400)
        if payment.status == Payment.Status.REJECTED:
            return Response({'detail': 'Payment is already rejected.'}, status=400)
        
        payment.status = Payment.Status.REJECTED
        payment.approved_by = request.user
        payment.approved_at = timezone.now()
        payment.save()
        
        serializer = self.get_serializer(payment)
        return Response(serializer.data)
    
    def get_report_rows(self, queryset):
        """Generate rows for payment report."""
        from decimal import Decimal
        rows = []
        for p in queryset.order_by('pay_date', 'id'):
            rows.append({
                'Sana': p.pay_date.strftime('%d.%m.%Y') if p.pay_date else '',
                'Diler': p.dealer.name if p.dealer else '',
                'Miqdor': f"{float(p.amount):,.2f}",
                'Valyuta': p.currency,
                'Usul': p.method,
                'Karta': p.card.name if p.card else '',
                'USD': f"{float(p.amount_usd):,.2f}",
                'Izoh': p.note or '',
            })
        return rows
    
    def get_report_total(self, queryset):
        """Calculate total amount in USD."""
        total = queryset.aggregate(models.Sum('amount_usd'))['amount_usd__sum'] or 0
        return total

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Unified export for payments: ?format=pdf|xlsx"""
        fmt = request.query_params.get('format', 'xlsx')
        qs = self.filter_queryset(self.get_queryset())
        rows = [{
            'Sana': (p.pay_date.isoformat() if p.pay_date else ''),
            'Diler': (p.dealer.name if p.dealer else ''),
            'Miqdor': float(p.amount),
            'Valyuta': p.currency,
            'Usul': p.method,
            'Karta': (p.card.name if p.card else ''),
            'Izoh': (p.note or ''),
        } for p in qs.order_by('pay_date', 'id')]
        if fmt == 'pdf':
            return self.render_pdf_with_qr(
                'payments/export.html',
                {'rows': rows, 'title': 'To‘lovlar hisobot'},
                'tolovlar',
                request=request,
                doc_type='payment-export',
                doc_id=None,
            )
        return self.render_xlsx(rows, 'tolovlar')


class PaymentCardViewSet(viewsets.ModelViewSet):
    queryset = PaymentCard.objects.all()
    serializer_class = PaymentCardSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    pagination_class = None  # Pagination o'chirish - barcha kartalarni bir vaqtda ko'rsatish
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = {
        'is_active': ['exact'],
    }
    search_fields = ('name', 'number', 'holder_name')
    ordering = ('-created_at',)

    def _ensure_writer(self):
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin may modify company cards.')

    def perform_create(self, serializer):
        self._ensure_writer()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_writer()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_writer()
        instance.delete()
    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """
        Karta balansi hisoblash
        Payments (income) - Expenses (outflow) = Balance
        USD va UZS alohida ko'rsatiladi
        """
        card = self.get_object()
        
        # Payments orqali kirim (USD va UZS) - only APPROVED/CONFIRMED
        from django.db.models import Sum, Q, Case, When, DecimalField, Value
        from decimal import Decimal
        
        payments = Payment.objects.filter(
            card=card,
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        )
        payment_usd = payments.aggregate(
            total=Sum('amount_usd')
        )['total'] or Decimal('0.00')
        payment_uzs = payments.aggregate(
            total=Sum('amount_uzs')
        )['total'] or Decimal('0.00')
        
        # Note: Expenses module removed - balance is now only based on payments
        expense_usd = Decimal('0.00')
        expense_uzs = Decimal('0.00')
        
        # Balans hisoblash
        balance_usd = payment_usd
        balance_uzs = payment_uzs
        
        return Response({
            'card_id': card.id,
            'card_name': card.name,
            'income': {
                'usd': float(payment_usd),
                'uzs': float(payment_uzs)
            },
            'expense': {
                'usd': float(expense_usd),
                'uzs': float(expense_uzs)
            },
            'balance': {
                'usd': float(balance_usd),
                'uzs': float(balance_uzs)
            }
        })


class CurrencyRateHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_date = timezone.now().date() - timedelta(days=30)
        rates = CurrencyRate.objects.filter(rate_date__gte=start_date).order_by('rate_date')
        data = CurrencyRateSerializer(rates, many=True).data
        return Response(data)


class PaymentReportPDFView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        date_param = request.query_params.get('date')
        if date_param:
            try:
                report_date = datetime.fromisoformat(date_param).date()
            except ValueError:
                return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)
        else:
            report_date = timezone.now().date()
        payments = Payment.objects.select_related('dealer').filter(pay_date=report_date)
        return self.render_pdf_with_qr(
            'reports/payments_report.html',
            {
                'payments': payments,
                'report_date': report_date,
                'total': payments.aggregate(total_amount=models.Sum('amount_usd'))['total_amount'] or 0,
            },
            filename_prefix=f'payments_{report_date}',
            request=request,
            doc_type='payments-report',
            doc_id=str(report_date),
        )


class PaymentExportExcelView(APIView, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        qs = Payment.objects.select_related('dealer', 'card').all().order_by('pay_date', 'id')
        rows = [{
            'Sana': (p.pay_date.isoformat() if p.pay_date else ''),
            'Diler': (p.dealer.name if p.dealer else ''),
            'Miqdor': float(p.amount),
            'Valyuta': p.currency,
            'Usul': p.method,
            'Karta': (p.card.name if p.card else ''),
            'Izoh': (p.note or ''),
        } for p in qs]
        return self.render_xlsx(rows, 'payments')


class CashboxOpeningBalanceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing cashbox opening balances"""
    queryset = CashboxOpeningBalance.objects.all()
    serializer_class = CashboxOpeningBalanceSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    filterset_fields = ('cashbox_type', 'currency', 'date')
    ordering = ('-date', 'cashbox_type')


class CashboxSummaryView(APIView):
    """
    Get cashbox summary - used by Ledger page
    Returns aggregated balance data for all cashboxes
    """
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get(self, request):
        from payments.models import Cashbox
        from payments.serializers import CashboxSerializer

        cashboxes = Cashbox.objects.all().order_by('cashbox_type', 'name')
        data = []
        
        for cashbox in cashboxes:
            balance_data = cashbox.calculate_balance(return_detailed=True)
            data.append({
                'id': cashbox.id,
                'name': cashbox.name,
                'cashbox_type': cashbox.cashbox_type,
                'currency': cashbox.currency,
                'balance': balance_data['balance'],
                'opening_balance': balance_data['opening_balance'],
                'income_sum': balance_data['income_sum'],
                'expense_sum': balance_data['expense_sum'],
            })

        return Response({
            'cashboxes': data,
            'timestamp': timezone.now().isoformat()
        })


class CashboxViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for Cashbox (cards and cash in UZS/USD)
    Permissions: Admin/Accountant/Owner can manage
    """
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    ordering = ['cashbox_type', 'name']
    
    def get_queryset(self):
        """Filter by cashbox type if specified"""
        from payments.models import Cashbox
        queryset = Cashbox.objects.all()
        
        cashbox_type = self.request.query_params.get('cashbox_type')
        if cashbox_type:
            queryset = queryset.filter(cashbox_type=cashbox_type)
        
        return queryset.order_by('cashbox_type', 'name')
    
    def get_serializer_class(self):
        """Use CashboxSerializer"""
        from payments.serializers import CashboxSerializer
        return CashboxSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin() | IsAccountant() | IsOwner()]
        return super().get_permissions()


# ============================================================================
# FINANCE SOURCE VIEWSETS
# ============================================================================

class FinanceSourceViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for FinanceSource (cash/card/bank accounts)
    Permissions: Admin/Accountant can create/edit, all can view
    """
    serializer_class = FinanceSourceSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner | IsSales]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('type', 'currency', 'is_active')
    search_fields = ('name', 'description')
    ordering_fields = ('name', 'balance', 'created_at')
    ordering = ('name',)
    
    def get_queryset(self):
        """Annotate queryset with aggregated payment and expense totals"""
        from django.db.models import Sum, Count, Q, Value
        from django.db.models.functions import Coalesce
        
        queryset = FinanceSource.objects.annotate(
            total_payments=Coalesce(
                Sum(
                    'payments__amount',
                    filter=Q(payments__status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED])
                ),
                Value(0)
            ),
            total_expenses=Coalesce(
                Sum(
                    'expenses__amount',
                    filter=Q(expenses__status=Expense.STATUS_APPROVED)
                ),
                Value(0)
            ),
            transaction_count=Coalesce(
                Count('payments', filter=Q(payments__status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED])) +
                Count('expenses', filter=Q(expenses__status=Expense.STATUS_APPROVED)),
                Value(0)
            )
        )
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin() | IsAccountant()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get aggregated summary of all finance sources with recent payments
        
        Endpoint: GET /api/finance-sources/summary/
        
        Returns:
        - All active finance sources with balances
        - Aggregated totals (total_payments, total_expenses)
        - Recent approved payments for each source (last 5)
        """
        from django.db.models import Prefetch
        
        # Get sources with annotations
        sources = self.get_queryset().filter(is_active=True)
        
        # Prefetch recent payments for each source
        recent_payments = Payment.objects.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).select_related('dealer').order_by('-pay_date')[:5]
        
        sources = sources.prefetch_related(
            Prefetch(
                'payments',
                queryset=recent_payments,
                to_attr='recent_payments_list'
            )
        )
        
        # Build response
        result = []
        for source in sources:
            incoming_payments = []
            if hasattr(source, 'recent_payments_list'):
                for payment in source.recent_payments_list:
                    incoming_payments.append({
                        'id': payment.id,
                        'dealer': payment.dealer.name if payment.dealer else 'N/A',
                        'amount': float(payment.amount),
                        'date': payment.pay_date.isoformat(),
                        'method': payment.method,
                        'note': payment.note or ''
                    })
            
            result.append({
                'id': source.id,
                'name': source.name,
                'type': source.type,
                'type_display': source.get_type_display(),
                'currency': source.currency,
                'balance': float(source.balance),
                'total_payments': float(getattr(source, 'total_payments', 0)),
                'total_expenses': float(getattr(source, 'total_expenses', 0)),
                'transaction_count': getattr(source, 'transaction_count', 0),
                'is_active': source.is_active,
                'incoming_payments': incoming_payments,
                'created_at': source.created_at.isoformat(),
                'updated_at': source.updated_at.isoformat(),
            })
        
        return Response({'sources': result})
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """
        Get all transactions (payments + expenses) for this finance source
        Returns a unified list sorted by date with pagination
        """
        from rest_framework.pagination import PageNumberPagination
        from django.db.models import Value, CharField, F
        from django.db.models.functions import Concat, Coalesce
        from itertools import chain
        
        source = self.get_object()
        
        # Get approved payments
        payments = Payment.objects.filter(
            source=source,
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).annotate(
            transaction_type=Value('payment', output_field=CharField()),
            transaction_date=F('pay_date'),
            transaction_amount=F('amount'),
            transaction_description=Coalesce(
                Concat(
                    Value('To\'lov: '),
                    F('dealer__name'),
                    output_field=CharField()
                ),
                Value('To\'lov: -', output_field=CharField())
            )
        ).values(
            'id',
            'transaction_type',
            'transaction_date',
            'transaction_amount',
            'currency',
            'transaction_description',
            'status',
            'created_at'
        )
        
        # Get approved expenses
        expenses = Expense.objects.filter(
            source=source,
            status=Expense.STATUS_APPROVED
        ).annotate(
            transaction_type=Value('expense', output_field=CharField()),
            transaction_date=F('expense_date'),
            transaction_amount=F('amount'),
            transaction_description=Concat(
                Value('Xarajat: '),
                F('category__name'),
                output_field=CharField()
            )
        ).values(
            'id',
            'transaction_type',
            'transaction_date',
            'transaction_amount',
            'currency',
            'transaction_description',
            'status',
            'created_at'
        )
        
        # Combine and sort by date (newest first)
        transactions = sorted(
            chain(payments, expenses),
            key=lambda x: x['transaction_date'],
            reverse=True
        )
        
        # Paginate results
        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginator.page_size_query_param = 'page_size'
        paginator.max_page_size = 100
        
        page = paginator.paginate_queryset(transactions, request)
        
        return paginator.get_paginated_response(page)


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for ExpenseCategory
    Permissions: Admin/Accountant can create/edit, all can view
    """
    queryset = ExpenseCategory.objects.filter(is_active=True)
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner | IsSales]
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('name', 'description')
    ordering = ('name',)
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin() | IsAccountant()]
        return super().get_permissions()


class ExpenseViewSet(viewsets.ModelViewSet, BaseReportMixin, ExportMixin):
    """
    CRUD operations for Expense with approval workflow
    Permissions:
      - Create: sales, accountant, admin
      - Approve/Reject: accountant, admin only
      - Edit/Delete: admin/accountant, only if pending
    """
    queryset = Expense.objects.select_related(
        'source',
        'category',
        'created_by',
        'approved_by'
    ).all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner | IsSales]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = {
        'source': ['exact'],
        'category': ['exact'],
        'currency': ['exact'],
        'expense_date': ['gte', 'lte'],
        'status': ['exact'],
    }
    search_fields = ('description',)
    ordering_fields = ('expense_date', 'amount', 'created_at')
    ordering = ('-expense_date', '-created_at')
    
    # BaseReportMixin configuration
    date_field = "expense_date"
    filename_prefix = "expenses"
    title_prefix = "Xarajatlar hisoboti"
    report_template = "expenses/report.html"
    
    def _ensure_can_create(self):
        """Check if user can create expenses: sales, accountant, admin"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant', 'sales'}:
            raise PermissionDenied('Only sales, accountant, or admin can create expenses.')
    
    def _ensure_can_approve(self):
        """Check if user can approve/reject expenses: accountant, admin only"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin can approve/reject expenses.')
    
    def _ensure_can_modify(self, expense):
        """Check if user can edit/delete: admin/accountant, only if pending"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin can modify expenses.')
        if expense.status != Expense.Status.PENDING:
            raise PermissionDenied('Only pending expenses can be modified.')
    
    def perform_create(self, serializer):
        self._ensure_can_create()
        # Set created_by and default status to PENDING
        serializer.save(created_by=self.request.user, status=Expense.Status.PENDING)
    
    def perform_update(self, serializer):
        self._ensure_can_modify(serializer.instance)
        serializer.save()
    
    def perform_destroy(self, instance):
        self._ensure_can_modify(instance)
        instance.delete()
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Approve an expense (accountant/admin only)"""
        self._ensure_can_approve()
        expense = self.get_object()
        
        if expense.status == Expense.Status.APPROVED:
            return Response({'detail': 'Expense is already approved.'}, status=400)
        if expense.status == Expense.Status.REJECTED:
            return Response({'detail': 'Cannot approve a rejected expense.'}, status=400)
        
        expense.status = Expense.Status.APPROVED
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.save()
        
        serializer = self.get_serializer(expense)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reject an expense (accountant/admin only)"""
        self._ensure_can_approve()
        expense = self.get_object()
        
        if expense.status == Expense.Status.APPROVED:
            return Response({'detail': 'Cannot reject an approved expense.'}, status=400)
        if expense.status == Expense.Status.REJECTED:
            return Response({'detail': 'Expense is already rejected.'}, status=400)
        
        rejection_reason = request.data.get('rejection_reason', '')
        
        expense.status = Expense.Status.REJECTED
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.rejection_reason = rejection_reason
        expense.save()
        
        serializer = self.get_serializer(expense)
        return Response(serializer.data)
    
    def get_report_rows(self, queryset):
        """Generate rows for expense report."""
        rows = []
        for e in queryset.order_by('expense_date', 'id'):
            rows.append({
                'Sana': e.expense_date.strftime('%d.%m.%Y') if e.expense_date else '',
                'Manba': e.source.name if e.source else '',
                'Kategoriya': e.category.name if e.category else '',
                'Miqdor': f"{float(e.amount):,.2f}",
                'Valyuta': e.currency,
                'Holat': e.get_status_display(),
                'Izoh': e.description or '',
            })
        return rows
    
    def get_report_total(self, queryset):
        """Calculate total amount."""
        total = queryset.aggregate(models.Sum('amount'))['amount__sum'] or 0
        return total
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Unified export for expenses: ?format=pdf|xlsx"""
        fmt = request.query_params.get('format', 'xlsx')
        qs = self.filter_queryset(self.get_queryset())
        rows = [{
            'Sana': (e.expense_date.isoformat() if e.expense_date else ''),
            'Manba': (e.source.name if e.source else ''),
            'Kategoriya': (e.category.name if e.category else ''),
            'Miqdor': float(e.amount),
            'Valyuta': e.currency,
            'Holat': e.get_status_display(),
            'Izoh': e.description or '',
        } for e in qs.order_by('expense_date', 'id')]
        
        if fmt == 'xlsx':
            return self.export_excel(rows, 'Xarajatlar', 'xarajatlar')
        elif fmt == 'pdf':
            return self.export_pdf_report(qs)
        else:
            return Response({'error': 'format must be pdf or xlsx'}, status=400)


class FinanceLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for FinanceLog (audit trail)
    Permissions: Admin/Accountant/Owner can view
    """
    queryset = FinanceLog.objects.select_related('source', 'created_by').all()
    serializer_class = FinanceLogSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    filterset_fields = ('source', 'type', 'reference_type')
    ordering_fields = ('created_at',)
    ordering = ('-created_at',)


