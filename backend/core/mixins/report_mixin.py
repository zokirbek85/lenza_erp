"""
Temporary placeholder for report_mixin - to be removed
This mixin is deprecated and will be removed in future versions.
"""
from rest_framework.response import Response


class BaseReportMixin:
    """Deprecated: Use new export utilities instead"""
    
    def get_queryset_for_month(self, *args, **kwargs):
        """Deprecated placeholder"""
        return self.get_queryset()
    
    def generate_report(self, *args, **kwargs):
        """Deprecated placeholder"""
        return Response({"error": "This method is deprecated"}, status=501)
