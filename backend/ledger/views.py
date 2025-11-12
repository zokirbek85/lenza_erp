from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.utils.dateparse import parse_date
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from datetime import timedelta, date
from .models import LedgerAccount, LedgerEntry
from .serializers import LedgerAccountSerializer, LedgerEntrySerializer
from .services import LedgerService
from decimal import Decimal


class IsOwnerOrAccountantOrAdmin(permissions.BasePermission):
    """Only owner, admin, and accountant can access ledger."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) in ('owner', 'admin', 'accountant')


class LedgerAccountViewSet(viewsets.ModelViewSet):
    queryset = LedgerAccount.objects.filter(is_active=True).select_related('payment_card')
    serializer_class = LedgerAccountSerializer
    permission_classes = [IsOwnerOrAccountantOrAdmin]
    http_method_names = ['get', 'post', 'patch', 'delete']

    @action(detail=False, methods=['get'])
    def balances(self, request):
        """Get aggregated USD balances by account with UZS equivalent."""
        from payments.models import CurrencyRate
        
        # Get latest exchange rate
        latest_rate = CurrencyRate.objects.order_by('-rate_date').first()
        usd_to_uzs = Decimal(str(latest_rate.usd_to_uzs)) if latest_rate else Decimal('12500')
        
        # Aggregate balances in USD
        entries = LedgerEntry.objects.values('account').annotate(total_usd=Sum('amount_usd'))
        totals = {e['account']: float(e['total_usd'] or 0) for e in entries}
        
        # Calculate total balances
        total_balance = sum(totals.values())
        cash_balance = 0
        bank_balance = 0
        card_balance = 0
        
        accounts_data = []
        for acc in self.get_queryset():
            balance_usd = totals.get(acc.id, 0.0)
            balance_uzs = round(balance_usd * float(usd_to_uzs), 2)
            
            # Sum by type
            if acc.type == 'cash':
                cash_balance += balance_usd
            elif acc.type == 'bank':
                bank_balance += balance_usd
            elif acc.type == 'card':
                card_balance += balance_usd
            
            accounts_data.append({
                'id': acc.id,
                'name': acc.name,
                'type': acc.type,
                'currency': acc.currency,
                'balance_usd': balance_usd,
                'balance_uzs': balance_uzs,
                'card_name': acc.payment_card.name if acc.payment_card else None,
            })
        
        return Response({
            'rate': float(usd_to_uzs),
            'total_balance': total_balance,
            'cash_balance': cash_balance,
            'bank_balance': bank_balance,
            'card_balance': card_balance,
            'accounts': accounts_data
        })


class LedgerEntryViewSet(viewsets.ModelViewSet):
    queryset = LedgerEntry.objects.select_related('account', 'created_by').all()
    serializer_class = LedgerEntrySerializer
    permission_classes = [IsOwnerOrAccountantOrAdmin]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        qs = super().get_queryset()
        account = self.request.query_params.get('account')
        d1 = self.request.query_params.get('from')
        d2 = self.request.query_params.get('to')
        if account:
            qs = qs.filter(account_id=account)
        if d1:
            date_from = parse_date(d1)
            if date_from:
                qs = qs.filter(date__gte=date_from)
        if d2:
            date_to = parse_date(d2)
            if date_to:
                qs = qs.filter(date__lte=date_to)
        return qs.order_by('-date', '-id')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def adjustment(self, request):
        """Create manual adjustment entry."""
        account_id = request.data.get('account')
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'USD')
        note = request.data.get('note', 'Manual adjustment')
        date_str = request.data.get('date')
        
        if not account_id or amount is None:
            return Response({'error': 'account and amount required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            account = LedgerAccount.objects.get(id=account_id, is_active=True)
        except LedgerAccount.DoesNotExist:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        
        adj_date = None
        if date_str:
            adj_date = parse_date(date_str)
        
        entry = LedgerService.post_adjustment(
            account=account,
            amount=Decimal(str(amount)),
            currency=currency,
            note=note,
            actor=request.user,
            date=adj_date
        )
        serializer = self.get_serializer(entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        """Mark an entry as reconciled."""
        entry = self.get_object()
        entry.reconciled = True
        entry.reconciled_at = timezone.now()
        entry.reconciled_by = request.user
        entry.save()
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unreconcile(self, request, pk=None):
        """Unmark an entry as reconciled."""
        entry = self.get_object()
        entry.reconciled = False
        entry.reconciled_at = None
        entry.reconciled_by = None
        entry.save()
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def flow(self, request):
        """Get cash flow trend for the last 30 days."""
        today = date.today()
        days = int(request.query_params.get('days', 30))
        start = today - timedelta(days=days - 1)
        
        # Get all entries within the date range
        qs = LedgerEntry.objects.filter(date__gte=start, date__lte=today).order_by('date')
        
        # Calculate cumulative balance for each day
        data = []
        for i in range(days):
            d = start + timedelta(days=i)
            # Get cumulative balance up to this date
            cumulative = LedgerEntry.objects.filter(date__lte=d).aggregate(
                total=Sum('amount_usd')
            )['total'] or 0
            
            data.append({
                'date': d.strftime('%d.%m'),
                'full_date': d.isoformat(),
                'balance_usd': float(cumulative)
            })
        
        return Response(data)


class LedgerReportPDFView(viewsets.ViewSet):
    permission_classes = [IsOwnerOrAccountantOrAdmin]

    def list(self, request):
        """Generate PDF report for ledger entries."""
        account = request.query_params.get('account')
        d1 = request.query_params.get('from')
        d2 = request.query_params.get('to')
        
        qs = LedgerEntry.objects.select_related('account', 'created_by').all()
        if account:
            qs = qs.filter(account_id=account)
        if d1:
            date_from = parse_date(d1)
            if date_from:
                qs = qs.filter(date__gte=date_from)
        if d2:
            date_to = parse_date(d2)
            if date_to:
                qs = qs.filter(date__lte=date_to)
        qs = qs.order_by('date', 'id')
        
        # Calculate totals
        total_usd_in = float(qs.filter(amount_usd__gt=0).aggregate(s=Sum('amount_usd'))['s'] or 0)
        total_usd_out = float(qs.filter(amount_usd__lt=0).aggregate(s=Sum('amount_usd'))['s'] or 0)
        net_balance = total_usd_in + total_usd_out
        
        # Render PDF
        from django.template.loader import render_to_string
        from weasyprint import HTML
        from core.models import CompanyInfo
        
        company = CompanyInfo.objects.first()
        logo_url = company.logo.url if company and company.logo else None
        
        account_name = None
        if account:
            try:
                acc = LedgerAccount.objects.get(id=account)
                account_name = acc.name
            except LedgerAccount.DoesNotExist:
                pass
        
        html = render_to_string(
            'reports/ledger_report.html',
            {
                'entries': qs,
                'company': company,
                'logo_url': request.build_absolute_uri(logo_url) if logo_url else None,
                'from_date': d1,
                'to_date': d2,
                'account_name': account_name,
                'generated_at': timezone.now(),
                'total_in': total_usd_in,
                'total_out': abs(total_usd_out),
                'net_balance': net_balance,
            },
        )
        pdf = HTML(string=html, base_url=request.build_absolute_uri('/')).write_pdf()
        resp = HttpResponse(pdf, content_type='application/pdf')
        resp['Content-Disposition'] = 'inline; filename="ledger_report.pdf"'
        return resp


class LedgerExportExcelView(viewsets.ViewSet):
    permission_classes = [IsOwnerOrAccountantOrAdmin]

    def list(self, request):
        """Export ledger entries to Excel."""
        account = request.query_params.get('account')
        d1 = request.query_params.get('from')
        d2 = request.query_params.get('to')
        
        qs = LedgerEntry.objects.select_related('account', 'created_by').all()
        if account:
            qs = qs.filter(account_id=account)
        if d1:
            date_from = parse_date(d1)
            if date_from:
                qs = qs.filter(date__gte=date_from)
        if d2:
            date_to = parse_date(d2)
            if date_to:
                qs = qs.filter(date__lte=date_to)
        qs = qs.order_by('date', 'id')
        
        # Build Excel
        from core.utils.exporter import _prepare_workbook, _workbook_to_file
        
        workbook, worksheet = _prepare_workbook(
            'Ledger Entries',
            ['Date', 'Account', 'Kind', 'Ref', 'Currency', 'Amount', 'USD Amount', 'Note', 'Created By'],
        )
        for e in qs:
            worksheet.append([
                e.date.isoformat() if e.date else '',
                e.account.name,
                e.kind,
                f"{e.ref_app} #{e.ref_id}" if e.ref_app and e.ref_id else '',
                e.currency,
                float(e.amount),
                float(e.amount_usd),
                e.note or '',
                e.created_by.full_name if e.created_by else '',
            ])
        
        # Add totals row
        total_usd_in = float(qs.filter(amount_usd__gt=0).aggregate(s=Sum('amount_usd'))['s'] or 0)
        total_usd_out = float(qs.filter(amount_usd__lt=0).aggregate(s=Sum('amount_usd'))['s'] or 0)
        worksheet.append(['', '', '', '', '', '', '', '', ''])
        worksheet.append(['', '', '', '', 'TOTALS:', f'{total_usd_in:.2f}', f'{total_usd_out:.2f}', f'Net: {total_usd_in + total_usd_out:.2f}', ''])
        
        file_path = _workbook_to_file(workbook, 'ledger_entries')
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)
