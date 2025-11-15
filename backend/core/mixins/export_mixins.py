"""
Temporary placeholder for export_mixins - to be removed
These mixins are deprecated and will be removed in future versions.
"""
from django.http import HttpResponse


class ExportMixin:
    """Deprecated: Use new export utilities instead"""
    
    def render_pdf_with_qr(self, *args, **kwargs):
        """Deprecated placeholder"""
        return HttpResponse("This export method is deprecated", status=501)
    
    def render_xlsx(self, *args, **kwargs):
        """Deprecated placeholder"""
        return HttpResponse("This export method is deprecated", status=501)
