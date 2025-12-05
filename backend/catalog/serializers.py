from decimal import Decimal

from rest_framework import serializers

from .models import Brand, Category, Collection, DoorColor, DoorModel, Product, ProductMeta, Style


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name')


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description')


class StyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Style
        fields = '__all__'


class CatalogProductSerializer(serializers.ModelSerializer):
    """Serializer for catalog page - shows products with stock breakdown by width."""
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    price_usd = serializers.DecimalField(source='sell_price_usd', max_digits=12, decimal_places=2, read_only=True)
    stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ('id', 'name', 'brand_name', 'price_usd', 'image', 'stock', 'size')

    def get_stock(self, obj):
        """
        Parse size field and return stock breakdown by width.
        Expects size format like: "400", "600mm", "700x2000", etc.
        Returns dict like: {"400": 2, "600": 0, "700": 12, ...}
        """
        widths = ['400', '600', '700', '800', '900']
        stock_breakdown = {width: 0 for width in widths}
        
        # Extract width from size field (e.g., "800mm" -> "800", "800x2000" -> "800")
        if obj.size:
            size_str = obj.size.strip().lower()
            # Extract numeric part before 'mm', 'x', or end of string
            for width in widths:
                if size_str.startswith(width):
                    stock_breakdown[width] = int(obj.stock_ok) if obj.stock_ok else 0
                    break
        
        return stock_breakdown

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Convert image field to full URL
        if instance.image and hasattr(instance.image, 'url'):
            data['image'] = request.build_absolute_uri(instance.image.url) if request else instance.image.url
        else:
            data['image'] = None
        
        # Remove size field from output (already used in stock calculation)
        data.pop('size', None)
        
        return data


class ProductSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    brand_id = serializers.PrimaryKeyRelatedField(queryset=Brand.objects.all(), source='brand', write_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, allow_null=True
    )
    style = StyleSerializer(read_only=True)
    style_id = serializers.PrimaryKeyRelatedField(
        queryset=Style.objects.all(), source='style', write_only=True, required=False, allow_null=True
    )
    total_stock = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()
    stock_ok = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0'),
        coerce_to_string=False,
    )
    stock_defect = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0'),
        coerce_to_string=False,
    )

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
            'style',
            'style_id',
            'size',
            'unit',
            'cost_usd',
            'sell_price_usd',
            'stock_ok',
            'stock_defect',
            'total_stock',
            'availability_status',
            'barcode',
            'image',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('barcode', 'image', 'created_at', 'updated_at')

    def get_total_stock(self, obj):
        total = (obj.stock_ok or Decimal('0')) + (obj.stock_defect or Decimal('0'))
        return float(total)

    def get_availability_status(self, obj):
        return 'Not available' if obj.stock_ok <= 0 else 'Available'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Convert image field to full URL
        if instance.image and hasattr(instance.image, 'url'):
            data['image'] = request.build_absolute_uri(instance.image.url) if request else instance.image.url
        else:
            data['image'] = None
        
        if request and hasattr(request.user, 'role') and request.user.role == 'warehouse':
            # Remove price fields for warehouse users
            data.pop('cost_usd', None)
            data.pop('sell_price_usd', None)
        return data


# ============================================================================
# DOOR CATALOG SERIALIZERS (for "Дверное полотно" category)
# ============================================================================


class CollectionSerializer(serializers.ModelSerializer):
    """Serializer for door collections"""
    class Meta:
        model = Collection
        fields = ('id', 'name', 'description', 'is_active')


class DoorModelSerializer(serializers.ModelSerializer):
    """Serializer for door models"""
    collection_name = serializers.CharField(source='collection.name', read_only=True)
    
    class Meta:
        model = DoorModel
        fields = ('id', 'name', 'collection', 'collection_name', 'description', 'is_active')


class DoorColorSerializer(serializers.ModelSerializer):
    """Serializer for door colors"""
    class Meta:
        model = DoorColor
        fields = ('id', 'name', 'code', 'is_active')


class ProductMetaSerializer(serializers.ModelSerializer):
    """Serializer for product metadata"""
    collection_name = serializers.CharField(source='collection.name', read_only=True)
    model_name = serializers.CharField(source='model.name', read_only=True)
    color_name = serializers.CharField(source='color.name', read_only=True)
    door_type_display = serializers.CharField(source='get_door_type_display', read_only=True)
    door_size_display = serializers.CharField(source='get_door_size_display', read_only=True)
    
    class Meta:
        model = ProductMeta
        fields = (
            'product',
            'collection',
            'collection_name',
            'model',
            'model_name',
            'color',
            'color_name',
            'door_type',
            'door_type_display',
            'door_size',
            'door_size_display',
            'custom_size',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class ProductWithMetaSerializer(ProductSerializer):
    """Extended product serializer that includes metadata for door products"""
    meta = ProductMetaSerializer(read_only=True)
    
    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ('meta',)


class DoorCatalogItemSerializer(serializers.Serializer):
    """
    Serializer for individual door product in catalog structure.
    Represents: Brand → Collection → Model → (Color + Type) → Size (SKU)
    """
    product_id = serializers.IntegerField()
    sku = serializers.CharField()
    name = serializers.CharField()
    door_type = serializers.CharField()
    door_type_display = serializers.CharField()
    door_size = serializers.CharField()
    door_size_display = serializers.CharField()
    custom_size = serializers.CharField(allow_blank=True)
    cost_usd = serializers.DecimalField(max_digits=12, decimal_places=2)
    sell_price_usd = serializers.DecimalField(max_digits=12, decimal_places=2)
    stock_ok = serializers.DecimalField(max_digits=14, decimal_places=2)
    stock_defect = serializers.DecimalField(max_digits=14, decimal_places=2)
    is_active = serializers.BooleanField()
    image = serializers.CharField(allow_null=True)


class DoorCatalogColorTypeSerializer(serializers.Serializer):
    """
    Groups products by Color + Type combination
    """
    color_id = serializers.IntegerField()
    color_name = serializers.CharField()
    color_code = serializers.CharField(allow_blank=True)
    products = DoorCatalogItemSerializer(many=True)


class DoorCatalogModelSerializer(serializers.Serializer):
    """
    Groups products by Model
    """
    model_id = serializers.IntegerField()
    model_name = serializers.CharField()
    color_groups = DoorCatalogColorTypeSerializer(many=True)


class DoorCatalogCollectionSerializer(serializers.Serializer):
    """
    Groups products by Collection
    """
    collection_id = serializers.IntegerField()
    collection_name = serializers.CharField()
    models = DoorCatalogModelSerializer(many=True)


class DoorCatalogSerializer(serializers.Serializer):
    """
    Top-level catalog structure grouped by Brand
    Structure: Brand → Collection → Model → (Color + Type) → Size (SKU)
    """
    brand_id = serializers.IntegerField()
    brand_name = serializers.CharField()
    collections = DoorCatalogCollectionSerializer(many=True)
