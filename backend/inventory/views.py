from django.db.models import Sum
from django.http import FileResponse, HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from core.utils.exporter import export_returns_to_excel
from core.utils.pdf import render_pdf

from .models import ReturnedProduct
from .serializers import ReturnedProductSerializer


class ReturnedProductViewSet(ModelViewSet):
    queryset = (
        ReturnedProduct.objects.select_related('dealer', 'product', 'created_by')
        .all()
        .order_by('-created_at')
    )
    serializer_class = ReturnedProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset
        role = getattr(user, 'role', '') or ''
        if role in {'admin', 'accountant', 'owner'}:
            return qs
        if role in {'warehouse'}:
            return qs
        if role in {'sales', 'sales_manager'}:
            return qs.filter(dealer__manager_user=user)
        return qs.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ReturnedProductStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        aggregates = (
            ReturnedProduct.objects.values('return_type')
            .order_by()
            .annotate(total=Sum('quantity'))
        )
        stats = {'good': 0, 'defective': 0}
        for row in aggregates:
            key = row['return_type']
            if key in stats and row['total'] is not None:
                stats[key] = float(row['total'])
        return Response(stats)


class ReturnsExportExcelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        returns = ReturnedProduct.objects.select_related('dealer', 'product').order_by('-created_at')
        file_path = export_returns_to_excel(returns)
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_path.name)


class ReturnsReportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        returns = ReturnedProduct.objects.select_related('dealer', 'product').order_by('-created_at')
        pdf_bytes = render_pdf('reports/returns_report.html', {'returns': returns})
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename=returns_report.pdf'
        return response
