from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Return
from .serializers import ReturnSerializer


class ReturnViewSet(viewsets.ModelViewSet):
    queryset = (
        Return.objects.select_related('dealer', 'created_by')
        .prefetch_related('items', 'items__product', 'items__product__brand', 'items__product__category')
        .all()
    )
    serializer_class = ReturnSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
