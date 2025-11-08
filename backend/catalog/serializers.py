from rest_framework import serializers

from .models import Brand, Category, Product


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name')


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description')


class ProductSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(queryset=Brand.objects.all(), source='brand', write_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, allow_null=True
    )
    total_stock = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'sku',
            'name',
            'brand',
            'brand_id',
            'category',
            'category_id',
            'dealer',
            'size',
            'unit',
            'cost_usd',
            'sell_price_usd',
            'stock_ok',
            'stock_defect',
            'total_stock',
            'availability_status',
            'barcode',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('barcode', 'created_at', 'updated_at')

    def get_total_stock(self, obj):
        return obj.stock_ok + obj.stock_defect

    def get_availability_status(self, obj):
        return 'Not available' if obj.stock_ok <= 0 else 'Available'
