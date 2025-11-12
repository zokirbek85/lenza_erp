"""
Universal monthly report generation mixin for all modules.
Provides unified report() action with PDF/XLSX/JSON support.
"""
import datetime
from django.db.models import Sum, Q
from rest_framework.decorators import action
from rest_framework.response import Response
from core.mixins.export_mixins import ExportMixin


class BaseReportMixin(ExportMixin):
    """
    Universal monthly report generator for all modules.
    
    Usage:
        class MyViewSet(viewsets.ModelViewSet, BaseReportMixin):
            date_field = "created_at"  # field for date filtering
            filename_prefix = "mymodule"
            title_prefix = "My Module Report"
            report_template = "mymodule/report.html"
            
            def get_report_rows(self, queryset):
                return [{"Column": value} for obj in queryset]
            
            def get_report_total(self, queryset):
                return queryset.aggregate(Sum("amount"))["amount__sum"] or 0
    """
    
    # Subclass should override these
    date_field = "date"
    filename_prefix = "report"
    title_prefix = "Hisobot"
    report_template = None  # e.g., "expenses/report.html"
    
    def get_queryset_for_month(self, month_str):
        """
        Filter queryset by month and return (queryset, year, month).
        If month_str is invalid, uses current month.
        """
        try:
            year, month = map(int, month_str.split("-"))
            if month < 1 or month > 12:
                raise ValueError("Invalid month")
        except Exception:
            today = datetime.date.today()
            year, month = today.year, today.month
        
        start_date = datetime.date(year, month, 1)
        if month == 12:
            end_date = datetime.date(year + 1, 1, 1)
        else:
            end_date = datetime.date(year, month + 1, 1)
        
        filters = {
            f"{self.date_field}__gte": start_date,
            f"{self.date_field}__lt": end_date
        }
        
        return self.get_queryset().filter(**filters), year, month
    
    def get_report_rows(self, queryset):
        """
        Subclass must implement this to return list of dicts for export.
        Each dict represents one row with column names as keys.
        """
        raise NotImplementedError("Subclass must implement get_report_rows()")
    
    def get_report_total(self, queryset):
        """
        Subclass must implement this to return total amount or count.
        """
        raise NotImplementedError("Subclass must implement get_report_total()")
    
    def get_report_context(self, rows, total, year, month):
        """
        Build context dict for PDF template.
        Subclass can override to add more fields.
        """
        return {
            "rows": rows,
            "total": f"{float(total):,.2f}",
            "title": f"{self.title_prefix} — {month:02d}.{year}",
            "month": f"{month:02d}.{year}",
            "year": year,
            "month_num": month,
        }
    
    def generate_report(self, request, rows, total, year, month, filename):
        """
        Generate report in requested format (pdf/xlsx/json).
        """
        fmt = request.query_params.get("format", "json").lower()
        ctx = self.get_report_context(rows, total, year, month)
        
        if fmt == "pdf":
            if not self.report_template:
                raise ValueError(f"{self.__class__.__name__} must set report_template")
            
            doc_type = f"{self.filename_prefix}-report"
            doc_id = f"{year}-{month:02d}"
            
            return self.render_pdf_with_qr(
                self.report_template,
                ctx,
                f"{filename}_{year}_{month:02d}.pdf",
                request,
                doc_type=doc_type,
                doc_id=doc_id
            )
        
        elif fmt == "xlsx":
            return self.render_xlsx(rows, f"{filename}_{year}_{month:02d}.xlsx")
        
        else:
            # Return JSON with row count for preview
            return Response({
                **ctx,
                "count": len(rows),
                "format": "json"
            })
    
    @action(detail=False, methods=["get"])
    def report(self, request):
        """
        Universal monthly report endpoint.
        
        Query params:
            - month: YYYY-MM (default: current month)
            - format: pdf|xlsx|json (default: json)
        
        Returns:
            - PDF with company branding and QR verification
            - XLSX with company header
            - JSON with summary data
        """
        month_param = request.query_params.get("month")
        qs, year, month = self.get_queryset_for_month(month_param)
        
        rows = self.get_report_rows(qs)
        total = self.get_report_total(qs)
        
        return self.generate_report(
            request,
            rows,
            total,
            year,
            month,
            self.filename_prefix
        )
