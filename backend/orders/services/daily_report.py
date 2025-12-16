"""
Daily Financial Report Service
Kunlik moliyaviy hisobot yaratish uchun xizmat
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Any
from django.db.models import Sum, Q, F, Count, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone

from catalog.models import Product
from dealers.models import Dealer
from finance.models import FinanceTransaction, ExchangeRate, FinanceAccount
from orders.models import Order, OrderItem
from returns.models import Return, ReturnItem


class DailyFinancialReportService:
    """Kunlik moliyaviy hisobot yaratish xizmati"""

    def __init__(self, report_date: date):
        self.report_date = report_date
        self.start_datetime = timezone.make_aware(datetime.combine(report_date, datetime.min.time()))
        self.end_datetime = timezone.make_aware(datetime.combine(report_date, datetime.max.time()))

    def get_exchange_rate(self) -> Decimal:
        """Bugungi valyuta kursini olish"""
        try:
            rate = ExchangeRate.objects.filter(rate_date=self.report_date).first()
            if rate:
                return rate.usd_to_uzs
            # Agar bugungi kurs bo'lmasa, eng oxirgi kursni olish
            latest_rate = ExchangeRate.objects.filter(rate_date__lte=self.report_date).first()
            return latest_rate.usd_to_uzs if latest_rate else Decimal('12500.00')
        except:
            return Decimal('12500.00')

    def get_dealers_with_activity(self) -> List[int]:
        """Kun davomida harakati bo'lgan dillerlarni topish"""
        dealer_ids = set()

        # Orderlar bo'lgan dillerlar
        order_dealers = Order.objects.filter(
            created_at__range=(self.start_datetime, self.end_datetime),
            status__in=Order.Status.active_statuses()
        ).values_list('dealer_id', flat=True).distinct()
        dealer_ids.update(order_dealers)

        # To'lovlar qilgan dillerlar
        payment_dealers = FinanceTransaction.objects.filter(
            date=self.report_date,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            dealer__isnull=False
        ).values_list('dealer_id', flat=True).distinct()
        dealer_ids.update(payment_dealers)

        # Mahsulot qaytargan dillerlar
        return_dealers = Return.objects.filter(
            created_at__range=(self.start_datetime, self.end_datetime)
        ).values_list('dealer_id', flat=True).distinct()
        dealer_ids.update(return_dealers)

        # Refund olgan dillerlar
        refund_dealers = FinanceTransaction.objects.filter(
            date=self.report_date,
            type=FinanceTransaction.TransactionType.DEALER_REFUND,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            dealer__isnull=False
        ).values_list('dealer_id', flat=True).distinct()
        dealer_ids.update(refund_dealers)

        return list(dealer_ids)

    def get_dealer_orders(self, dealer_id: int) -> List[Dict]:
        """Diller orderlarini batafsil olish"""
        orders = Order.objects.filter(
            dealer_id=dealer_id,
            created_at__range=(self.start_datetime, self.end_datetime),
            status__in=Order.Status.active_statuses()
        ).prefetch_related('items__product')

        result = []
        for order in orders:
            items = []
            for item in order.items.all():
                items.append({
                    'product_name': item.product.name,
                    'size': getattr(item.product, 'size', ''),
                    'unit': 'шт.',  # Birlik
                    'quantity': float(item.qty),
                    'price_usd': float(item.price_usd),
                    'total_usd': float(item.qty * item.price_usd),
                })

            result.append({
                'order_number': order.display_no,
                'created_at': order.created_at,
                'status': order.get_status_display(),
                'total_usd': float(order.total_usd),
                'items': items,
            })

        return result

    def get_dealer_returns(self, dealer_id: int) -> List[Dict]:
        """Diller qaytarmalarini olish"""
        returns = Return.objects.filter(
            dealer_id=dealer_id,
            created_at__range=(self.start_datetime, self.end_datetime)
        ).prefetch_related('items__product')

        result = []
        for return_doc in returns:
            items = []
            for item in return_doc.items.all():
                # Mahsulot narxini orderlardan topishga harakat qilamiz
                product_price = OrderItem.objects.filter(
                    product=item.product,
                    order__dealer_id=dealer_id
                ).order_by('-order__created_at').values_list('price_usd', flat=True).first()

                if not product_price:
                    product_price = item.product.sell_price_usd

                total = float(item.quantity) * float(product_price)

                items.append({
                    'product_name': item.product.name,
                    'quantity': float(item.quantity),
                    'price_usd': float(product_price),
                    'total_usd': total,
                    'status': item.get_status_display(),
                })

            result.append({
                'created_at': return_doc.created_at,
                'total_usd': float(return_doc.total_sum),
                'items': items,
            })

        return result

    def get_dealer_payments(self, dealer_id: int) -> List[Dict]:
        """Diller to'lovlarini olish"""
        transactions = FinanceTransaction.objects.filter(
            date=self.report_date,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            dealer_id=dealer_id
        ).select_related('account')

        exchange_rate = self.get_exchange_rate()
        result = []

        for trans in transactions:
            payment_data = {
                'account_type': trans.account.get_type_display(),
                'account_name': trans.account.name,
                'currency': trans.account.currency,
                'amount': float(trans.amount),
            }

            # Agar UZS bo'lsa, USD ga o'giramiz
            if trans.account.currency == 'UZS':
                payment_data['amount_usd'] = float(trans.amount / exchange_rate)
                payment_data['exchange_rate'] = float(exchange_rate)
            else:
                payment_data['amount_usd'] = float(trans.amount)

            result.append(payment_data)

        return result

    def get_dealer_refunds(self, dealer_id: int) -> List[Dict]:
        """Dillerga qaytarilgan summalarni olish"""
        refunds = FinanceTransaction.objects.filter(
            date=self.report_date,
            type=FinanceTransaction.TransactionType.DEALER_REFUND,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            dealer_id=dealer_id
        )

        return [
            {
                'amount_usd': float(refund.amount),
                'note': refund.note or '',
            }
            for refund in refunds
        ]

    def get_overall_summary(self) -> Dict[str, Any]:
        """Kunlik umumiy xulosani olish"""
        exchange_rate = self.get_exchange_rate()

        # 1. Orderlar statistikasi
        orders = Order.objects.filter(
            created_at__range=(self.start_datetime, self.end_datetime),
            status__in=Order.Status.active_statuses()
        )

        order_stats = orders.aggregate(
            total_dealers=Count('dealer', distinct=True),
            total_amount_usd=Coalesce(Sum('total_usd'), Decimal('0'), output_field=DecimalField()),
        )

        # Ombordan chiqim qilingan mahsulotlar
        order_items = OrderItem.objects.filter(
            order__in=orders
        ).aggregate(
            total_products=Count('product', distinct=True),
            total_quantity=Coalesce(Sum('qty'), Decimal('0'), output_field=DecimalField()),
            total_value_usd=Coalesce(Sum(F('qty') * F('price_usd')), Decimal('0'), output_field=DecimalField()),
        )

        # 2. To'lovlar statistikasi
        payments = FinanceTransaction.objects.filter(
            date=self.report_date,
            type=FinanceTransaction.TransactionType.INCOME,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            dealer__isnull=False
        ).select_related('account')

        payment_summary = {
            'total_dealers': payments.values('dealer').distinct().count(),
            'cash_usd': Decimal('0'),
            'cash_uzs': Decimal('0'),
            'cash_uzs_usd_equivalent': Decimal('0'),
            'card_payments': [],
            'bank_payments': [],
        }

        for payment in payments:
            if payment.account.type == 'cash' and payment.account.currency == 'USD':
                payment_summary['cash_usd'] += payment.amount
            elif payment.account.type == 'cash' and payment.account.currency == 'UZS':
                payment_summary['cash_uzs'] += payment.amount
                payment_summary['cash_uzs_usd_equivalent'] += payment.amount / exchange_rate
            elif payment.account.type == 'card':
                payment_summary['card_payments'].append({
                    'name': payment.account.name,
                    'currency': payment.account.currency,
                    'amount': float(payment.amount),
                    'amount_usd': float(payment.amount if payment.account.currency == 'USD' else payment.amount / exchange_rate),
                })
            elif payment.account.type == 'bank':
                payment_summary['bank_payments'].append({
                    'name': payment.account.name,
                    'currency': payment.account.currency,
                    'amount': float(payment.amount),
                    'amount_usd': float(payment.amount if payment.account.currency == 'USD' else payment.amount / exchange_rate),
                })

        # 3. Qaytarmalar statistikasi
        returns = Return.objects.filter(
            created_at__range=(self.start_datetime, self.end_datetime)
        )

        return_items = ReturnItem.objects.filter(
            return_document__in=returns
        ).aggregate(
            total_products=Count('product', distinct=True),
            total_quantity=Coalesce(Sum('quantity'), Decimal('0'), output_field=DecimalField()),
        )

        return_stats = returns.aggregate(
            total_dealers=Count('dealer', distinct=True),
            total_amount_usd=Coalesce(Sum('total_sum'), Decimal('0'), output_field=DecimalField()),
        )

        # 4. Refundlar statistikasi
        refunds = FinanceTransaction.objects.filter(
            date=self.report_date,
            type=FinanceTransaction.TransactionType.DEALER_REFUND,
            status=FinanceTransaction.TransactionStatus.APPROVED,
            dealer__isnull=False
        ).aggregate(
            total_dealers=Count('dealer', distinct=True),
            total_amount_usd=Coalesce(Sum('amount'), Decimal('0'), output_field=DecimalField()),
        )

        # 5. Umumiy qarzdorlik (barcha dillerlar)
        from dealers.services.balance import annotate_dealers_with_balances
        all_dealers = Dealer.objects.filter(is_active=True)
        dealers_with_balances = annotate_dealers_with_balances(all_dealers)

        total_debt = dealers_with_balances.aggregate(
            total_balance_usd=Coalesce(Sum('calculated_balance_usd'), Decimal('0'), output_field=DecimalField())
        )

        # 6. Ombor holati
        warehouse_stats = Product.objects.aggregate(
            total_quantity=Coalesce(Sum('stock_ok'), Decimal('0'), output_field=DecimalField()),
            total_value_usd=Coalesce(Sum(F('stock_ok') * F('sell_price_usd')), Decimal('0'), output_field=DecimalField()),
        )

        return {
            'report_date': self.report_date,
            'exchange_rate': float(exchange_rate),

            # Orderlar
            'orders': {
                'total_dealers': order_stats['total_dealers'],
                'total_amount_usd': float(order_stats['total_amount_usd']),
                'total_products': order_items['total_products'],
                'total_quantity': float(order_items['total_quantity']),
                'total_value_usd': float(order_items['total_value_usd']),
            },

            # To'lovlar
            'payments': {
                'total_dealers': payment_summary['total_dealers'],
                'cash_usd': float(payment_summary['cash_usd']),
                'cash_uzs': float(payment_summary['cash_uzs']),
                'cash_uzs_usd_equivalent': float(payment_summary['cash_uzs_usd_equivalent']),
                'card_payments': payment_summary['card_payments'],
                'bank_payments': payment_summary['bank_payments'],
                'total_usd': float(
                    float(payment_summary['cash_usd']) +
                    float(payment_summary['cash_uzs_usd_equivalent']) +
                    sum(p['amount_usd'] for p in payment_summary['card_payments']) +
                    sum(p['amount_usd'] for p in payment_summary['bank_payments'])
                ),
            },

            # Qaytarmalar
            'returns': {
                'total_dealers': return_stats['total_dealers'],
                'total_products': return_items['total_products'],
                'total_quantity': float(return_items['total_quantity']),
                'total_amount_usd': float(return_stats['total_amount_usd']),
            },

            # Refundlar
            'refunds': {
                'total_dealers': refunds['total_dealers'],
                'total_amount_usd': float(refunds['total_amount_usd']),
            },

            # Umumiy holat
            'overall': {
                'total_dealers_debt_usd': float(total_debt['total_balance_usd']),
                'warehouse_total_quantity': float(warehouse_stats['total_quantity']),
                'warehouse_total_value_usd': float(warehouse_stats['total_value_usd']),
            },
        }

    def generate_report(self) -> Dict[str, Any]:
        """To'liq hisobotni yaratish"""
        dealer_ids = self.get_dealers_with_activity()
        dealers_data = []

        for dealer_id in dealer_ids:
            dealer = Dealer.objects.get(id=dealer_id)

            dealer_data = {
                'dealer_id': dealer_id,
                'dealer_name': dealer.name,
                'dealer_code': dealer.code,
                'orders': self.get_dealer_orders(dealer_id),
                'returns': self.get_dealer_returns(dealer_id),
                'payments': self.get_dealer_payments(dealer_id),
                'refunds': self.get_dealer_refunds(dealer_id),
            }

            dealers_data.append(dealer_data)

        # Dillerni nom bo'yicha tartiblash
        dealers_data.sort(key=lambda x: x['dealer_name'])

        return {
            'report_date': self.report_date.isoformat(),
            'dealers': dealers_data,
            'summary': self.get_overall_summary(),
        }
