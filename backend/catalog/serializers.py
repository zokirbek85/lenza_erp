from decimal import Decimal

from rest_framework import serializers

from .models import Brand, Category, Product, ProductModel, ProductSKU, ProductVariant, Style


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
# VARIANT-BASED CATALOG SERIALIZERS (for "Дверное полотно" category)
# ============================================================================

from .models import ProductModel, ProductVariant, ProductSKU


class ProductModelSerializer(serializers.ModelSerializer):
    """Serializer for product models"""
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    variants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductModel
        fields = (
            'id',
            'brand',
            'brand_name',
            'collection',
            'model_name',
            'preview_image',
            'description',
            'is_active',
            'variants_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')
    
    def get_variants_count(self, obj):
        return obj.variants.filter(is_active=True).count()


class ProductSKUSerializer(serializers.ModelSerializer):
    """Serializer for product SKUs"""
    variant_name = serializers.CharField(source='variant.__str__', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    price_usd = serializers.DecimalField(source='product.sell_price_usd', max_digits=12, decimal_places=2, read_only=True)
    stock = serializers.DecimalField(source='product.stock_ok', max_digits=14, decimal_places=2, read_only=True)
    size_display = serializers.CharField(source='get_size_display', read_only=True)
    
    class Meta:
        model = ProductSKU
        fields = (
            'id',
            'variant',
            'variant_name',
            'size',
            'size_display',
            'custom_size',
            'product',
            'product_sku',
            'product_name',
            'price_usd',
            'stock',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class ProductVariantDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for product variants with SKUs"""
    brand_name = serializers.CharField(source='product_model.brand.name', read_only=True)
    collection = serializers.CharField(source='product_model.collection', read_only=True)
    model_name = serializers.CharField(source='product_model.model_name', read_only=True)
    door_type_display = serializers.CharField(source='get_door_type_display', read_only=True)
    skus = ProductSKUSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProductVariant
        fields = (
            'id',
            'product_model',
            'brand_name',
            'collection',
            'model_name',
            'color',
            'door_type',
            'door_type_display',
            'image',
            'is_active',
            'skus',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class VariantCatalogSerializer(serializers.ModelSerializer):
    """
    Serializer for catalog card view.
    Returns variant as main unit with size/stock breakdown.
    
    Example output:
    {
      "id": 512,
      "model": "Бета Софт",
      "color": "тач-серый",
      "door_type": "ПГ",
      "brand": "ДУБРАВА СИБИРЬ",
      "collection": "Эмалит",
      "image": "https://.../variant.png",
      "price_usd": 102.50,
      "price_uzs": 1250000.00,
      "sizes": [
         {"size": "400мм", "stock": 0},
         {"size": "600мм", "stock": 3},
         {"size": "700мм", "stock": 12},
         {"size": "800мм", "stock": 5},
         {"size": "900мм", "stock": 0}
      ]
    }
    """
    brand = serializers.CharField(source='brand_name', read_only=True)
    collection = serializers.CharField(source='collection_name', read_only=True)
    model = serializers.CharField(source='model_name', read_only=True)
    door_type_display = serializers.CharField(source='get_door_type_display', read_only=True)
    price_usd = serializers.SerializerMethodField()
    price_uzs = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductVariant
        fields = (
            'id',
            'brand',
            'collection',
            'model',
            'color',
            'door_type',
            'door_type_display',
            'image',
            'price_usd',
            'price_uzs',
            'sizes',
        )
    
    def get_price_usd(self, obj):
        """Минимальная цена USD"""
        return float(obj.get_min_price_usd())
    
    def get_price_uzs(self, obj):
        """Минимальная цена UZS"""
        return float(obj.get_min_price_uzs())
    
    def get_sizes(self, obj):
        """Список размеров с остатками"""
        return obj.get_size_stock()
    
    def get_image(self, obj):
        """Полный URL изображения"""
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
