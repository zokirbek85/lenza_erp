from rest_framework.generics import ListAPIView
from dealers.models import Dealer
from dealers.serializers import DealerSerializer

class DealerListAllView(ListAPIView):
    queryset = Dealer.objects.all().order_by("name")
    serializer_class = DealerSerializer
    pagination_class = None
