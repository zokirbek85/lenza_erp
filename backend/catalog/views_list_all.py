from rest_framework.generics import ListAPIView
from .models import Dealer
from .serializers import DealerSerializer

class DealerListAllView(ListAPIView):
    queryset = Dealer.objects.all().order_by("name")
    serializer_class = DealerSerializer
    pagination_class = None
