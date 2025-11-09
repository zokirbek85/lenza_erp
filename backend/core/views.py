from django.http import FileResponse
from rest_framework import permissions, status, viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.serializers import ProductSerializer
from core.permissions import IsAdmin, IsOwner
from dealers.models import Dealer
from dealers.serializers import DealerSerializer
from orders.models import Order
from orders.serializers import OrderSerializer

from .config import load_config, update_config
from .middleware import AuditLog
from .utils.backup import create_backup, get_latest_backup
from .models import CompanyInfo
from .serializers import AuditLogSerializer, CompanyInfoSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin | IsOwner]
    filterset_fields = ('method',)


class SystemConfigView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(load_config())

    def put(self, request):
        config = update_config(request.data)
        return Response(config)


class SystemBackupView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        latest = get_latest_backup()
        if not latest:
            latest = create_backup()
        return FileResponse(open(latest, 'rb'), as_attachment=True, filename=latest.name)


class SearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'products': [], 'dealers': [], 'orders': []})

        products = Product.objects.filter(name__icontains=query)[:10]
        dealers = Dealer.objects.filter(name__icontains=query)[:10]
        orders = Order.objects.filter(display_no__icontains=query)[:10]

        context = {'request': request}
        return Response(
            {
                'products': ProductSerializer(products, many=True, context=context).data,
                'dealers': DealerSerializer(dealers, many=True, context=context).data,
                'orders': OrderSerializer(orders, many=True, context=context).data,
            }
        )


class CompanyInfoViewSet(viewsets.ModelViewSet):
    queryset = CompanyInfo.objects.all()
    serializer_class = CompanyInfoSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return CompanyInfo.objects.all()[:1]

    def create(self, request, *args, **kwargs):
        instance = CompanyInfo.objects.first()
        if instance:
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)
