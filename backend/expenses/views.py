from datetime import date, timedelta, datetime
from calendar import month_abbr
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.http import HttpResponse, FileResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdmin, IsAccountant, IsOwner
from core.utils.exporter import _prepare_workbook, _workbook_to_file
from payments.models import CurrencyRate
from .models import Expense, ExpenseType
from core.mixins.report_mixin import BaseReportMixin
from core.mixins.export_mixins import ExportMixin
from .serializers import ExpenseSerializer, ExpenseTypeSerializer


class ExpenseTypeViewSet(viewsets.ModelViewSet):
    queryset = ExpenseType.objects.all().order_by('name')
    serializer_class = ExpenseTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """Only admins can create/update/delete expense types; others can read."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class ExpenseViewSet(viewsets.ModelViewSet, BaseReportMixin):
    queryset = Expense.objects.select_related('type', 'card', 'created_by', 'approved_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]
    filterset_fields = {
        'date': ['exact', 'gte', 'lte'],
        'type': ['exact'],
        'method': ['exact'],
        'currency': ['exact'],
        'status': ['exact'],
    }
    ordering = ('-date', '-created_at')
    
    # BaseReportMixin configuration
    date_field = "date"
    filename_prefix = "expenses"
    title_prefix = "Chiqimlar hisoboti"
    report_template = "expenses/report.html"

    def _ensure_writer(self):
        user = self.request.user
        if user.is_superuser:
            return
        if getattr(user, 'role', None) not in {'admin', 'accountant'}:
            raise permissions.PermissionDenied('Only accountant or admin may modify expenses.')

    def perform_create(self, serializer):
        self._ensure_writer()
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        self._ensure_writer()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_writer()
        instance.delete()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = date.today()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Eng so'nggi valyuta kursini olamiz
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = Decimal(str(latest_rate.usd_to_uzs)) if latest_rate else Decimal('12500')
        
        def convert_to_usd(expense):
            """Chiqimni USDga konvertatsiya qilish"""
            if expense.currency == 'USD':
                return Decimal(str(expense.amount))
            elif expense.currency == 'UZS':
                return (Decimal(str(expense.amount)) / usd_to_uzs).quantize(Decimal('0.01'))
            return Decimal(str(expense.amount))
        
        base = Expense.objects.filter(status='tasdiqlangan')
        
        # Har bir davr uchun chiqimlarni olib, USDga konvertatsiya qilamiz
        today_expenses = base.filter(date=today)
        week_expenses = base.filter(date__gte=week_ago)
        month_expenses = base.filter(date__gte=month_ago)
        
        today_total = sum(convert_to_usd(e) for e in today_expenses)
        week_total = sum(convert_to_usd(e) for e in week_expenses)
        month_total = sum(convert_to_usd(e) for e in month_expenses)
        
        stats = {
            'today': float(today_total),
            'week': float(week_total),
            'month': float(month_total),
            'rate': float(usd_to_uzs),
        }
        return Response(stats)

    @action(detail=False, methods=['get'])
    def trend(self, request):
        """Get expense trend with filters (date range, type, method, currency)."""
        # Query parameters
        start_param = request.query_params.get('start_date')
        end_param = request.query_params.get('end_date')
        method = request.query_params.get('method')
        type_id = request.query_params.get('type')
        currency = request.query_params.get('currency')
        
        # Default date range: last 30 days
        today = date.today()
        start_date = parse_date(start_param) if start_param else today - timedelta(days=29)
        end_date = parse_date(end_param) if end_param else today
        
        # Eng so'nggi valyuta kursini olamiz
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = Decimal(str(latest_rate.usd_to_uzs)) if latest_rate else Decimal('12500')
        
        def convert_to_usd(expense):
            """Chiqimni USDga konvertatsiya qilish"""
            if expense.currency == 'USD':
                return Decimal(str(expense.amount))
            elif expense.currency == 'UZS':
                return (Decimal(str(expense.amount)) / usd_to_uzs).quantize(Decimal('0.01'))
            return Decimal(str(expense.amount))
        
        # Build queryset with filters
        base_qs = Expense.objects.filter(
            status='tasdiqlangan',
            date__gte=start_date,
            date__lte=end_date
        )
        
        if method:
            base_qs = base_qs.filter(method=method)
        if type_id:
            base_qs = base_qs.filter(type_id=type_id)
        if currency:
            base_qs = base_qs.filter(currency=currency)
        
        # Calculate daily expenses (non-cumulative for trend chart)
        data = []
        total_period_usd = Decimal('0')
        num_days = (end_date - start_date).days + 1
        
        for i in range(num_days):
            d = start_date + timedelta(days=i)
            daily_expenses = base_qs.filter(date=d)
            daily_usd = sum(convert_to_usd(e) for e in daily_expenses)
            total_period_usd += daily_usd
            
            data.append({
                'date': d.strftime('%d.%m'),
                'full_date': d.isoformat(),
                'total_usd': float(daily_usd)
            })
        
        return Response({
            'data': data,
            'total_usd': float(total_period_usd),
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': num_days
            }
        })

    @action(detail=False, methods=['get'])
    def distribution(self, request):
        """Get expense distribution by type for the last 30 days."""
        today = date.today()
        days = int(request.query_params.get('days', 30))
        start = today - timedelta(days=days - 1)
        
        # Eng so'nggi valyuta kursini olamiz
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = Decimal(str(latest_rate.usd_to_uzs)) if latest_rate else Decimal('12500')
        
        def convert_to_usd(expense):
            """Chiqimni USDga konvertatsiya qilish"""
            if expense.currency == 'USD':
                return Decimal(str(expense.amount))
            elif expense.currency == 'UZS':
                return (Decimal(str(expense.amount)) / usd_to_uzs).quantize(Decimal('0.01'))
            return Decimal(str(expense.amount))
        
        # Filter expenses by date range and status
        qs = Expense.objects.filter(
            status='tasdiqlangan',
            date__gte=start,
            date__lte=today
        ).select_related('type')
        
        # Group by expense type
        summary = {}
        for exp in qs:
            type_name = exp.type.name if exp.type else 'Boshqa'
            amount_usd = convert_to_usd(exp)
            summary[type_name] = summary.get(type_name, Decimal('0')) + amount_usd
        
        # Calculate total and percentages
        total = sum(summary.values())
        data = [
            {
                'type': type_name,
                'amount_usd': float(amount),
                'percent': float((amount / total * 100).quantize(Decimal('0.01'))) if total > 0 else 0
            }
            for type_name, amount in sorted(summary.items(), key=lambda x: x[1], reverse=True)
        ]
        return Response({
            'data': data,
            'total_usd': float(total),
            'period_days': days
        })

    @action(detail=False, methods=['get'])
    def report(self, request):
        """Monthly expense report by type with USD/UZS totals. Optional PDF via ?format=pdf."""
        # Parse month param YYYY-MM; default current month
        month_str = request.query_params.get('month')
        if not month_str:
            month_str = datetime.now().strftime('%Y-%m')
        try:
            year, month = map(int, month_str.split('-'))
        except Exception:
            return Response({'error': 'Invalid month format. Use YYYY-MM.'}, status=400)

        # Latest currency rate
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = Decimal(str(latest_rate.usd_to_uzs)) if latest_rate else Decimal('12500')

        # Base queryset for the month (confirmed expenses only)
        qs = (
            Expense.objects.select_related('type')
            .filter(status='tasdiqlangan', date__year=year, date__month=month)
        )

        data = []
        total_usd = Decimal('0')
        total_uzs = Decimal('0')

        for t in ExpenseType.objects.filter(is_active=True).order_by('name'):
            items = qs.filter(type=t)
            usd = Decimal('0')
            uzs = Decimal('0')
            for e in items:
                amt = Decimal(str(e.amount))
                if e.currency == 'UZS':
                    uzs += amt
                    usd += (amt / usd_to_uzs)
                else:
                    usd += amt
                    uzs += (amt * usd_to_uzs)
            data.append({
                'type': t.name,
                'usd': float(usd.quantize(Decimal('0.01'))),
                'uzs': float(uzs.quantize(Decimal('1'))),
            })
            total_usd += usd
            total_uzs += uzs

        # Sort by USD amount descending for better readability
        data.sort(key=lambda x: x['usd'], reverse=True)

        fmt = request.query_params.get('format', 'json').lower()
        
        if fmt == 'pdf':
            context = {
                'month': month_str,
                'rows': data,
                'total_usd': float(total_usd.quantize(Decimal('0.01'))),
                'total_uzs': float(total_uzs.quantize(Decimal('1'))),
                'rate': float(usd_to_uzs)
            }
            return self.render_pdf_with_qr(
                'expenses/report.html',
                context,
                f'Expense_Report_{month_str}',
                request=request,
                doc_type='expense-report',
                doc_id=month_str,
            )
        
        elif fmt == 'xlsx':
            # Convert to Excel-friendly format
            excel_rows = []
            for row in data:
                excel_rows.append({
                    'Turi': row['type'],
                    'USD': f"{row['usd']:,.2f}",
                    'UZS': f"{row['uzs']:,.0f}",
                })
            return self.render_xlsx(excel_rows, f'Chiqimlar_hisoboti_{month_str}.xlsx')

        return Response({
            'month': month_str,
            'rate': float(usd_to_uzs),
            'rows': data,
            'total_usd': float(total_usd.quantize(Decimal('0.01'))),
            'total_uzs': float(total_uzs.quantize(Decimal('1'))),
        })

    @action(detail=False, methods=['get'])
    def compare(self, request):
        """Compare last 6 months expenses by type (in USD), stacked bar friendly."""
        today = date.today()

        # Latest rate for conversion
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = Decimal(str(latest_rate.usd_to_uzs)) if latest_rate else Decimal('12500')

        # Helper to get year, month going back i months (i=0 current month)
        def shift_months(base_year: int, base_month: int, back: int):
            m = base_month - back
            y = base_year
            while m <= 0:
                m += 12
                y -= 1
            return y, m

        # Build data per month
        month_data = []  # list of (label, {type: amount_usd}) oldest -> newest
        type_names_set = set()

        # Collect from oldest to newest for chart left->right
        for i in range(5, -1, -1):
            y, m = shift_months(today.year, today.month, i)
            label = f"{month_abbr[m]} {y}"
            qs = Expense.objects.select_related('type').filter(
                status='tasdiqlangan',
                date__year=y,
                date__month=m,
            )
            type_totals = {}
            for e in qs:
                # convert to USD
                amt = Decimal(str(e.amount))
                if e.currency == 'UZS':
                    amt = (amt / usd_to_uzs)
                type_name = e.type.name if e.type else 'Boshqa'
                type_totals[type_name] = type_totals.get(type_name, Decimal('0')) + amt
                type_names_set.add(type_name)

            month_data.append((label, type_totals))

        types = sorted(type_names_set)
        chart = []
        for label, totals in month_data:
            row = { 'month': label }
            for t in types:
                row[t] = float(totals.get(t, Decimal('0')).quantize(Decimal('0.01')))
            chart.append(row)

        return Response({ 'types': types, 'chart': chart })

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Update expense status. Only admin/accountant can change status."""
        self._ensure_writer()
        expense = self.get_object()
        old_status = expense.status
        new_status = request.data.get('status')
        if new_status not in dict(Expense.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=400)
        
        expense.status = new_status
        if new_status == 'tasdiqlangan' and not expense.approved_by:
            expense.approved_by = request.user
            expense.approved_at = timezone.now()
        expense.save()
        
        # Post to ledger if status changed to tasdiqlangan
        if old_status != 'tasdiqlangan' and new_status == 'tasdiqlangan':
            from ledger.services import LedgerService
            LedgerService.post_expense(expense, actor=request.user)
        
        serializer = self.get_serializer(expense)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Unified export endpoint: ?format=pdf|xlsx"""
        fmt = request.query_params.get('format', 'xlsx')
        qs = self.filter_queryset(self.get_queryset().select_related('type', 'card'))

        rows = [{
            'Sana': (e.date.isoformat() if e.date else ''),
            'Turi': (e.type.name if e.type else ''),
            'Miqdor': float(e.amount),
            'Valyuta': e.currency,
            'To‘lov turi': e.method,
            'Karta': (e.card.name if e.card else ''),
            'Izoh': (e.comment or ''),
            'Holat': e.status,
        } for e in qs.order_by('date', 'id')]

        context = {'rows': rows, 'title': 'Chiqimlar hisobot'}
        if fmt == 'pdf':
            return self.render_pdf_with_qr(
                'expenses/export.html',
                context,
                'chiqimlar',
                request=request,
                doc_type='expense-export',
                doc_id=None,
            )
        return self.render_xlsx(rows, 'chiqimlar')


class ExpenseReportPDFView(viewsets.ViewSet, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def list(self, request):
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        type_id = request.query_params.get('type')
        method = request.query_params.get('method')
        qs = Expense.objects.select_related('type', 'card').all()
        if from_date:
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)
        if type_id:
            qs = qs.filter(type_id=type_id)
        if method:
            qs = qs.filter(method=method)

        context = {
            'items': qs,
            'from_date': from_date,
            'to_date': to_date,
            'generated_at': timezone.now(),
            'total_usd': float(qs.filter(currency='USD').aggregate(s=Sum('amount'))['s'] or 0),
            'total_uzs': float(qs.filter(currency='UZS').aggregate(s=Sum('amount'))['s'] or 0),
        }

        # Create a stable doc_id from date filters if provided
        doc_id = 'bulk'
        if from_date or to_date:
            f = from_date.replace('-', '') if from_date else 'start'
            t = to_date.replace('-', '') if to_date else 'end'
            doc_id = f'{f}_{t}'

        return self.render_pdf_with_qr(
            'reports/expenses_report.html',
            context,
            filename_prefix='expenses_report',
            request=request,
            doc_type='expenses-report',
            doc_id=doc_id,
        )


class ExpenseExportExcelView(permissions.IsAuthenticated, viewsets.ViewSet, ExportMixin):
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def list(self, request):
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        type_id = request.query_params.get('type')
        method = request.query_params.get('method')
        qs = Expense.objects.select_related('type', 'card').all()
        if from_date:
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)
        if type_id:
            qs = qs.filter(type_id=type_id)
        if method:
            qs = qs.filter(method=method)

        # Build rows and render via ExportMixin
        rows = []
        for e in qs.order_by('date', 'id'):
            rows.append({
                'Date': (e.date.isoformat() if e.date else ''),
                'Type': (e.type.name if e.type else ''),
                'Method': e.method,
                'Card': (e.card.name if e.card else ''),
                'Currency': e.currency,
                'Amount': float(e.amount),
                'Status': e.status,
                'Comment': (e.comment or ''),
            })
        return self.render_xlsx(rows, 'expenses')
