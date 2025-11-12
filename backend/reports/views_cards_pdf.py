from datetime import datetime

from django.http import HttpResponse
from django.template.loader import render_to_string
from django.db.models import Sum, Count, Max

from payments.models import Payment
from core.models import CompanyInfo
from core.mixins.export_mixins import ExportMixin


def cards_pdf_report(request):
    user = request.user
    if not user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)
    # Only accountant and owner roles are allowed (superuser also allowed)
    if not (getattr(user, 'is_superuser', False) or getattr(user, 'role', None) in {'accountant', 'owner'}):
        return HttpResponse('Forbidden', status=403)

    from_date = request.GET.get('from')
    to_date = request.GET.get('to')

    qs = Payment.objects.select_related('card').filter(method=Payment.Method.CARD, card__isnull=False)
    if from_date:
        qs = qs.filter(pay_date__gte=from_date)
    if to_date:
        qs = qs.filter(pay_date__lte=to_date)

    data = (
        qs.values('card__name', 'card__number', 'card__holder_name')
        .annotate(
            total_amount=Sum('amount_usd'),
            payments_count=Count('id'),
            last_payment=Max('pay_date'),
        )
        .order_by('-total_amount')
    )

    company = CompanyInfo.objects.first()
    total_sum = sum([(row['total_amount'] or 0) for row in data])
    now = datetime.now().strftime('%d.%m.%Y %H:%M')
    logo_url = None
    if company and company.logo:
        try:
            logo_url = request.build_absolute_uri(company.logo.url)
        except Exception:
            logo_url = None

    context = {
        'data': data,
        'company': company,
        'logo_url': logo_url,
        'total_sum': float(total_sum or 0),
        'from_date': from_date,
        'to_date': to_date,
        'generated_at': now,
    }

    # Use ExportMixin to include QR verification
    mixin = ExportMixin()
    resp = mixin.render_pdf_with_qr(
        'reports/cards_report.html',
        context,
        filename_prefix=f'karta_statistika_{now}',
        request=request,
        doc_type='cards-report',
        doc_id='bulk',
    )
    return resp
