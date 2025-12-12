from decimal import Decimal

from rest_framework import serializers

from .models import (
    Brand, Category, DoorKitComponent, Product, ProductModel, 
    ProductSKU, ProductVariant, Style,
    DefectType, ProductDefect, DefectAuditLog
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


# ============================================================================
# DEFECT SERIALIZERS
# ============================================================================


class DefectTypeSerializer(serializers.ModelSerializer):
    """Serializer for defect type reference"""
    
    class Meta:
        model = DefectType
        fields = (
            'id',
            'name',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class ProductDefectListSerializer(serializers.ModelSerializer):
    """Compact serializer for defect list view"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_image = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    defect_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductDefect
        fields = (
            'id',
            'product',
            'product_name',
            'product_sku',
            'product_image',
            'qty',
            'repairable_qty',
            'non_repairable_qty',
            'status',
            'status_display',
            'defect_summary',
            'created_by_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')
    
    def get_product_image(self, obj):
        """Get product image URL"""
        request = self.context.get('request')
        if obj.product.image:
            try:
                if obj.product.image.storage.exists(obj.product.image.name):
                    if request:
                        return request.build_absolute_uri(obj.product.image.url)
                    return obj.product.image.url
            except Exception:
                pass
        return None
    
    def get_defect_summary(self, obj):
        """Brief summary of defect types"""
        if not obj.defect_details:
            return None
        
        # Return first 3 defect types
        summary = []
        for item in obj.defect_details[:3]:
            summary.append(f"{item.get('type_name', 'Unknown')} ({item.get('qty', 0)})")
        
        if len(obj.defect_details) > 3:
            summary.append(f"+ {len(obj.defect_details) - 3} more")
        
        return ', '.join(summary)


class ProductDefectDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for defect view/edit"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_image = serializers.SerializerMethodField()
    product_price_usd = serializers.DecimalField(
        source='product.sell_price_usd',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    # Enriched defect details with full defect type info
    defect_details_enriched = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductDefect
        fields = (
            'id',
            'product',
            'product_name',
            'product_sku',
            'product_image',
            'product_price_usd',
            'qty',
            'repairable_qty',
            'non_repairable_qty',
            'defect_details',
            'defect_details_enriched',
            'status',
            'status_display',
            'description',
            'repair_materials',
            'repair_completed_at',
            'disposed_at',
            'sold_outlet_at',
            'created_by',
            'created_by_name',
            'updated_by',
            'updated_by_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'created_at', 'updated_at', 'repair_completed_at',
            'disposed_at', 'sold_outlet_at'
        )
    
    def get_product_image(self, obj):
        """Get product image URL"""
        request = self.context.get('request')
        if obj.product.image:
            try:
                if obj.product.image.storage.exists(obj.product.image.name):
                    if request:
                        return request.build_absolute_uri(obj.product.image.url)
                    return obj.product.image.url
            except Exception:
                pass
        return None
    
    def get_defect_details_enriched(self, obj):
        """Enrich defect details with full DefectType info"""
        if not obj.defect_details:
            return []
        
        enriched = []
        for item in obj.defect_details:
            type_id = item.get('type_id')
            if type_id:
                try:
                    defect_type = DefectType.objects.get(id=type_id)
                    enriched.append({
                        'type_id': defect_type.id,
                        'type_name': defect_type.name,
                        'type_description': defect_type.description,
                        'qty': item.get('qty', 0),
                    })
                except DefectType.DoesNotExist:
                    enriched.append(item)
            else:
                enriched.append(item)
        
        return enriched
    
    def validate(self, attrs):
        """Validate defect quantities"""
        qty = attrs.get('qty', self.instance.qty if self.instance else Decimal('0'))
        repairable_qty = attrs.get('repairable_qty', self.instance.repairable_qty if self.instance else Decimal('0'))
        non_repairable_qty = attrs.get('non_repairable_qty', self.instance.non_repairable_qty if self.instance else Decimal('0'))
        
        total = repairable_qty + non_repairable_qty
        if abs(total - qty) > Decimal('0.01'):
            raise serializers.ValidationError({
                'qty': f'Общее количество ({qty}) должно равняться сумме ремонтопригодных ({repairable_qty}) и неремонтопригодных ({non_repairable_qty})'
            })
        
        # Validate defect_details if provided
        defect_details = attrs.get('defect_details', [])
        if defect_details:
            for idx, detail in enumerate(defect_details):
                if not isinstance(detail, dict):
                    raise serializers.ValidationError({
                        'defect_details': f'Defect detail {idx + 1} must be an object'
                    })
                
                if 'type_id' not in detail or 'qty' not in detail:
                    raise serializers.ValidationError({
                        'defect_details': f'Defect detail {idx + 1} must have type_id and qty'
                    })
                
                # Validate type_id exists
                try:
                    defect_type = DefectType.objects.get(id=detail['type_id'])
                    # Add type_name for storage
                    detail['type_name'] = defect_type.name
                except DefectType.DoesNotExist:
                    raise serializers.ValidationError({
                        'defect_details': f'DefectType with id {detail["type_id"]} does not exist'
                    })
        
        return attrs
    
    def create(self, validated_data):
        """Create defect and log audit"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            validated_data['updated_by'] = request.user
        
        defect = super().create(validated_data)
        
        # Create audit log
        DefectAuditLog.objects.create(
            defect=defect,
            action=DefectAuditLog.Action.CREATED,
            new_data={
                'qty': str(defect.qty),
                'repairable_qty': str(defect.repairable_qty),
                'non_repairable_qty': str(defect.non_repairable_qty),
                'status': defect.status,
            },
            description=f'Defect created for {defect.product.name}',
            user=request.user if request and hasattr(request, 'user') else None,
        )
        
        return defect
    
    def update(self, instance, validated_data):
        """Update defect and log audit"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user
        
        # Capture old data for audit
        old_data = {
            'qty': str(instance.qty),
            'repairable_qty': str(instance.repairable_qty),
            'non_repairable_qty': str(instance.non_repairable_qty),
            'status': instance.status,
        }
        
        defect = super().update(instance, validated_data)
        
        # Create audit log
        DefectAuditLog.objects.create(
            defect=defect,
            action=DefectAuditLog.Action.UPDATED,
            old_data=old_data,
            new_data={
                'qty': str(defect.qty),
                'repairable_qty': str(defect.repairable_qty),
                'non_repairable_qty': str(defect.non_repairable_qty),
                'status': defect.status,
            },
            description=f'Defect updated for {defect.product.name}',
            user=request.user if request and hasattr(request, 'user') else None,
        )
        
        return defect


class DefectAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for defect audit log"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = DefectAuditLog
        fields = (
            'id',
            'defect',
            'action',
            'action_display',
            'old_data',
            'new_data',
            'description',
            'user',
            'user_name',
            'created_at',
        )
        read_only_fields = ('created_at',)


class DefectRepairSerializer(serializers.Serializer):
    """Serializer for repair action"""
    quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0.01'),
        help_text="Количество единиц для ремонта"
    )
    materials = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text='Материалы: [{"product_id": 123, "qty": 2}, ...]'
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Описание ремонта"
    )
    
    def validate_quantity(self, value):
        """Validate repair quantity"""
        defect = self.context.get('defect')
        if not defect:
            raise serializers.ValidationError("Defect not found in context")
        
        if value > defect.repairable_qty:
            raise serializers.ValidationError(
                f'Нельзя отремонтировать {value} единиц. Доступно только {defect.repairable_qty}'
            )
        
        return value
    
    def validate_materials(self, materials):
        """Validate materials availability"""
        if not materials:
            return materials
        
        for idx, material in enumerate(materials):
            if 'product_id' not in material or 'qty' not in material:
                raise serializers.ValidationError(
                    f'Material {idx + 1} must have product_id and qty'
                )
            
            product_id = material['product_id']
            qty = Decimal(str(material['qty']))
            
            try:
                product = Product.objects.get(id=product_id)
                material['product_name'] = product.name
                material['product_sku'] = product.sku
                
                # Check stock availability
                if product.stock_ok < qty:
                    raise serializers.ValidationError(
                        f'Недостаточно материала "{product.name}". '
                        f'Требуется: {qty}, доступно: {product.stock_ok}'
                    )
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f'Product with id {product_id} does not exist'
                )
        
        return materials


class DefectDisposeSerializer(serializers.Serializer):
    """Serializer for dispose action"""
    quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0.01'),
        help_text="Количество единиц для утилизации"
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Причина утилизации"
    )
    
    def validate_quantity(self, value):
        """Validate dispose quantity"""
        defect = self.context.get('defect')
        if not defect:
            raise serializers.ValidationError("Defect not found in context")
        
        if value > defect.non_repairable_qty:
            raise serializers.ValidationError(
                f'Нельзя утилизировать {value} единиц. Доступно только {defect.non_repairable_qty}'
            )
        
        return value


class DefectSellOutletSerializer(serializers.Serializer):
    """Serializer for outlet sale action"""
    quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0.01'),
        help_text="Количество единиц для продажи"
    )
    sale_price_usd = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.01'),
        help_text="Цена продажи со скидкой (USD)"
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Описание продажи"
    )
    
    def validate_quantity(self, value):
        """Validate sell quantity"""
        defect = self.context.get('defect')
        if not defect:
            raise serializers.ValidationError("Defect not found in context")
        
        if value > defect.non_repairable_qty:
            raise serializers.ValidationError(
                f'Нельзя продать {value} единиц. Доступно только {defect.non_repairable_qty}'
            )
        
        return value

