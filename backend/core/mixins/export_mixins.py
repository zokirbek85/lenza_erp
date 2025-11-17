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
from weasyprint import HTML


class ExportMixin:
    """
    Shared helpers for PDF / XLSX exports with verification QR codes.
    """

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
        verify_url = request.build_absolute_uri(reverse('verify-document', args=[doc_type, doc_id]))
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
        pdf_bytes = HTML(string=html, base_url=request.build_absolute_uri('/')).write_pdf()
        filename = f"{filename_prefix}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
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
            stream.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
