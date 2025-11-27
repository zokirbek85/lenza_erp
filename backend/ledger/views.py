"""
Ledger Views - Dynamic Balance Calculator
NOTE: Ledger — bu alohida model emas, balki Payment'dan real-time hisoblangan data.
(Expenses module removed - only tracks payment income)
"""
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q, F, Case, When, DecimalField
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from payments.models import Payment, PaymentCard, CurrencyRate


class LedgerSummaryView(APIView):
    """
    Ledger Summary - Payment income tracking (expenses module removed)
    
    GET /api/ledger/?from=2025-01-01&to=2025-12-31&card_id=1
    
    Response:
    {
        "total_income_usd": 10000,
        "total_income_uzs": 126000000,
        "total_expense_usd": 0,
        "total_expense_uzs": 0,
        "balance_usd": 10000,
        "balance_uzs": 126000000,
        "history": [...]
    }
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Query parametrlari
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        card_id = request.query_params.get('card_id')
        
        # Base querysets - faqat tasdiqlangan to'lovlar
        payments_qs = Payment.objects.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        ).select_related('dealer', 'card')
        
        # Filtrlash
        if date_from:
            payments_qs = payments_qs.filter(pay_date__gte=date_from)
        
        if date_to:
            payments_qs = payments_qs.filter(pay_date__lte=date_to)
        
        if card_id:
            payments_qs = payments_qs.filter(card_id=card_id)
        
        # Jami summa hisoblash
        total_income_usd = payments_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
        total_income_uzs = payments_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
        
        # Expenses module removed
        total_expense_usd = Decimal('0.00')
        total_expense_uzs = Decimal('0.00')
        
        balance_usd = total_income_usd
        balance_uzs = total_income_uzs
        
        # Kunlik taqsimot (history)
        daily_dict = {}
        
        # To'lovlarni kunlik guruhga ajratish
        for payment in payments_qs.values('pay_date', 'amount_usd', 'amount_uzs'):
            day = payment['pay_date']
            if day not in daily_dict:
                daily_dict[day] = {
                    'date': day.strftime('%Y-%m-%d'),
                    'income_usd': 0,
                    'income_uzs': 0,
                    'expense_usd': 0,
                    'expense_uzs': 0,
                }
            daily_dict[day]['income_usd'] += float(payment['amount_usd'] or 0)
            daily_dict[day]['income_uzs'] += float(payment['amount_uzs'] or 0)
        
        # Calculate daily cumulative balances
        history = []
        cumulative_usd = Decimal('0')
        cumulative_uzs = Decimal('0')
        
        for day in sorted(daily_dict.keys()):
            item = daily_dict[day]
            cumulative_usd += Decimal(str(item['income_usd']))
            cumulative_uzs += Decimal(str(item['income_uzs']))
            
            item['balance_usd'] = float(cumulative_usd)
            item['balance_uzs'] = float(cumulative_uzs)
            history.append(item)
        
        # Response
        return Response({
            'total_income_usd': float(total_income_usd),
            'total_income_uzs': float(total_income_uzs),
            'total_expense_usd': float(total_expense_usd),
            'total_expense_uzs': float(total_expense_uzs),
            'balance_usd': float(balance_usd),
            'balance_uzs': float(balance_uzs),
            'history': history,
        })


class CardBalanceView(APIView):
    """
    Karta balansi - faqat shu karta orqali qilingan to'lovlar (expenses removed)
    
    GET /api/cards/1/balance/
    
    Response:
    {
        "card_id": 1,
        "card_name": "Uzcard - Asosiy",
        "income_usd": 5000,
        "income_uzs": 63000000,
        "expense_usd": 0,
        "expense_uzs": 0,
        "balance_usd": 5000,
        "balance_uzs": 63000000
    }
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, card_id):
        try:
            card = PaymentCard.objects.get(id=card_id)
        except PaymentCard.DoesNotExist:
            return Response(
                {'error': 'Karta topilmadi'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Faqat tasdiqlangan to'lovlar
        payments_qs = Payment.objects.filter(
            card=card,
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        )
        
        # Aggregate
        income_usd = payments_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
        income_uzs = payments_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
        
        # Expenses module removed
        expense_usd = Decimal('0.00')
        expense_uzs = Decimal('0.00')
        
        return Response({
            'card_id': card.id,
            'card_name': card.name,
            'income_usd': float(income_usd),
            'income_uzs': float(income_uzs),
            'expense_usd': float(expense_usd),
            'expense_uzs': float(expense_uzs),
            'balance_usd': float(income_usd),
            'balance_uzs': float(income_uzs),
        })


class LedgerByCardView(APIView):
    """
    Barcha kartalardagi balanslar ro'yxati (only payment income, expenses removed)
    
    GET /api/ledger/by-card/
    
    Response:
    [
        {
            "card_id": 1,
            "card_name": "Uzcard - Asosiy",
            "income_usd": 5000,
            "income_uzs": 63000000,
            "expense_usd": 0,
            "expense_uzs": 0,
            "balance_usd": 5000,
            "balance_uzs": 63000000
        }
    ]
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        cards = PaymentCard.objects.filter(is_active=True)
        results = []
        
        for card in cards:
            # Optimized - har bir karta uchun 1 ta query
            payments_qs = Payment.objects.filter(
                card=card,
                status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
            )
            
            income_usd = payments_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
            income_uzs = payments_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
            
            # Expenses module removed
            expense_usd = Decimal('0.00')
            expense_uzs = Decimal('0.00')
            
            results.append({
                'card_id': card.id,
                'card_name': card.name,
                'income_usd': float(income_usd),
                'income_uzs': float(income_uzs),
                'expense_usd': float(expense_usd),
                'expense_uzs': float(expense_uzs),
                'balance_usd': float(income_usd),
                'balance_uzs': float(income_uzs),
            })
        
        return Response(results)


class LedgerByCategoryView(APIView):
    """
    Kategoriya bo'yicha tahlil - Expenses module removed, returns empty list
    
    GET /api/ledger/by-category/
    
    Response: []
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Expenses module removed - return empty list
        return Response([])


class LedgerBalanceWidgetView(APIView):
    """
    Ledger balance widget - only tracks payment income (expenses removed)
    
    GET /api/ledger-accounts/balances/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = latest_rate.usd_to_uzs if latest_rate else Decimal('0')

        payments = Payment.objects.filter(
            status__in=[Payment.Status.APPROVED, Payment.Status.CONFIRMED]
        )

        def sum_usd(queryset):
            return queryset.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')

        # Cash income (expenses removed)
        cash_income = sum_usd(payments.filter(method=Payment.Method.CASH))
        cash_balance = cash_income

        # Bank income (expenses removed)
        bank_income = sum_usd(payments.filter(method=Payment.Method.TRANSFER)) + sum_usd(
            payments.filter(method=Payment.Method.CARD, card__isnull=True)
        )
        bank_balance = bank_income

        accounts = [
            {
                'id': 0,
                'name': 'Naqd kassalar',
                'type': 'cash',
                'balance_usd': float(cash_balance),
                'balance_uzs': float(cash_balance * usd_to_uzs) if usd_to_uzs else 0.0,
                'currency': 'USD',
            },
            {
                'id': -1,
                'name': 'Bank hisoblari',
                'type': 'bank',
                'balance_usd': float(bank_balance),
                'balance_uzs': float(bank_balance * usd_to_uzs) if usd_to_uzs else 0.0,
                'currency': 'USD',
            },
        ]

        card_total = Decimal('0')
        for card in PaymentCard.objects.filter(is_active=True):
            income = sum_usd(payments.filter(card=card))
            balance = income  # No expenses
            card_total += balance
            accounts.append(
                {
                    'id': card.id,
                    'name': card.name,
                    'type': 'card',
                    'balance_usd': float(balance),
                    'balance_uzs': float(balance * usd_to_uzs) if usd_to_uzs else 0.0,
                    'currency': 'USD',
                }
            )

        total_balance = cash_balance + bank_balance + card_total

        return Response(
            {
                'rate': float(usd_to_uzs) if usd_to_uzs else None,
                'total_balance': float(total_balance),
                'cash_balance': float(cash_balance),
                'bank_balance': float(bank_balance),
                'card_balance': float(card_total),
                'accounts': accounts,
            }
        )
