"""
Ledger Views - Dynamic Balance Calculator
NOTE: Ledger — bu alohida model emas, balki Payment va Expense'dan real-time hisoblangan data.
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
from expenses.models import Expense


class LedgerSummaryView(APIView):
    """
    Ledger Summary - Birlashtirilgan balans va moliyaviy tahlil
    
    GET /api/ledger/?from=2025-01-01&to=2025-12-31&card_id=1
    
    Response:
    {
        "total_income_usd": 10000,
        "total_income_uzs": 126000000,
        "total_expense_usd": 5000,
        "total_expense_uzs": 63000000,
        "balance_usd": 5000,
        "balance_uzs": 63000000,
        "history": [
            {
                "date": "2025-11-15",
                "income_usd": 1000,
                "income_uzs": 12600000,
                "expense_usd": 500,
                "expense_uzs": 6300000,
                "balance_usd": 500,
                "balance_uzs": 6300000
            }
        ]
    }
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Query parametrlari
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        card_id = request.query_params.get('card_id')
        
        # Base querysets - faqat tasdiqlangan to'lovlar va approved xarajatlar
        payments_qs = Payment.objects.filter(status=Payment.Status.CONFIRMED).select_related('dealer', 'card')
        expenses_qs = Expense.objects.filter(status=Expense.STATUS_APPROVED).select_related('type', 'card')
        
        # Filtrlash
        if date_from:
            payments_qs = payments_qs.filter(pay_date__gte=date_from)
            expenses_qs = expenses_qs.filter(date__gte=date_from)
        
        if date_to:
            payments_qs = payments_qs.filter(pay_date__lte=date_to)
            expenses_qs = expenses_qs.filter(date__lte=date_to)
        
        if card_id:
            payments_qs = payments_qs.filter(card_id=card_id)
            expenses_qs = expenses_qs.filter(card_id=card_id)
        
        # Jami summa hisoblash (optimized - bitta query)
        total_income_usd = payments_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
        total_income_uzs = payments_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
        total_expense_usd = expenses_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
        total_expense_uzs = expenses_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
        
        balance_usd = total_income_usd - total_expense_usd
        balance_uzs = total_income_uzs - total_expense_uzs
        
        # Kunlik taqsimot (history) - Python'da guruhlaymiz (SQLite TruncDate muammosi)
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
        
        # Chiqimlarni kunlik guruhga ajratish
        for expense in expenses_qs.values('date', 'amount_usd', 'amount_uzs'):
            day = expense['date']
            if day not in daily_dict:
                daily_dict[day] = {
                    'date': day.strftime('%Y-%m-%d'),
                    'income_usd': 0,
                    'income_uzs': 0,
                    'expense_usd': 0,
                    'expense_uzs': 0,
                }
            daily_dict[day]['expense_usd'] += float(expense['amount_usd'] or 0)
            daily_dict[day]['expense_uzs'] += float(expense['amount_uzs'] or 0)
        
        # Calculate daily cumulative balances
        history = []
        cumulative_usd = Decimal('0')
        cumulative_uzs = Decimal('0')
        
        for day in sorted(daily_dict.keys()):
            item = daily_dict[day]
            cumulative_usd += Decimal(str(item['income_usd'])) - Decimal(str(item['expense_usd']))
            cumulative_uzs += Decimal(str(item['income_uzs'])) - Decimal(str(item['expense_uzs']))
            
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
    Karta balansi - faqat shu karta orqali qilingan to'lovlar va chiqimlar
    
    GET /api/cards/1/balance/
    
    Response:
    {
        "card_id": 1,
        "card_name": "Uzcard - Asosiy",
        "income_usd": 5000,
        "income_uzs": 63000000,
        "expense_usd": 2000,
        "expense_uzs": 25200000,
        "balance_usd": 3000,
        "balance_uzs": 37800000
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
        
        # Faqat tasdiqlangan to'lovlar va approved xarajatlar
        payments_qs = Payment.objects.filter(
            card=card,
            status=Payment.Status.CONFIRMED
        )
        expenses_qs = Expense.objects.filter(
            card=card,
            status=Expense.STATUS_APPROVED
        )
        
        # Aggregate
        income_usd = payments_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
        income_uzs = payments_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
        expense_usd = expenses_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
        expense_uzs = expenses_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
        
        return Response({
            'card_id': card.id,
            'card_name': card.name,
            'income_usd': float(income_usd),
            'income_uzs': float(income_uzs),
            'expense_usd': float(expense_usd),
            'expense_uzs': float(expense_uzs),
            'balance_usd': float(income_usd - expense_usd),
            'balance_uzs': float(income_uzs - expense_uzs),
        })


class LedgerByCardView(APIView):
    """
    Barcha kartalardagi balanslar ro'yxati
    
    GET /api/ledger/by-card/
    
    Response:
    [
        {
            "card_id": 1,
            "card_name": "Uzcard - Asosiy",
            "income_usd": 5000,
            "income_uzs": 63000000,
            "expense_usd": 2000,
            "expense_uzs": 25200000,
            "balance_usd": 3000,
            "balance_uzs": 37800000
        }
    ]
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        cards = PaymentCard.objects.filter(is_active=True)
        results = []
        
        for card in cards:
            # Optimized - har bir karta uchun 2 ta query
            payments_qs = Payment.objects.filter(
                card=card,
                status=Payment.Status.CONFIRMED
            )
            expenses_qs = Expense.objects.filter(
                card=card,
                status=Expense.STATUS_APPROVED
            )
            
            income_usd = payments_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
            income_uzs = payments_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
            expense_usd = expenses_qs.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0.00')
            expense_uzs = expenses_qs.aggregate(total=Sum('amount_uzs'))['total'] or Decimal('0.00')
            
            results.append({
                'card_id': card.id,
                'card_name': card.name,
                'income_usd': float(income_usd),
                'income_uzs': float(income_uzs),
                'expense_usd': float(expense_usd),
                'expense_uzs': float(expense_uzs),
                'balance_usd': float(income_usd - expense_usd),
                'balance_uzs': float(income_uzs - expense_uzs),
            })
        
        return Response(results)


class LedgerByCategoryView(APIView):
    """
    Kategoriya (Expense Type) bo'yicha chiqimlar tahlili
    
    GET /api/ledger/by-category/
    
    Response:
    [
        {
            "category": "Transport",
            "total_usd": 1000,
            "total_uzs": 12600000,
            "count": 10
        }
    ]
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        
        expenses_qs = Expense.objects.filter(status=Expense.STATUS_APPROVED).select_related('type')
        
        if date_from:
            expenses_qs = expenses_qs.filter(date__gte=date_from)
        if date_to:
            expenses_qs = expenses_qs.filter(date__lte=date_to)
        
        # Kategoriya bo'yicha guruh
        by_category = expenses_qs.values('type__name').annotate(
            total_usd=Sum('amount_usd'),
            total_uzs=Sum('amount_uzs'),
            count=Count('id')
        ).order_by('-total_usd')
        
        results = []
        for item in by_category:
            results.append({
                'category': item['type__name'] or 'Unknown',
                'total_usd': float(item['total_usd'] or 0),
                'total_uzs': float(item['total_uzs'] or 0),
                'count': item['count']
            })
        
        return Response(results)


class LedgerBalanceWidgetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = latest_rate.usd_to_uzs if latest_rate else Decimal('0')

        payments = Payment.objects.filter(status=Payment.Status.CONFIRMED)
        expenses = Expense.objects.filter(status=Expense.STATUS_APPROVED)

        def sum_usd(queryset):
            return queryset.aggregate(total=Sum('amount_usd'))['total'] or Decimal('0')

        cash_income = sum_usd(payments.filter(method=Payment.Method.CASH))
        cash_expense = sum_usd(expenses.filter(method=Expense.METHOD_CASH))
        cash_balance = cash_income - cash_expense

        bank_income = sum_usd(payments.filter(method=Payment.Method.TRANSFER)) + sum_usd(
            payments.filter(method=Payment.Method.CARD, card__isnull=True)
        )
        bank_expense = sum_usd(expenses.filter(method=Expense.METHOD_CARD, card__isnull=True))
        bank_balance = bank_income - bank_expense

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
            expense = sum_usd(expenses.filter(card=card))
            balance = income - expense
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
