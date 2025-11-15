"""
Expenses Views - Professional ViewSet with Advanced Features
"""
from datetime import date, timedelta, datetime
from decimal import Decimal

from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from core.permissions import IsAdmin, IsAccountant, IsOwner
from payments.models import CurrencyRate
from .models import Expense, ExpenseType
from .serializers import (
    ExpenseSerializer,
    ExpenseTypeSerializer,
    ExpenseStatsSerializer,
    ExpenseTrendSerializer,
    ExpenseDistributionSerializer
)


class ExpenseTypeViewSet(viewsets.ModelViewSet):
    """Chiqim turlari CRUD"""
    queryset = ExpenseType.objects.all()
    serializer_class = ExpenseTypeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Pagination o'chirish - barcha turlarni bir vaqtda ko'rsatish
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Faqat faol turlarni ko'rsatish (admin bundan mustasno)
        if not self.request.user.role in ['admin', 'owner']:
            queryset = queryset.filter(is_active=True)
        return queryset


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    Chiqimlar ViewSet - To'liq funksional
    
    Features:
    - CRUD operations
    - Advanced filtering
    - Statistics (daily, weekly, monthly)
    - Trend analysis
    - Distribution by type
    - Approval workflow
    """
    queryset = Expense.objects.select_related(
        'type',
        'card',
        'created_by',
        'approved_by'
    ).all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'method', 'currency', 'type']
    search_fields = ['description', 'type__name']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_permissions(self):
        """Ruxsatlar - admin va accountant yozish mumkin"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'approve']:
            return [(IsAdmin | IsAccountant)()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filtering - date range, type, method, card, status"""
        queryset = super().get_queryset()
        
        # Date range filtering
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        # Type filtering
        type_id = self.request.query_params.get('type')
        if type_id:
            queryset = queryset.filter(type_id=type_id)
        
        # Method filtering
        method = self.request.query_params.get('method')
        if method:
            queryset = queryset.filter(method=method)
        
        # Card filtering
        card_id = self.request.query_params.get('card')
        if card_id:
            queryset = queryset.filter(card_id=card_id)
        
        # Status filtering
        stat = self.request.query_params.get('status')
        if stat:
            queryset = queryset.filter(status=stat)
        
        return queryset
    
    def perform_create(self, serializer):
        """Yaratishda created_by ni avtomatik qo'shish"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Statistika - bugun, hafta, oy, jami
        GET /api/expenses/stats/?currency=USD
        """
        currency = request.query_params.get('currency', 'USD')
        
        today = date.today()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Base queryset - faqat tasdiqlangan chiqimlar
        qs = Expense.objects.filter(status=Expense.STATUS_APPROVED)
        
        # Aggregations - USD va UZS alohida
        today_usd = qs.filter(date=today, currency='USD').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        today_uzs = qs.filter(date=today, currency='UZS').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        week_usd = qs.filter(date__gte=week_ago, currency='USD').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        week_uzs = qs.filter(date__gte=week_ago, currency='UZS').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        month_usd = qs.filter(date__gte=month_ago, currency='USD').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        month_uzs = qs.filter(date__gte=month_ago, currency='UZS').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_usd = qs.filter(currency='USD').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_uzs = qs.filter(currency='UZS').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Frontend kutgan format
        data = {
            'today': {
                'count': qs.filter(date=today).count(),
                'total_usd': float(today_usd),
                'total_uzs': float(today_uzs),
            },
            'week': {
                'count': qs.filter(date__gte=week_ago).count(),
                'total_usd': float(week_usd),
                'total_uzs': float(week_uzs),
            },
            'month': {
                'count': qs.filter(date__gte=month_ago).count(),
                'total_usd': float(month_usd),
                'total_uzs': float(month_uzs),
            },
            'total': {
                'count': qs.count(),
                'total_usd': float(total_usd),
                'total_uzs': float(total_uzs),
            },
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def trend(self, request):
        """
        Trend tahlili - kunlik chiqimlar (oxirgi 30 kun)
        GET /api/expenses/trend/?days=30
        """
        days = int(request.query_params.get('days', 30))
        
        start_date = date.today() - timedelta(days=days)
        
        # Python-based grouping (SQLite TruncDate muammosi uchun)
        expenses = Expense.objects.filter(
            date__gte=start_date,
            status=Expense.STATUS_APPROVED
        ).values('date', 'currency', 'amount')
        
        # Kunlik guruh
        daily_dict = {}
        for exp in expenses:
            day = exp['date']
            if day not in daily_dict:
                daily_dict[day] = {'total_usd': 0, 'total_uzs': 0}
            
            if exp['currency'] == 'USD':
                daily_dict[day]['total_usd'] += float(exp['amount'] or 0)
            else:
                daily_dict[day]['total_uzs'] += float(exp['amount'] or 0)
        
        # Natija
        results = []
        for day in sorted(daily_dict.keys()):
            results.append({
                'date': day,
                'total_usd': daily_dict[day]['total_usd'],
                'total_uzs': daily_dict[day]['total_uzs'],
            })
        
        return Response(results)
    
    @action(detail=False, methods=['get'])
    def distribution(self, request):
        """
        Tur bo'yicha taqsimot - pie chart uchun
        GET /api/expenses/distribution/?period=month
        """
        period = request.query_params.get('period', 'month')  # day, week, month, all
        
        today = date.today()
        if period == 'day':
            start_date = today
        elif period == 'week':
            start_date = today - timedelta(days=7)
        elif period == 'month':
            start_date = today - timedelta(days=30)
        else:
            start_date = None
        
        # Tur bo'yicha guruh - Python-based (SQLite muammosi yo'q)
        qs = Expense.objects.filter(status=Expense.STATUS_APPROVED).select_related('type')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        
        # Python'da guruhlaymiz
        type_dict = {}
        for exp in qs:
            type_name = exp.type.name
            if type_name not in type_dict:
                type_dict[type_name] = {'total_usd': 0, 'total_uzs': 0, 'count': 0}
            
            type_dict[type_name]['count'] += 1
            if exp.currency == 'USD':
                type_dict[type_name]['total_usd'] += float(exp.amount)
            else:
                type_dict[type_name]['total_uzs'] += float(exp.amount)
        
        # Jami summa (foiz hisoblash uchun)
        grand_total_usd = sum(item['total_usd'] for item in type_dict.values())
        grand_total_uzs = sum(item['total_uzs'] for item in type_dict.values())
        
        results = []
        for type_name, data in sorted(type_dict.items(), key=lambda x: x[1]['total_usd'], reverse=True):
            percent = round((data['total_usd'] / grand_total_usd * 100), 2) if grand_total_usd else 0
            
            results.append({
                'type_name': type_name,
                'total_usd': data['total_usd'],
                'total_uzs': data['total_uzs'],
                'percentage': percent,
            })
        
        return Response(results)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Chiqimni tasdiqlash
        POST /api/expenses/{id}/approve/
        """
        expense = self.get_object()
        
        if expense.status == Expense.STATUS_APPROVED:
            return Response(
                {'detail': 'Bu chiqim allaqachon tasdiqlangan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expense.status = Expense.STATUS_APPROVED
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.save()
        
        serializer = self.get_serializer(expense)
        return Response(serializer.data)
