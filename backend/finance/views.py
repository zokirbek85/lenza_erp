from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsOwner, IsAccountant
from django_filters import rest_framework as filters

from .models import ExchangeRate, FinanceAccount, FinanceTransaction
from .serializers import (
    CashSummaryResponseSerializer,
    ExchangeRateSerializer,
    FinanceAccountSerializer,
    FinanceTransactionSerializer,
)


class ExchangeRateViewSet(viewsets.ModelViewSet):
    """ExchangeRate CRUD - Valyuta kurslari"""
    queryset = ExchangeRate.objects.all()
    serializer_class = ExchangeRateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['rate_date']
    ordering = ['-rate_date']
    
    def get_permissions(self):
        """Read - hamma, Write - faqat admin/accountant"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdmin | IsAccountant]
        else:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()


class FinanceAccountFilter(filters.FilterSet):
    """FinanceAccount uchun filterlar"""
    type = filters.ChoiceFilter(choices=FinanceAccount.AccountType.choices)
    currency = filters.ChoiceFilter(choices=FinanceAccount.Currency.choices)
    is_active = filters.BooleanFilter()
    
    class Meta:
        model = FinanceAccount
        fields = ['type', 'currency', 'is_active']


class FinanceAccountViewSet(viewsets.ModelViewSet):
    """FinanceAccount CRUD"""
    queryset = FinanceAccount.objects.all()
    serializer_class = FinanceAccountSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = FinanceAccountFilter
    
    def get_queryset(self):
        """Filter by permissions"""
        user = self.request.user
        
        # Superuser va admin/accountant - barchasi
        if user.is_superuser or getattr(user, 'role', None) in ['admin', 'accountant']:
            return self.queryset
        
        # Boshqalar faqat active accountlarni ko'radi
        return self.queryset.filter(is_active=True)
    
    def check_permissions_for_modification(self):
        """Check if user can modify accounts"""
        user = self.request.user
        if not (user.is_superuser or getattr(user, 'role', None) in ['admin', 'accountant']):
            raise PermissionDenied(_('Sizda account yaratish/tahrirlash huquqi yo\'q'))
    
    def create(self, request, *args, **kwargs):
        self.check_permissions_for_modification()
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        self.check_permissions_for_modification()
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        self.check_permissions_for_modification()
        
        # Check if account has transactions
        instance = self.get_object()
        if instance.transactions.exists():
            raise ValidationError({
                'detail': _('Bu accountda transactionlar bor, o\'chirish mumkin emas')
            })
        
        return super().destroy(request, *args, **kwargs)


class FinanceTransactionFilter(filters.FilterSet):
    """FinanceTransaction uchun filterlar"""
    type = filters.ChoiceFilter(choices=FinanceTransaction.TransactionType.choices)
    status = filters.ChoiceFilter(choices=FinanceTransaction.TransactionStatus.choices)
    currency = filters.ChoiceFilter(choices=FinanceAccount.Currency.choices)
    dealer = filters.NumberFilter(field_name='dealer__id')
    account = filters.NumberFilter(field_name='account__id')
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')
    category = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = FinanceTransaction
        fields = ['type', 'status', 'currency', 'dealer', 'account', 'date_from', 'date_to', 'category']


class FinanceTransactionViewSet(viewsets.ModelViewSet):
    """FinanceTransaction CRUD"""
    queryset = FinanceTransaction.objects.select_related(
        'dealer',
        'account',
        'created_by',
        'approved_by'
    ).all()
    serializer_class = FinanceTransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = FinanceTransactionFilter
    ordering_fields = ['date', 'created_at', 'amount', 'amount_usd']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        """Filter by permissions"""
        user = self.request.user
        role = getattr(user, 'role', None)
        
        # Admin, accountant, owner - barchasi
        if user.is_superuser or role in ['admin', 'accountant', 'owner']:
            return self.queryset
        
        # Sales manager - faqat read-only
        if role == 'sales_manager':
            return self.queryset
        
        # Boshqalar - access yo'q
        return self.queryset.none()
    
    def check_modification_permission(self):
        """Check if user can modify transactions (not create)"""
        user = self.request.user
        role = getattr(user, 'role', None)
        
        if not (user.is_superuser or role in ['admin', 'accountant']):
            raise PermissionDenied(_('Sizda transaction tahrirlash huquqi yo\'q'))
    
    def check_create_permission(self):
        """Check if user can create transactions"""
        user = self.request.user
        role = getattr(user, 'role', None)
        
        # Admin, accountant, sales yaratishi mumkin
        if not (user.is_superuser or role in ['admin', 'accountant', 'sales']):
            raise PermissionDenied(_('Sizda transaction yaratish huquqi yo\'q'))
    
    def create(self, request, *args, **kwargs):
        self.check_create_permission()
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        self.check_modification_permission()
        
        # Approved transactionni tahrirlash mumkin emas
        instance = self.get_object()
        if instance.status == FinanceTransaction.TransactionStatus.APPROVED:
            raise ValidationError({
                'detail': _('Tasdiqlangan transactionni tahrirlash mumkin emas')
            })
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        self.check_modification_permission()
        
        # Faqat draft transactionni o'chirish mumkin
        instance = self.get_object()
        if instance.status != FinanceTransaction.TransactionStatus.DRAFT:
            raise ValidationError({
                'detail': _('Faqat draft transactionni o\'chirish mumkin')
            })
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve transaction"""
        user = request.user
        role = getattr(user, 'role', None)
        
        # Faqat admin/accountant approve qila oladi
        if not (user.is_superuser or role in ['admin', 'accountant']):
            raise PermissionDenied(_('Sizda transaction tasdiqlash huquqi yo\'q'))
        
        transaction = self.get_object()
        
        try:
            transaction.approve(user)
            serializer = self.get_serializer(transaction)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel transaction"""
        user = request.user
        role = getattr(user, 'role', None)
        
        # Faqat admin/accountant cancel qila oladi
        if not (user.is_superuser or role in ['admin', 'accountant']):
            raise PermissionDenied(_('Sizda transaction bekor qilish huquqi yo\'q'))
        
        transaction = self.get_object()
        
        try:
            transaction.cancel()
            serializer = self.get_serializer(transaction)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CashSummaryView(APIView):
    """Kassa umumiy ko'rinish"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get cash summary"""
        user = request.user
        role = getattr(user, 'role', None)
        
        # Faqat admin, accountant, owner, sales_manager ko'ra oladi
        if not (user.is_superuser or role in ['admin', 'accountant', 'owner', 'sales_manager']):
            raise PermissionDenied(_('Sizda kassa ko\'rish huquqi yo\'q'))
        
        # Barcha active accountlar
        accounts = FinanceAccount.objects.filter(is_active=True)
        
        summary_data = []
        total_income_uzs = Decimal('0')
        total_income_usd = Decimal('0')
        total_expense_uzs = Decimal('0')
        total_expense_usd = Decimal('0')
        
        for account in accounts:
            # Faqat approved transactionlar
            approved_transactions = account.transactions.filter(
                status=FinanceTransaction.TransactionStatus.APPROVED
            )
            
            # Income va expense yig'indilari
            income_total = approved_transactions.filter(
                type=FinanceTransaction.TransactionType.INCOME
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            expense_total = approved_transactions.filter(
                type=FinanceTransaction.TransactionType.EXPENSE
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            balance = income_total - expense_total
            
            summary_data.append({
                'account_id': account.id,
                'account_name': account.name,
                'account_type': account.type,
                'account_type_display': account.get_type_display(),
                'currency': account.currency,
                'income_total': income_total,
                'expense_total': expense_total,
                'balance': balance,
                'is_active': account.is_active,
            })
            
            # Umumiy yig'indilar
            if account.currency == 'UZS':
                total_income_uzs += income_total
                total_expense_uzs += expense_total
            else:
                total_income_usd += income_total
                total_expense_usd += expense_total
        
        response_data = {
            'accounts': summary_data,
            'total_balance_uzs': total_income_uzs - total_expense_uzs,
            'total_balance_usd': total_income_usd - total_expense_usd,
            'total_income_uzs': total_income_uzs,
            'total_income_usd': total_income_usd,
            'total_expense_uzs': total_expense_uzs,
            'total_expense_usd': total_expense_usd,
        }
        
        serializer = CashSummaryResponseSerializer(response_data)
        return Response(serializer.data)
