from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Return
from .serializers import ReturnSerializer

class ReturnViewSet(viewsets.ModelViewSet):
    queryset = Return.objects.prefetch_related('items', 'items__product').select_related('order', 'created_by').all()
    serializer_class = ReturnSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {'request': self.request}

# Create your views here.
