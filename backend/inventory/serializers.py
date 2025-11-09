from rest_framework import serializers

from .models import ReturnedProduct


class ReturnedProductSerializer(serializers.ModelSerializer):
    dealer_name = serializers.CharField(source='dealer.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ReturnedProduct
        fields = (
            'id',
            'dealer',
            'dealer_name',
            'product',
            'product_name',
            'quantity',
            'return_type',
            'reason',
            'created_by',
            'created_by_name',
            'created_at',
        )
        read_only_fields = ('created_by', 'created_by_name', 'created_at')
