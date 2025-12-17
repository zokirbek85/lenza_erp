from decimal import Decimal

from rest_framework import serializers

from .models import (
    Brand, Category, DoorKitComponent, Inbound, InboundItem, Product,
    ProductModel, ProductSKU, ProductVariant, Style
)


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
    """Detailed serializer for product variants with SKU and configurations"""
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
            'sku',
            'image',
            'configurations',
            'is_active',
            'skus',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')
    
    def validate_sku(self, value):
        """Validate SKU is unique (excluding current instance in update)"""
        if not value or not value.strip():
            raise serializers.ValidationError("SKU is required")
        
        value = value.strip().upper()
        
        # Check uniqueness
        queryset = ProductVariant.objects.filter(sku=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(f"Variant with SKU '{value}' already exists")
        
        return value
    
    def validate_configurations(self, value):
        """Validate configurations format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Configurations must be a list")
        
        for idx, config in enumerate(value):
            if not isinstance(config, dict):
                raise serializers.ValidationError(f"Configuration {idx + 1} must be an object")
            
            if 'name' not in config or 'value' not in config:
                raise serializers.ValidationError(f"Configuration {idx + 1} must have 'name' and 'value' fields")
            
            if not config['name'] or not config['name'].strip():
                raise serializers.ValidationError(f"Configuration {idx + 1} name cannot be empty")
            
            if not config['value'] or not config['value'].strip():
                raise serializers.ValidationError(f"Configuration {idx + 1} value cannot be empty")
        
        return value


class DoorKitComponentSerializer(serializers.ModelSerializer):
    """
    Serializer for door kit components (pogonaj).
    Shows component details in catalog.
    """
    component_name = serializers.CharField(source='component.name', read_only=True)
    component_sku = serializers.CharField(source='component.sku', read_only=True)
    component_price_usd = serializers.DecimalField(
        source='component.sell_price_usd',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    total_price_usd = serializers.SerializerMethodField()
    
    class Meta:
        model = DoorKitComponent
        fields = (
            'id',
            'component',
            'component_sku',
            'component_name',
            'component_price_usd',
            'quantity',
            'total_price_usd',
        )
    
    def get_total_price_usd(self, obj):
        """Component narxi * quantity"""
        return float(obj.total_price_usd)


class VariantCatalogSerializer(serializers.ModelSerializer):
    """
    Serializer for catalog card view.
    Returns variant as main unit with size/stock breakdown AND komplektatsiya info.
    
    Example output:
    {
      "id": 512,
      "model": "Бета Софт",
      "color": "тач-серый",
      "door_type": "ПГ",
      "brand": "ДУБРАВА СИБИРЬ",
      "collection": "Эмалит",
      "image": "https://.../variant.png",
      "polotno_price_usd": 102.50,
      "kit_price_usd": 40.00,
      "full_set_price_usd": 142.50,
      "sizes": [
         {"size": "400мм", "stock": 0},
         {"size": "600мм", "stock": 3},
      ],
      "kit_details": [
         {
            "id": 1,
            "component": 345,
            "component_name": "Наличник 70мм Лофт белый",
            "component_price_usd": 3.50,
            "quantity": 2.50,
            "total_price_usd": 8.75
         }
      ],
      "max_full_sets_by_stock": 27
    }
    """
    brand = serializers.CharField(source='brand_name', read_only=True)
    collection = serializers.CharField(source='collection_name', read_only=True)
    model = serializers.CharField(source='model_name', read_only=True)
    door_type_display = serializers.CharField(source='get_door_type_display', read_only=True)
    
    # Narx maydonlari (komplektatsiya bilan)
    polotno_price_usd = serializers.SerializerMethodField()
    kit_price_usd = serializers.SerializerMethodField()
    full_set_price_usd = serializers.SerializerMethodField()
    
    # Eski maydon (backward compatibility)
    price_usd = serializers.SerializerMethodField()
    price_uzs = serializers.SerializerMethodField()
    
    sizes = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    
    # Komplektatsiya detallari
    kit_details = DoorKitComponentSerializer(source='kit_components', many=True, read_only=True)
    max_full_sets_by_stock = serializers.SerializerMethodField()
    
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
            # Yangi narx fieldlari
            'polotno_price_usd',
            'kit_price_usd',
            'full_set_price_usd',
            # Eski fieldlar (backward compatibility)
            'price_usd',
            'price_uzs',
            'sizes',
            # Komplektatsiya
            'kit_details',
            'max_full_sets_by_stock',
        )
    
    def get_polotno_price_usd(self, obj):
        """Faqat polotno narxi (minimal SKU narxi)"""
        price = obj.min_price_usd
        return float(price) if price else None
    
    def get_kit_price_usd(self, obj):
        """Komplektatsiya (pogonaj) narxi"""
        price = obj.kit_total_price_usd
        return float(price) if price else None
    
    def get_full_set_price_usd(self, obj):
        """To'liq komplekt narxi (polotno + komplektatsiya)"""
        price = obj.full_set_price_usd
        return float(price) if price else None
    
    def get_price_usd(self, obj):
        """Backward compatibility: default to full_set_price or polotno"""
        full_price = obj.full_set_price_usd
        if full_price:
            return float(full_price)
        polotno_price = obj.min_price_usd
        return float(polotno_price) if polotno_price else 0.0
    
    def get_price_uzs(self, obj):
        """UZS narxi (full set yoki polotno)"""
        # Full set narxidan hisoblash
        usd_price = self.get_price_usd(obj)
        if not usd_price:
            return 0.0
        
        from finance.models import ExchangeRate
        rate = ExchangeRate.objects.order_by('-rate_date').first()
        if rate:
            uzs_price = Decimal(str(usd_price)) * rate.usd_to_uzs
            return float(uzs_price.quantize(Decimal('0.01')))
        return 0.0
    
    def get_sizes(self, obj):
        """Список размеров с остатками"""
        return obj.get_size_stock()
    
    def get_image(self, obj):
        """Полный URL изображения (null agar fayl yo'q bo'lsa)"""
        request = self.context.get('request')
        if obj.image:
            # Check if file actually exists
            try:
                if obj.image.storage.exists(obj.image.name):
                    if request:
                        return request.build_absolute_uri(obj.image.url)
                    return obj.image.url
            except Exception:
                pass
        return None
    
    def get_max_full_sets_by_stock(self, obj):
        """Nechta to'liq komplekt skladdagi pogonaj bilan yig'ish mumkin"""
        return obj.max_full_sets_by_stock


# ============================================================================
# PUBLIC CATALOG SERIALIZER (for external customers)
# ============================================================================

class PublicVariantCatalogSerializer(serializers.ModelSerializer):
    """
    Public catalog serializer for external customers.
    
    DOES NOT INCLUDE:
    - Prices (no pricing information)
    - Stock quantities (no inventory data)
    - Internal IDs
    
    ONLY SHOWS:
    - Product information (model, brand, color, type)
    - Available sizes (without stock quantities)
    - Product images
    
    Used for public catalogue at https://lenza.uz/catalogue
    No authentication required.
    """
    model = serializers.CharField(source='model_name', read_only=True)
    brand = serializers.CharField(source='brand_name', read_only=True)
    door_type_display = serializers.CharField(source='get_door_type_display', read_only=True)
    image = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductVariant
        fields = (
            'id',
            'model',
            'brand',
            'color',
            'door_type',
            'door_type_display',
            'image',
            'sizes',
        )
    
    def get_image(self, obj):
        """Full URL to product image"""
        request = self.context.get('request')
        if obj.image:
            try:
                if obj.image.storage.exists(obj.image.name):
                    if request:
                        return request.build_absolute_uri(obj.image.url)
                    return obj.image.url
            except Exception:
                pass
        return None
    
    def get_sizes(self, obj):
        """List of available sizes (without stock quantities)"""
        size_stock = obj.get_size_stock()
        # Return only sizes, no stock information
        return [item['size'] for item in size_stock]


class InboundItemSerializer(serializers.ModelSerializer):
    """Serializer for individual inbound items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    brand_name = serializers.CharField(source='product.brand.name', read_only=True)
    
    class Meta:
        model = InboundItem
        fields = ('id', 'product', 'product_name', 'product_sku', 'brand_name', 'quantity')
    
    def validate_quantity(self, value):
        """Ensure quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value


class InboundSerializer(serializers.ModelSerializer):
    """Serializer for inbound documents"""
    items = InboundItemSerializer(many=True, read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    total_items = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = Inbound
        fields = (
            'id', 'brand', 'brand_name', 'date', 'status', 'comment',
            'created_by', 'created_by_name', 'created_at', 'confirmed_at',
            'items', 'total_items', 'total_quantity'
        )
        read_only_fields = ('status', 'created_by', 'created_at', 'confirmed_at')
    
    def get_total_items(self, obj):
        """Total number of distinct products in the inbound"""
        return obj.items.count()
    
    def get_total_quantity(self, obj):
        """Total quantity across all items"""
        return sum(item.quantity for item in obj.items.all())


class InboundCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating inbound documents with items"""
    items = InboundItemSerializer(many=True)
    
    class Meta:
        model = Inbound
        fields = ('id', 'brand', 'date', 'comment', 'items')
    
    def validate_items(self, items):
        """Validate that items list is not empty and has no duplicates"""
        if not items:
            raise serializers.ValidationError("Inbound must have at least one item")
        
        # Check for duplicate products
        product_ids = [item['product'].id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Duplicate products are not allowed in one inbound")
        
        return items
    
    def validate(self, attrs):
        """Validate that all products belong to the selected brand"""
        brand = attrs.get('brand')
        items = attrs.get('items', [])
        
        for item in items:
            product = item['product']
            if product.brand_id != brand.id:
                raise serializers.ValidationError(
                    f"Product '{product.name}' does not belong to brand '{brand.name}'"
                )
        
        return attrs
    
    def create(self, validated_data):
        """Create inbound document with items"""
        items_data = validated_data.pop('items')
        
        # Set created_by from request context
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        inbound = Inbound.objects.create(**validated_data)
        
        # Create items
        for item_data in items_data:
            InboundItem.objects.create(inbound=inbound, **item_data)
        
        return inbound

