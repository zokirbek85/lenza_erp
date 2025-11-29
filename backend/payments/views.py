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
    Cashbox,
    CashboxOpeningBalance,
    CurrencyRate,
    Expense,
    ExpenseCategory,
    Payment,
    PaymentCard,
)
from .serializers import (
    CashboxOpeningBalanceSerializer,
    CashboxSerializer,
    CurrencyRateSerializer,
    ExpenseSerializer,
    ExpenseCreateSerializer,
    ExpenseCategorySerializer,
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
        
        # Get expenses from linked cashbox if exists
        expense_usd = Decimal('0.00')
        expense_uzs = Decimal('0.00')
        if hasattr(card, 'cashbox_link') and card.cashbox_link:
            expenses = Expense.objects.filter(
                cashbox=card.cashbox_link,
                status=Expense.Status.APPROVED
            )
            expense_usd = expenses.aggregate(
                total=Sum('amount_usd')
            )['total'] or Decimal('0.00')
            expense_uzs = expenses.aggregate(
                total=Sum('amount_uzs')
            )['total'] or Decimal('0.00')
        
        # Balans hisoblash
        balance_usd = payment_usd - expense_usd
        balance_uzs = payment_uzs - expense_uzs
        
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
# EXPENSE VIEWSETS
# ============================================================================


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing expense categories (Admin/Accountant only)"""
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('is_active',)
    search_fields = ('name', 'code', 'description')
    ordering = ('name',)
    pagination_class = None  # No pagination for categories
    
    def _ensure_can_modify(self):
        """Only Admin/Accountant can create/update/delete"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only admin or accountant can modify expense categories.')
    
    def perform_create(self, serializer):
        self._ensure_can_modify()
        serializer.save()
    
    def perform_update(self, serializer):
        self._ensure_can_modify()
        serializer.save()
    
    def perform_destroy(self, instance):
        self._ensure_can_modify()
        # Check if category is used in any expenses
        if instance.expenses.exists():
            raise PermissionDenied(
                f"Cannot delete category '{instance.name}' - it is used in {instance.expenses.count()} expense(s)."
            )
        instance.delete()


class ExpenseViewSet(viewsets.ModelViewSet, BaseReportMixin, ExportMixin):
    """ViewSet for managing expenses (Admin/Accountant only)"""
    queryset = Expense.objects.select_related(
        'category',
        'cashbox',
        'created_by',
        'approved_by'
    ).all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = {
        'category': ['exact'],
        'cashbox': ['exact'],
        'currency': ['exact'],
        'status': ['exact'],
        'expense_date': ['gte', 'lte', 'exact'],
        'created_by': ['exact'],
    }
    search_fields = ('description', 'category__name', 'cashbox__name')
    ordering_fields = ('expense_date', 'amount_original', 'created_at')
    ordering = ('-expense_date', '-created_at')
    
    # BaseReportMixin configuration
    date_field = "expense_date"
    filename_prefix = "expenses"
    title_prefix = "Xarajatlar hisoboti"
    report_template = "expenses/report.html"
    
    def _ensure_can_create(self):
        """Check if user can create expenses: accountant, admin"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin can create expenses.')
    
    def _ensure_can_approve(self):
        """Check if user can approve expenses: accountant, admin only"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin can approve expenses.')
    
    def _ensure_can_modify(self, expense):
        """Check if user can edit/delete: admin/accountant only"""
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise PermissionDenied('Only accountant or admin can modify expenses.')
    
    def get_serializer_class(self):
        """Use simplified serializer for creation"""
        if self.action == 'create':
            return ExpenseCreateSerializer
        return ExpenseSerializer
    
    def perform_create(self, serializer):
        self._ensure_can_create()
        # Set created_by and default status to PENDING
        serializer.save(
            created_by=self.request.user,
            status=Expense.Status.PENDING
        )
    
    def perform_update(self, serializer):
        self._ensure_can_modify(serializer.instance)
        expense = serializer.instance
        
        # Check if status is changing from PENDING to APPROVED
        if (
            'status' in serializer.validated_data and
            expense.status == Expense.Status.PENDING and
            serializer.validated_data['status'] == Expense.Status.APPROVED
        ):
            self._ensure_can_approve()
            # Set approval fields
            serializer.save(
                approved_by=self.request.user,
                approved_at=timezone.now()
            )
        else:
            serializer.save()
    
    def perform_destroy(self, instance):
        self._ensure_can_modify(instance)
        # For APPROVED expenses, we just delete them
        # The balance calculation will automatically exclude deleted expenses
        instance.delete()
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Approve an expense (accountant/admin only)"""
        self._ensure_can_approve()
        expense = self.get_object()
        
        if expense.status == Expense.Status.APPROVED:
            return Response({'detail': 'Expense is already approved.'}, status=400)
        
        expense.status = Expense.Status.APPROVED
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.save()
        
        serializer = self.get_serializer(expense)
        return Response(serializer.data)
    
    def get_report_rows(self, queryset):
        """Generate rows for expense report."""
        rows = []
        for e in queryset.order_by('expense_date', 'id'):
            rows.append({
                'Sana': e.expense_date.strftime('%d.%m.%Y') if e.expense_date else '',
                'Tur': e.category.name if e.category else '',
                'Kassa': e.cashbox.name if e.cashbox else '',
                'Miqdor': f"{float(e.amount_original):,.2f}",
                'Valyuta': e.currency,
                'USD': f"{float(e.amount_usd):,.2f}",
                'UZS': f"{float(e.amount_uzs):,.2f}",
                'Holat': e.get_status_display(),
                'Izoh': e.description or '',
            })
        return rows
    
    def get_report_total(self, queryset):
        """Calculate total amounts in USD and UZS."""
        from decimal import Decimal
        total_usd = queryset.aggregate(models.Sum('amount_usd'))['amount_usd__sum'] or Decimal('0')
        total_uzs = queryset.aggregate(models.Sum('amount_uzs'))['amount_uzs__sum'] or Decimal('0')
        return {
            'usd': float(total_usd),
            'uzs': float(total_uzs)
        }
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Unified export for expenses: ?format=pdf|xlsx"""
        fmt = request.query_params.get('format', 'xlsx')
        qs = self.filter_queryset(self.get_queryset())
        rows = [{
            'Sana': (e.expense_date.isoformat() if e.expense_date else ''),
            'Tur': (e.category.name if e.category else ''),
            'Kassa': (e.cashbox.name if e.cashbox else ''),
            'Miqdor': float(e.amount_original),
            'Valyuta': e.currency,
            'USD': float(e.amount_usd),
            'UZS': float(e.amount_uzs),
            'Holat': e.get_status_display(),
            'Izoh': (e.description or ''),
        } for e in qs.order_by('expense_date', 'id')]
        
        if fmt == 'pdf':
            return self.render_pdf_with_qr(
                'expenses/export.html',
                {'rows': rows, 'title': 'Xarajatlar hisobot'},
                'xarajatlar',
                request=request,
                doc_type='expense-export',
                doc_id=None,
            )
        return self.render_xlsx(rows, 'xarajatlar')
