from datetime import date

from rest_framework import serializers

from .models import InventoryAdjustment, ReturnedProduct


class InventoryAdjustmentSerializer(serializers.ModelSerializer):
    """Serializer for inventory audit adjustments."""
    
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    total_delta = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = InventoryAdjustment
        fields = (
            'id',
            'product',
            'product_sku',
            'product_name',
            'delta_ok',
            'delta_defect',
            'previous_ok',
            'previous_defect',
            'new_ok',
            'new_defect',
            'total_delta',
            'date',
            'created_by',
            'created_by_name',
            'comment',
            'created_at',
        )
        read_only_fields = ('created_by', 'created_by_name', 'created_at', 'total_delta')


class AuditImportRequestSerializer(serializers.Serializer):
    """Serializer for audit import request."""
    
    file = serializers.FileField(
        required=True,
        help_text='Excel file with audit data (.xlsx)'
    )
    date = serializers.DateField(
        required=False,
        default=date.today,
        help_text='Date of physical audit (defaults to today)'
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text='Optional comment for all adjustments'
    )
    
    def validate_file(self, value):
        """Validate file extension."""
        if not value.name.endswith('.xlsx'):
            raise serializers.ValidationError('File must be an Excel file (.xlsx)')
        return value


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
