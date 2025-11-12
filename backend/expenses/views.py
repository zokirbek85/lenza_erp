from datetime import date, timedelta
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
from .serializers import ExpenseSerializer, ExpenseTypeSerializer


class ExpenseTypeViewSet(viewsets.ModelViewSet):
    queryset = ExpenseType.objects.all()
    serializer_class = ExpenseTypeSerializer
    permission_classes = [IsAdmin | IsAccountant | IsOwner]

    def get_permissions(self):
        # Only admins can modify expense types; others can read
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class ExpenseViewSet(viewsets.ModelViewSet):
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


class ExpenseReportPDFView(permissions.IsAuthenticated, viewsets.ViewSet):
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

        # Render PDF
        from django.template.loader import render_to_string
        from weasyprint import HTML
        from core.models import CompanyInfo

        company = CompanyInfo.objects.first()
        logo_url = company.logo.url if company and company.logo else None
        html = render_to_string(
            'reports/expenses_report.html',
            {
                'items': qs,
                'company': company,
                'logo_url': request.build_absolute_uri(logo_url) if logo_url else None,
                'from_date': from_date,
                'to_date': to_date,
                'generated_at': timezone.now(),
                'total_usd': float(qs.filter(currency='USD').aggregate(s=Sum('amount'))['s'] or 0),
                'total_uzs': float(qs.filter(currency='UZS').aggregate(s=Sum('amount'))['s'] or 0),
            },
        )
        pdf = HTML(string=html, base_url=request.build_absolute_uri('/')).write_pdf()
        resp = HttpResponse(pdf, content_type='application/pdf')
        resp['Content-Disposition'] = 'inline; filename="expenses_report.pdf"'
        return resp


class ExpenseExportExcelView(permissions.IsAuthenticated, viewsets.ViewSet):
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

        # Build simple Excel via exporter helpers
        workbook, worksheet = _prepare_workbook(
            'Expenses',
            ['Date', 'Type', 'Method', 'Card', 'Currency', 'Amount', 'Status', 'Comment'],
        )
        for e in qs:
            worksheet.append(
                [
                    e.date.isoformat() if e.date else '',
                    e.type.name,
                    e.method,
                    e.card.name if e.card else '',
                    e.currency,
                    float(e.amount),
                    e.status,
                    e.comment or '',
                ]
            )
        file_path = _workbook_to_file(workbook, 'expenses')
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
