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

from .models import ExchangeRate, ExpenseCategory, FinanceAccount, FinanceTransaction
from .serializers import (
    CashSummaryResponseSerializer,
    CurrencyTransferSerializer,
    DealerRefundSerializer,
    ExchangeRateSerializer,
    ExpenseCategorySerializer,
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
    status = filters.MultipleChoiceFilter(choices=FinanceTransaction.TransactionStatus.choices)
    currency = filters.ChoiceFilter(choices=FinanceAccount.Currency.choices)
    dealer = filters.NumberFilter(field_name='dealer__id')
    account = filters.NumberFilter(field_name='account__id')
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')
    category = filters.CharFilter(lookup_expr='icontains')
    # Add search filter for dealer name and comment
    search = filters.CharFilter(method='filter_search')
    
    class Meta:
        model = FinanceTransaction
        fields = ['type', 'status', 'currency', 'dealer', 'account', 'date_from', 'date_to', 'category', 'search']
    
    def filter_search(self, queryset, name, value):
        """Search in dealer name, category, and comment"""
        if not value:
            return queryset
        return queryset.filter(
            Q(dealer__name__icontains=value) |
            Q(category__icontains=value) |
            Q(comment__icontains=value)
        )


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
    ordering_fields = ['date', 'created_at', 'amount', 'amount_usd', 'amount_uzs']
    ordering = ['-date', '-created_at']
    # Enable pagination with large page size
    pagination_class = None  # Disable pagination for now, or configure per view
    
    def get_permissions(self):
        """Dynamic permissions based on action"""
        from core.permissions import IsSalesCanCreateTransaction, IsAdmin, IsAccountant, IsOwner
        
        if self.action == 'create':
            # Sales manager gets special permission (POST only)
            if hasattr(self.request, 'user') and self.request.user.is_authenticated and self.request.user.role == 'sales':
                return [IsAuthenticated(), IsSalesCanCreateTransaction()]
            # Admin, accountant, owner can create
            return [IsAuthenticated(), IsAdmin() | IsAccountant() | IsOwner()]
        elif self.action in ['update', 'partial_update', 'destroy', 'approve', 'reject']:
            # Only admin, accountant can modify
            return [IsAuthenticated(), IsAdmin() | IsAccountant() | IsOwner()]
        else:
            # GET operations - admin, accountant, owner
            return [IsAuthenticated(), IsAdmin() | IsAccountant() | IsOwner()]
    
    def get_queryset(self):
        """Filter by permissions"""
        user = self.request.user
        role = getattr(user, 'role', None)
        
        # Admin, accountant, owner - barchasi
        if user.is_superuser or role in ['admin', 'accountant', 'owner']:
            return self.queryset
        
        # Sales manager - access yo'q (ular faqat create qilishi mumkin)
        return self.queryset.none()
    
    def create(self, request, *args, **kwargs):
        """Create transaction - sales managers create with pending status"""
        user = request.user
        role = getattr(user, 'role', None)
        
        # Sales manager validations
        if role == 'sales':
            # 1. Must be income transaction
            if request.data.get('type') != 'income':
                return Response(
                    {'error': 'Sales managers can only create income transactions'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # 2. Must have dealer
            dealer_id = request.data.get('dealer')
            if not dealer_id:
                return Response(
                    {'error': 'Dealer is required for income transactions'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 3. Dealer must be assigned to this manager
            from dealers.models import Dealer
            try:
                dealer = Dealer.objects.get(id=dealer_id)
                if dealer.manager_user_id != user.id:
                    return Response(
                        {'error': 'You can only create transactions for dealers assigned to you'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Dealer.DoesNotExist:
                return Response(
                    {'error': 'Dealer not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 4. Modify request data (make it mutable first)
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
            request.data['status'] = 'pending'
            request.data['created_by'] = user.id
            if hasattr(request.data, '_mutable'):
                request.data._mutable = False
        
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update transaction - only admin/accountant can modify"""

        instance = self.get_object()
        old_status = instance.status

        # ✅ Log old values before update
        old_values = {
            'type': instance.type,
            'dealer_id': instance.dealer_id,
            'account_id': instance.account_id,
            'date': str(instance.date),
            'currency': instance.currency,
            'amount': str(instance.amount),
            'category': instance.category,
            'comment': instance.comment,
            'status': instance.status,
        }

        # ✅ If editing approved transaction, need to revert and reapply balance
        needs_balance_update = old_status == FinanceTransaction.TransactionStatus.APPROVED

        if needs_balance_update:
            # Revert old balance impact
            self._revert_balance_impact(instance)

        # Perform update
        response = super().update(request, *args, **kwargs)

        # Refresh to get new values
        instance.refresh_from_db()

        # ✅ Log new values after update
        new_values = {
            'type': instance.type,
            'dealer_id': instance.dealer_id,
            'account_id': instance.account_id,
            'date': str(instance.date),
            'currency': instance.currency,
            'amount': str(instance.amount),
            'category': instance.category,
            'comment': instance.comment,
            'status': instance.status,
        }

        # ✅ Create audit trail entry
        from .models import FinanceTransactionHistory
        FinanceTransactionHistory.objects.create(
            transaction=instance,
            action=FinanceTransactionHistory.ActionType.UPDATED,
            changed_by=request.user,
            old_values=old_values,
            new_values=new_values,
            reason=request.data.get('change_reason', ''),
            ip_address=self._get_client_ip(request),
        )

        # ✅ If still approved after update, reapply balance
        if needs_balance_update and instance.status == FinanceTransaction.TransactionStatus.APPROVED:
            self._apply_balance_impact(instance)

        return response

    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _revert_balance_impact(self, transaction):
        """Revert balance impact of an approved transaction"""
        if transaction.type in [
            FinanceTransaction.TransactionType.INCOME,
            FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_IN,
            FinanceTransaction.TransactionType.OPENING_BALANCE
        ]:
            # Income was added, so subtract it
            pass  # Balance is calculated dynamically, no need to modify
        elif transaction.type in [
            FinanceTransaction.TransactionType.EXPENSE,
            FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_OUT
        ]:
            # Expense was subtracted, so add it back
            pass  # Balance is calculated dynamically

    def _apply_balance_impact(self, transaction):
        """Apply balance impact of an approved transaction"""
        # Since balance is calculated dynamically from approved transactions,
        # no manual balance adjustment needed
        pass
    
    def destroy(self, request, *args, **kwargs):
        self.check_modification_permission()

        instance = self.get_object()

        # ✅ Log deletion before it happens
        from .models import FinanceTransactionHistory
        FinanceTransactionHistory.objects.create(
            transaction=instance,
            action=FinanceTransactionHistory.ActionType.DELETED,
            changed_by=request.user,
            old_values={
                'type': instance.type,
                'dealer_id': instance.dealer_id,
                'account_id': instance.account_id,
                'date': str(instance.date),
                'currency': instance.currency,
                'amount': str(instance.amount),
                'category': instance.category,
                'comment': instance.comment,
                'status': instance.status,
            },
            new_values=None,
            reason=request.data.get('delete_reason', '') if hasattr(request, 'data') else '',
            ip_address=self._get_client_ip(request),
        )

        # ✅ Allow deletion of all statuses (with audit trail)
        # Note: Balance is calculated dynamically, so deletion automatically updates balance
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
        old_status = transaction.status

        try:
            transaction.approve(user)

            # ✅ Log approval action
            from .models import FinanceTransactionHistory
            FinanceTransactionHistory.objects.create(
                transaction=transaction,
                action=FinanceTransactionHistory.ActionType.APPROVED,
                changed_by=user,
                old_values={'status': old_status},
                new_values={'status': transaction.status},
                reason=request.data.get('approval_reason', ''),
                ip_address=self._get_client_ip(request),
            )

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
        old_status = transaction.status

        try:
            transaction.cancel()

            # ✅ Log cancellation action
            from .models import FinanceTransactionHistory
            FinanceTransactionHistory.objects.create(
                transaction=transaction,
                action=FinanceTransactionHistory.ActionType.CANCELLED,
                changed_by=user,
                old_values={'status': old_status},
                new_values={'status': transaction.status},
                reason=request.data.get('cancel_reason', ''),
                ip_address=self._get_client_ip(request),
            )

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
        
        # Faqat admin, accountant, owner ko'ra oladi (sales emas - maxfiy ma'lumot)
        if not (user.is_superuser or role in ['admin', 'accountant', 'owner']):
            raise PermissionDenied(_('Sizda kassa ko\'rish huquqi yo\'q'))
        
        # Barcha active accountlar
        accounts = FinanceAccount.objects.filter(is_active=True)


class SalesManagerDealersView(APIView):
    """Sales manager uchun faqat o'z dillerlarini olish"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get dealers assigned to current sales manager"""
        user = request.user
        role = getattr(user, 'role', None)
        
        if role != 'sales':
            return Response(
                {'error': 'This endpoint is only for sales managers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from dealers.models import Dealer
        from dealers.serializers import DealerSerializer
        
        dealers = Dealer.objects.filter(
            manager_user=user,
            is_active=True
        ).select_related('region')
        
        serializer = DealerSerializer(dealers, many=True)
        return Response(serializer.data)
        
        summary_data = []
        total_balance_uzs = Decimal('0')
        total_balance_usd = Decimal('0')
        total_income_uzs = Decimal('0')
        total_income_usd = Decimal('0')
        total_expense_uzs = Decimal('0')
        total_expense_usd = Decimal('0')
        
        for account in accounts:
            # Faqat approved transactionlar
            approved_transactions = account.transactions.filter(
                status=FinanceTransaction.TransactionStatus.APPROVED
            )
            
            # Income yig'indisi (opening_balance ham kiritilgan)
            income_total = approved_transactions.filter(
                type__in=[
                    FinanceTransaction.TransactionType.OPENING_BALANCE,
                    FinanceTransaction.TransactionType.INCOME,
                    FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_IN,
                ]
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Expense yig'indisi
            expense_total = approved_transactions.filter(
                type__in=[
                    FinanceTransaction.TransactionType.EXPENSE,
                    FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_OUT,
                ]
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Use model's balance property for consistency
            balance = account.balance
            
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
                total_balance_uzs += balance
                total_income_uzs += income_total
                total_expense_uzs += expense_total
            else:
                total_balance_usd += balance
                total_income_usd += income_total
                total_expense_usd += expense_total
        
        response_data = {
            'accounts': summary_data,
            'total_balance_uzs': total_balance_uzs,
            'total_balance_usd': total_balance_usd,
            'total_income_uzs': total_income_uzs,
            'total_income_usd': total_income_usd,
            'total_expense_uzs': total_expense_uzs,
            'total_expense_usd': total_expense_usd,
        }
        
        serializer = CashSummaryResponseSerializer(response_data)
        return Response(serializer.data)


class CurrencyTransferView(APIView):
    """
    Bidirectional currency transfer/exchange (USD ↔ UZS)
    POST /api/finance/transfer-currency/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Transfer currency between USD and UZS accounts (bidirectional)"""
        # Check permissions
        user = request.user
        if not (user.is_superuser or getattr(user, 'role', None) in ['admin', 'accountant']):
            raise PermissionDenied(_('Sizda valyuta konvertatsiya qilish huquqi yo\'q'))
        
        serializer = CurrencyTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract validated data
        from_account = serializer.validated_data['from_account']
        to_account = serializer.validated_data['to_account']
        source_amount = serializer.validated_data['amount']
        rate = serializer.validated_data['rate']
        trans_date = serializer.validated_data['date']
        comment = serializer.validated_data.get('comment', '')
        
        # Determine direction and calculate target amount
        from decimal import Decimal, ROUND_HALF_UP
        
        if from_account.currency == 'USD' and to_account.currency == 'UZS':
            # USD -> UZS
            usd_amount = source_amount
            uzs_amount = (source_amount * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        elif from_account.currency == 'UZS' and to_account.currency == 'USD':
            # UZS -> USD
            uzs_amount = source_amount
            usd_amount = (source_amount / rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        else:
            return Response({
                'error': 'Invalid currency pair'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create two transactions atomically
        from django.db import transaction as db_transaction
        
        with db_transaction.atomic():
            # 1. Source account - currency exchange out (expense)
            source_transaction = FinanceTransaction.objects.create(
                type=FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_OUT,
                account=from_account,
                related_account=to_account,
                date=trans_date,
                currency=from_account.currency,
                amount=source_amount,
                exchange_rate=rate,
                category='Currency Exchange',
                comment=comment or f'Currency exchange to {to_account.name}',
                status=FinanceTransaction.TransactionStatus.APPROVED,
                created_by=user,
                approved_by=user,
                approved_at=timezone.now()
            )
            
            # 2. Target account - currency exchange in (income)
            target_amount = uzs_amount if to_account.currency == 'UZS' else usd_amount
            target_transaction = FinanceTransaction.objects.create(
                type=FinanceTransaction.TransactionType.CURRENCY_EXCHANGE_IN,
                account=to_account,
                related_account=from_account,
                date=trans_date,
                currency=to_account.currency,
                amount=target_amount,
                exchange_rate=rate,
                category='Currency Exchange',
                comment=comment or f'Currency exchange from {from_account.name}',
                status=FinanceTransaction.TransactionStatus.APPROVED,
                created_by=user,
                approved_by=user,
                approved_at=timezone.now()
            )
        
        return Response({
            'success': True,
            'message': _('Currency transfer completed successfully'),
            'source_transaction_id': source_transaction.id,
            'target_transaction_id': target_transaction.id,
            'usd_amount': float(usd_amount),
            'uzs_amount': float(uzs_amount),
            'rate': float(rate),
            'from_account': {
                'id': from_account.id,
                'name': from_account.name,
                'new_balance': float(from_account.balance)
            },
            'to_account': {
                'id': to_account.id,
                'name': to_account.name,
                'new_balance': float(to_account.balance)
            }
        }, status=status.HTTP_201_CREATED)


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    ExpenseCategory CRUD - Chiqim kategoriyalari boshqaruvi
    Har bir foydalanuvchi o'z kategoriyalarini boshqaradi
    """
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active', 'is_global']
    ordering = ['-is_global', 'name']

    def get_queryset(self):
        """Return categories visible to the current user: global + own"""
        user = self.request.user
        return ExpenseCategory.objects.filter(Q(is_global=True) | Q(user=user))
    
    def perform_destroy(self, instance):
        """
        Soft delete - check if category is used in transactions
        If used, warn and prevent deletion
        """
        user = self.request.user

        # Only admin/accountant/owner/superuser can delete global categories
        if instance.is_global and not (user.is_superuser or getattr(user, 'role', None) in ['admin', 'accountant', 'owner']):
            raise PermissionDenied(_('You do not have permission to delete global categories'))

        # Count transactions using this category
        usage_count = FinanceTransaction.objects.filter(
            category=instance.name,
            account__in=FinanceAccount.objects.all()
        ).count()

        if usage_count > 0:
            raise ValidationError({
                'detail': _(f'Cannot delete category "{instance.name}". It is used in {usage_count} transaction(s). Please set is_active=False instead.')
            })

        # If not used, allow deletion
        instance.delete()

    def create(self, request, *args, **kwargs):
        # Prevent non-privileged users from creating global categories (extra safety)
        is_global = request.data.get('is_global', False)
        user = request.user
        if is_global and not (user.is_superuser or getattr(user, 'role', None) in ['admin', 'accountant', 'owner']):
            raise PermissionDenied(_('Only admin/accountant can create global categories'))
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        # Extra safety: disallow changing is_global/user via update
        data = request.data.copy()
        data.pop('is_global', None)
        data.pop('user', None)
        request._full_data = data
        return super().update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get statistics for all categories
        Returns: category name, total expenses, transaction count
        """
        user = request.user
        categories = self.get_queryset()
        
        stats = []
        for category in categories:
            # Get all expense transactions with this category
            transactions = FinanceTransaction.objects.filter(
                type=FinanceTransaction.TransactionType.EXPENSE,
                category=category.name,
                status=FinanceTransaction.TransactionStatus.APPROVED
            )
            
            total_uzs = transactions.filter(currency='UZS').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            total_usd = transactions.filter(currency='USD').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            stats.append({
                'id': category.id,
                'name': category.name,
                'icon': category.icon,
                'color': category.color,
                'transaction_count': transactions.count(),
                'total_uzs': float(total_uzs),
                'total_usd': float(total_usd),
            })
        
        # Sort by total expenses (UZS equivalent)
        stats.sort(key=lambda x: x['total_uzs'] + (x['total_usd'] * 12500), reverse=True)
        
        return Response(stats)


class DealerRefundView(APIView):
    """
    Dealer refund - dilerga to'lov qaytarish
    GET /api/finance/dealer-refund/ - list refunds with optional filters
    POST /api/finance/dealer-refund/ - create new refund
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get dealer refunds with optional filtering"""
        from rest_framework.pagination import PageNumberPagination
        
        # Start with all refund transactions
        queryset = FinanceTransaction.objects.filter(
            type=FinanceTransaction.TransactionType.DEALER_REFUND
        )
        
        # Apply filters
        dealer_id = request.query_params.get('dealer_id')
        if dealer_id:
            queryset = queryset.filter(dealer_id=dealer_id)
        
        # Order by date descending
        ordering = request.query_params.get('ordering', '-date')
        queryset = queryset.order_by(ordering)
        
        # Paginate
        paginator = PageNumberPagination()
        page_size = request.query_params.get('page_size', 10)
        paginator.page_size = int(page_size)
        
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = FinanceTransactionSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = FinanceTransactionSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Refund money to dealer"""
        # Check permissions
        user = request.user
        if not (user.is_superuser or getattr(user, 'role', None) in ['admin', 'accountant']):
            raise PermissionDenied(_('Sizda dilerga to\'lov qaytarish huquqi yo\'q'))
        
        serializer = DealerRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract validated data
        dealer = serializer.validated_data['dealer']
        account = serializer.validated_data['account']
        amount = serializer.validated_data['amount']
        currency = serializer.validated_data['currency']
        description = serializer.validated_data.get('description', '')
        
        # Get exchange rate if conversion needed
        from core.utils.currency import get_exchange_rate
        exchange_rate, rate_date = get_exchange_rate()
        
        # Calculate amount to deduct from dealer balance
        # Dealer balance currency is based on opening_balance_currency
        dealer_currency = dealer.opening_balance_currency
        
        from decimal import Decimal, ROUND_HALF_UP
        
        if currency == dealer_currency:
            # Same currency - direct deduction
            dealer_amount = amount
            used_rate = None
        elif currency == 'UZS' and dealer_currency == 'USD':
            # Refunding UZS but dealer balance is in USD
            # Convert UZS to USD
            dealer_amount = (amount / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            used_rate = exchange_rate
        elif currency == 'USD' and dealer_currency == 'UZS':
            # Refunding USD but dealer balance is in UZS
            # Convert USD to UZS
            dealer_amount = (amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            used_rate = exchange_rate
        else:
            return Response({
                'error': 'Invalid currency combination'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get transaction date from request or use today
        transaction_date = serializer.validated_data.get('date') or timezone.localdate()
        
        # Create transaction atomically
        from django.db import transaction as db_transaction
        
        with db_transaction.atomic():
            # Create refund transaction
            # Note: Transaction will affect dealer balance calculations in balance service
            refund_transaction = FinanceTransaction.objects.create(
                type=FinanceTransaction.TransactionType.DEALER_REFUND,
                dealer=dealer,
                account=account,
                date=transaction_date,
                currency=currency,
                amount=amount,
                exchange_rate=used_rate,
                category='Dealer Refund',
                comment=description or f'Refund to {dealer.name}',
                status=FinanceTransaction.TransactionStatus.APPROVED,
                created_by=user,
                approved_by=user,
                approved_at=timezone.now()
            )
        
        # Try to get updated dealer balance using balance service
        # Note: Dealer balance is calculated dynamically from all transactions
        new_dealer_balance = None
        try:
            from dealers.services.balance import calculate_dealer_balance
            balance_info = calculate_dealer_balance(dealer)
            # Use balance in dealer's currency
            if dealer_currency == 'USD':
                new_dealer_balance = float(balance_info.get('balance_usd', 0))
            else:
                new_dealer_balance = float(balance_info.get('balance_uzs', 0))
        except Exception as e:
            # If balance calculation fails, just continue without it
            pass
        
        return Response({
            'success': True,
            'message': _('Refund completed successfully'),
            'transaction_id': refund_transaction.id,
            'refund_amount': float(amount),
            'currency': currency,
            'dealer_balance_deduction': float(dealer_amount),
            'dealer_currency': dealer_currency,
            'exchange_rate': float(used_rate) if used_rate else None,
            'account': {
                'id': account.id,
                'name': account.name,
                'new_balance': float(account.balance)
            },
            'dealer': {
                'id': dealer.id,
                'name': dealer.name,
                'new_balance': new_dealer_balance
            }
        }, status=status.HTTP_201_CREATED)
