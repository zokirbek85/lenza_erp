from __future__ import annotations

import base64
from io import BytesIO
from typing import Iterable, Sequence

import qrcode
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone
from openpyxl import Workbook

# Lazy import WeasyPrint to avoid startup errors if GTK not installed
def get_weasyprint_html():
    from weasyprint import HTML
    return HTML


class ExportMixin:
    """
    Shared helpers for PDF / XLSX exports with verification QR codes.
    """

    def render_pdf_simple(
        self,
        template_path: str,
        context: dict,
        filename: str,
        request,
    ) -> HttpResponse:
        """
        Render PDF without QR code verification (for marketing documents)
        """
        html = render_to_string(
            template_path,
            {
                **context,
                'generated_at': timezone.now(),
            },
        )
        HTML = get_weasyprint_html()
        
        # Try to get base URL, fallback to None if it fails
        try:
            base_url = request.build_absolute_uri('/')
        except Exception:
            base_url = None
            
        pdf_bytes = HTML(
            string=html,
            base_url=base_url,
            encoding='utf-8'
        ).write_pdf()
        response = HttpResponse(pdf_bytes, content_type='application/pdf; charset=utf-8')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response

    def _build_qr_code(self, data: str) -> str:
        qr = qrcode.make(data)
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        encoded = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{encoded}"

    def render_pdf_with_qr(
        self,
        template_path: str,
        context: dict,
        *,
        filename_prefix: str,
        request,
        doc_type: str,
        doc_id,
    ) -> HttpResponse:
        # Build API verification URL for React frontend
        if doc_type == 'order':
            api_path = reverse('verify-order-api', args=[doc_id])
        elif doc_type == 'reconciliation':
            api_path = reverse('verify-reconciliation-api', args=[doc_id])
        else:
            # Fallback to legacy HTML endpoint for other doc types
            api_path = reverse('verify-document', args=[doc_type, doc_id])
        
        # For QR code, link to frontend verification page (not API endpoint)
        # Frontend will make API call to fetch data
        try:
            base_url = request.build_absolute_uri('/')
        except Exception:
            # Fallback to relative URLs if build_absolute_uri fails
            from django.conf import settings
            base_url = getattr(settings, 'SITE_URL', 'https://erp.lenza.uz/')
            
        if doc_type == 'order':
            verify_url = f"{base_url.rstrip('/')}/verify/order/{doc_id}/"
        elif doc_type == 'reconciliation':
            verify_url = f"{base_url.rstrip('/')}/verify/reconciliation/{doc_id}/"
        else:
            try:
                verify_url = request.build_absolute_uri(reverse('verify-document', args=[doc_type, doc_id]))
            except Exception:
                verify_url = f"{base_url.rstrip('/')}{reverse('verify-document', args=[doc_type, doc_id])}"
        
        qr_code = self._build_qr_code(verify_url)

        html = render_to_string(
            template_path,
            {
                **context,
                'verify_url': verify_url,
                'qr_code': qr_code,
                'generated_at': timezone.now(),
            },
        )
        HTML = get_weasyprint_html()
        
        # Try to get base URL for PDF rendering, fallback to None if it fails
        try:
            pdf_base_url = request.build_absolute_uri('/')
        except Exception:
            pdf_base_url = None
            
        pdf_bytes = HTML(
            string=html,
            base_url=pdf_base_url,
            encoding='utf-8'
        ).write_pdf()
        filename = f"{filename_prefix}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf; charset=utf-8')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response

    def render_xlsx(self, rows: Sequence | Iterable, filename_prefix: str) -> HttpResponse:
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = 'Maʼlumotlar'

        rows = list(rows or [])
        if rows:
            first = rows[0]
            if isinstance(first, dict):
                headers = list(first.keys())
                worksheet.append(headers)
                for row in rows:
                    worksheet.append([row.get(header, '') for header in headers])
            else:
                for row in rows:
                    if isinstance(row, (list, tuple)):
                        worksheet.append(list(row))
                    else:
                        worksheet.append([row])
        else:
            worksheet.append(['Maʼlumot topilmadi'])

        for column_cells in worksheet.columns:
            max_length = max(len(str(cell.value or '')) for cell in column_cells)
            column_letter = column_cells[0].column_letter
            worksheet.column_dimensions[column_letter].width = min(40, max(12, max_length + 2))

        stream = BytesIO()
        workbook.save(stream)
        stream.seek(0)

        filename = f"{filename_prefix}.xlsx"
        response = HttpResponse(
            stream.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
