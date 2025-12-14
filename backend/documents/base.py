"""
Base PDF Document Generator with common components.

Provides reusable components for all PDF documents:
- Header (company logo, info)
- Footer (page numbers, date)
- Standard fonts, colors, margins
- Watermark support
- QR code generation
"""

from datetime import date
from decimal import Decimal
from io import BytesIO
from typing import Any, Dict, Optional
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import translation
import qrcode

# Lazy import WeasyPrint to avoid startup errors if GTK not installed
def get_weasyprint_html():
    from weasyprint import HTML
    return HTML


class DocumentStyle:
    """Standard style constants for all PDF documents."""
    
    # Colors
    PRIMARY = '#0f172a'
    ACCENT = '#0d9488'
    TEXT_MUTED = '#6b7280'
    BORDER = '#e5e7eb'
    BACKGROUND = '#f8fafc'
    SUCCESS = '#10b981'
    WARNING = '#f59e0b'
    ERROR = '#ef4444'
    
    # Typography
    FONT_FAMILY = "'DejaVu Sans', 'Arial Unicode MS', 'Inter', 'Segoe UI', Arial, sans-serif"
    FONT_SIZE_BASE = '13px'
    FONT_SIZE_SMALL = '11px'
    FONT_SIZE_LARGE = '16px'
    FONT_SIZE_XLARGE = '22px'
    
    # Spacing
    PAGE_MARGIN = '32px'
    SECTION_SPACING = '28px'
    CARD_PADDING = '16px 18px'
    TABLE_PADDING = '12px 14px'
    
    # Borders
    BORDER_RADIUS = '14px'
    BORDER_RADIUS_LARGE = '18px'


class BaseDocument:
    """
    Base class for all PDF documents.
    
    Provides common functionality:
    - Template rendering
    - Header/footer generation
    - QR code creation
    - Watermark support
    - PDF compilation
    """
    
    # Override in subclasses
    template_name: str = None
    document_type: str = 'document'
    
    def __init__(
        self,
        *,
        company_info: Optional[Dict[str, Any]] = None,
        language: str = 'uz',
        add_watermark: bool = False,
        watermark_text: str = 'LENZA ERP',
    ):
        """
        Initialize document generator.
        
        Args:
            company_info: Company information dict
            language: Document language (uz, ru, en)
            add_watermark: Whether to add watermark
            watermark_text: Watermark text
        """
        self.company_info = company_info or self._get_default_company_info()
        self.language = language
        self.add_watermark = add_watermark
        self.watermark_text = watermark_text
        
        # Activate language
        translation.activate(language)
    
    def _get_default_company_info(self) -> Dict[str, Any]:
        """Get default company information."""
        from core.utils.company_info import get_company_info
        return get_company_info()
    
    def get_context(self) -> Dict[str, Any]:
        """
        Get template context. Override in subclasses.
        
        Returns:
            Dictionary with template context
        """
        return {
            'company': self.company_info,
            'language': self.language,
            'today': date.today(),
            'style': DocumentStyle,
            'add_watermark': self.add_watermark,
            'watermark_text': self.watermark_text,
        }
    
    def generate_qr_code(
        self,
        data: str,
        size: int = 10,
        border: int = 2,
    ) -> str:
        """
        Generate QR code as base64 data URI.
        
        Args:
            data: QR code data (URL, text)
            size: QR code size (box size)
            border: Border size
            
        Returns:
            Base64 data URI for embedding in HTML
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=size,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color=DocumentStyle.PRIMARY, back_color='white')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        import base64
        img_base64 = base64.b64encode(buffer.read()).decode()
        return f'data:image/png;base64,{img_base64}'
    
    def get_header_html(self) -> str:
        """Generate header HTML."""
        company = self.company_info
        logo_html = ''
        
        if company.get('logo'):
            logo_html = f'''
            <img src="{company['logo']}" 
                 alt="{company.get('name', '')}" 
                 class="logo-img" />
            '''
        
        return f'''
        <div class="document-header">
            <div class="company-info">
                {logo_html}
                <div class="brand">{company.get('name', 'LENZA')}</div>
                <div class="tagline">{company.get('tagline', 'Professional ERP System')}</div>
            </div>
        </div>
        '''
    
    def get_footer_html(self, page_number: Optional[int] = None) -> str:
        """Generate footer HTML."""
        company = self.company_info
        footer_text = f"{company.get('name', 'LENZA')} | {company.get('phone', '')} | {company.get('email', '')}"
        
        page_info = ''
        if page_number:
            page_info = f'<span class="page-number">Page {page_number}</span>'
        
        return f'''
        <div class="document-footer">
            <div class="footer-text">{footer_text}</div>
            <div class="footer-date">{date.today().strftime('%d.%m.%Y')}</div>
            {page_info}
        </div>
        '''
    
    def get_base_css(self) -> str:
        """Get base CSS for all documents."""
        return f'''
        @page {{
            size: A4;
            margin: {DocumentStyle.PAGE_MARGIN};
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: {DocumentStyle.FONT_FAMILY};
            font-size: {DocumentStyle.FONT_SIZE_BASE};
            line-height: 1.5;
            color: {DocumentStyle.PRIMARY};
            background: {DocumentStyle.BACKGROUND};
        }}

        .document {{
            background: #fff;
            border: 1px solid {DocumentStyle.BORDER};
            border-radius: {DocumentStyle.BORDER_RADIUS_LARGE};
            padding: 32px;
            max-width: 900px;
            margin: 0 auto;
        }}

        .document-header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: {DocumentStyle.SECTION_SPACING};
            padding-bottom: 20px;
            border-bottom: 2px solid {DocumentStyle.ACCENT};
        }}

        .logo-img {{
            height: 56px;
            object-fit: contain;
            display: block;
            margin-bottom: 8px;
        }}

        .brand {{
            font-weight: 700;
            font-size: 20px;
            letter-spacing: 0.04em;
            color: {DocumentStyle.PRIMARY};
        }}

        .tagline {{
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
            color: {DocumentStyle.TEXT_MUTED};
            margin-top: 4px;
        }}

        .document-footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid {DocumentStyle.BORDER};
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
            color: {DocumentStyle.TEXT_MUTED};
        }}

        .info-cards {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: {DocumentStyle.SECTION_SPACING};
        }}

        .info-card {{
            border: 1px solid {DocumentStyle.BORDER};
            border-radius: {DocumentStyle.BORDER_RADIUS};
            padding: {DocumentStyle.CARD_PADDING};
            background: #fdfefe;
        }}

        .info-card-label {{
            color: {DocumentStyle.TEXT_MUTED};
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 4px;
            display: block;
        }}

        .info-card-value {{
            display: block;
            margin-top: 6px;
            font-size: 14px;
            font-weight: 600;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid {DocumentStyle.BORDER};
        }}

        thead {{
            background: #eef2ff;
        }}

        th {{
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: {DocumentStyle.TEXT_MUTED};
            padding: 10px 14px;
            text-align: left;
            font-weight: 600;
        }}

        td {{
            padding: {DocumentStyle.TABLE_PADDING};
            border-top: 1px solid {DocumentStyle.BORDER};
        }}

        tbody tr:nth-child(even) {{
            background: #fafafa;
        }}

        .text-right {{ text-align: right; }}
        .text-center {{ text-align: center; }}
        .font-bold {{ font-weight: 700; }}
        .text-muted {{ color: {DocumentStyle.TEXT_MUTED}; }}
        .text-accent {{ color: {DocumentStyle.ACCENT}; }}
        .text-success {{ color: {DocumentStyle.SUCCESS}; }}
        .text-warning {{ color: {DocumentStyle.WARNING}; }}
        .text-error {{ color: {DocumentStyle.ERROR}; }}

        .watermark {{
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.03);
            z-index: -1;
            white-space: nowrap;
            pointer-events: none;
        }}

        .qr-box {{
            text-align: right;
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
        }}

        .qr-img {{
            height: 80px;
            width: 80px;
        }}

        .totals-table {{
            width: auto;
            margin-left: auto;
            border-radius: {DocumentStyle.BORDER_RADIUS};
        }}

        .totals-table td {{
            padding: 8px 16px;
            font-weight: 600;
        }}

        .totals-table tr:last-child td {{
            font-size: {DocumentStyle.FONT_SIZE_LARGE};
            color: {DocumentStyle.ACCENT};
        }}

        .signature-section {{
            margin-top: 48px;
            display: flex;
            justify-content: space-between;
            gap: 32px;
        }}

        .signature-box {{
            flex: 1;
        }}

        .signature-line {{
            width: 100%;
            border-top: 1px solid {DocumentStyle.BORDER};
            text-align: center;
            padding-top: 8px;
            margin-top: 48px;
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
            color: {DocumentStyle.TEXT_MUTED};
        }}

        .notes {{
            margin-top: 32px;
            padding: 16px;
            border-radius: 12px;
            border: 1px dashed {DocumentStyle.BORDER};
            background: #fefce8;
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
        }}

        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: {DocumentStyle.FONT_SIZE_SMALL};
            font-weight: 600;
        }}

        .badge-success {{
            background: #d1fae5;
            color: #065f46;
        }}

        .badge-warning {{
            background: #fef3c7;
            color: #92400e;
        }}

        .badge-error {{
            background: #fee2e2;
            color: #991b1b;
        }}
        '''
    
    def render_html(self, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Render document to HTML string.
        
        Args:
            context: Additional template context
            
        Returns:
            Rendered HTML string
        """
        if not self.template_name:
            raise NotImplementedError('template_name must be set in subclass')
        
        full_context = self.get_context()
        if context:
            full_context.update(context)
        
        return render_to_string(self.template_name, full_context)
    
    def render_pdf(self, context: Optional[Dict[str, Any]] = None) -> bytes:
        """
        Render document to PDF bytes.
        
        Args:
            context: Additional template context
            
        Returns:
            PDF file as bytes
        """
        html_string = self.render_html(context)
        HTML = get_weasyprint_html()
        return HTML(string=html_string, encoding='utf-8').write_pdf()
    
    def get_response(
        self,
        context: Optional[Dict[str, Any]] = None,
        filename: Optional[str] = None,
        inline: bool = True,
    ) -> HttpResponse:
        """
        Get HTTP response with PDF.
        
        Args:
            context: Additional template context
            filename: PDF filename
            inline: If True, display inline; if False, download
            
        Returns:
            HttpResponse with PDF
        """
        pdf_bytes = self.render_pdf(context)
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        
        if filename:
            disposition = 'inline' if inline else 'attachment'
            response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
        
        return response
    
    @staticmethod
    def format_currency(
        amount: Decimal,
        currency: str = 'USD',
        show_currency: bool = True,
    ) -> str:
        """Format currency value."""
        if currency.upper() == 'USD':
            formatted = f"${amount:,.2f}"
        elif currency.upper() == 'UZS':
            formatted = f"{amount:,.0f} so'm"
        else:
            formatted = f"{amount:,.2f} {currency}"
        
        return formatted if show_currency else f"{amount:,.2f}"
    
    @staticmethod
    def format_date(date_obj: date, format: str = '%d.%m.%Y') -> str:
        """Format date."""
        return date_obj.strftime(format) if date_obj else '—'
    
    @staticmethod
    def format_quantity(qty: Decimal) -> str:
        """Format quantity."""
        return f"{qty:,.2f}".rstrip('0').rstrip('.')
