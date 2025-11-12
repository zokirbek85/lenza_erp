from io import BytesIO
from typing import Iterable, Mapping

import base64
import io
import pandas as pd
import qrcode
from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML

from core.models import CompanyInfo


class ExportMixin:
    """Reusable helpers to render PDF and XLSX HTTP responses with company branding."""

    def _get_company_context(self, request=None):
        company = CompanyInfo.objects.first()
        # Build absolute logo URL if possible; else fallback to static logo path
        logo_url = None
        if company and getattr(company, "logo", None):
            try:
                logo_url = company.logo.url
                if request is not None:
                    logo_url = request.build_absolute_uri(logo_url)
            except Exception:
                logo_url = None
        if not logo_url:
            # Fallback to a simple inline SVG logo (no static file dependency)
            svg = (
                "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='40'>"
                "<rect width='160' height='40' fill='#111827'/>"
                "<text x='80' y='26' font-family='Arial, sans-serif' font-size='16' fill='white' text-anchor='middle'>Lenza ERP</text>"
                "</svg>"
            )
            logo_url = f"data:image/svg+xml;utf8,{svg}"

        return {
            "company_name": company.name if company else "Lenza ERP",
            "company_slogan": (company.slogan if company and company.slogan else "Intelligent ERP for Smart Business"),
            "company_address": (company.address if company and company.address else "Tashkent, Uzbekistan"),
            "company_phone": (company.phone if company and company.phone else "+998"),
            "company_logo": logo_url,
        }

    def render_pdf(self, template_name: str, context: Mapping, filename_prefix: str = "report", request=None) -> HttpResponse:
        ctx = dict(context)
        ctx.update(self._get_company_context(request))
        html = render_to_string(template_name, ctx)
        # base_url helps WeasyPrint resolve relative assets if any
        base_url = request.build_absolute_uri("/") if request is not None else None
        pdf_bytes = HTML(string=html, base_url=base_url).write_pdf()
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename_prefix}.pdf"'
        return resp

    def _get_qr_base64(self, verify_url: str) -> str:
        qr = qrcode.QRCode(box_size=3, border=1)
        qr.add_data(verify_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()

    def render_pdf_with_qr(
        self,
        template_name: str,
        context: Mapping,
        filename_prefix: str = "report",
        request=None,
        doc_type: str = "generic",
        doc_id: str | int | None = None,
    ) -> HttpResponse:
        """Render PDF including company branding and QR-code verification footer."""
        # Build verify URL from request when possible; else fallback to SITE_URL or localhost
        path = f"/verify/{doc_type}/{doc_id or 'preview'}/"
        if request is not None:
            verify_url = request.build_absolute_uri(path)
        else:
            site = getattr(settings, "SITE_URL", "http://localhost:8000")
            verify_url = f"{site.rstrip('/')}{path}"

        qr_b64 = self._get_qr_base64(verify_url)

        ctx = dict(context)
        ctx.update(self._get_company_context(request))
        ctx.update({
            "qr_code": f"data:image/png;base64,{qr_b64}",
            "verify_url": verify_url,
        })

        base_url = request.build_absolute_uri("/") if request is not None else None
        html = render_to_string(template_name, ctx)
        pdf_bytes = HTML(string=html, base_url=base_url).write_pdf()
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename_prefix}.pdf"'
        return resp

    def render_xlsx(self, rows: Iterable[Mapping], filename_prefix: str = "report") -> HttpResponse:
        """Render an Excel file using pandas + openpyxl into a BytesIO buffer.

        - Writes a small company header at the top
        - Then writes the provided rows as a table below the header
        - Always returns an attachment response with proper XLSX MIME
        """
        output = BytesIO()

        # Fallback if rows is empty or None
        rows_list = list(rows or [])
        if not rows_list:
            rows_list = [{"Ma'lumot": "Ma'lumot topilmadi"}]

        df = pd.DataFrame(rows_list)

        company = CompanyInfo.objects.first()
        header_df = pd.DataFrame(
            {
                "Company": [company.name if company else "Lenza ERP"],
                "Address": [company.address if company and company.address else "Tashkent, Uzbekistan"],
                "Phone": [company.phone if company and company.phone else "+998"],
                "Slogan": [company.slogan if company and company.slogan else "Intelligent ERP for Smart Business"],
            }
        )

        # Use openpyxl engine per project standard
        writer = pd.ExcelWriter(output, engine="openpyxl")
        sheet_name = "Report"
        header_df.to_excel(writer, sheet_name=sheet_name, index=False, startrow=0)
        start_row = len(header_df.index) + 2  # header rows + blank row
        df.to_excel(writer, sheet_name=sheet_name, index=False, startrow=start_row)
        writer.close()

        output.seek(0)
        resp = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = f'attachment; filename="{filename_prefix}.xlsx"'
        return resp
