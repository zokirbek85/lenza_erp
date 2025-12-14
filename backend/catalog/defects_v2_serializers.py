"""
Defects V2 Serializers
======================

DRF serializers for the new defects module.
Includes proper validation and business logic enforcement.
"""

from decimal import Decimal
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Product
from .defects_v2_models import (
    DefectType,
    SparePartV2,
    DefectBatchV2,
    DefectDetailV2,
    DefectRepairV2,
    RepairMaterialV2,
    DefectWriteOffV2,
    DefectAuditLogV2,
)


# ============================================================================
# Reference Data Serializers
# ============================================================================

class DefectTypeSerializer(serializers.ModelSerializer):
    """Serializer for defect types reference table"""

    class Meta:
        model = DefectType
        fields = [
            'id', 'name', 'name_uz', 'name_en', 'description',
            'category', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SparePartSerializer(serializers.ModelSerializer):
    """Serializer for spare parts"""

    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    current_stock = serializers.DecimalField(
        source='product.stock_ok',
        max_digits=14,
        decimal_places=2,
        read_only=True
    )
    is_low_stock_alert = serializers.SerializerMethodField()

    class Meta:
        model = SparePartV2
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'name', 'unit', 'min_stock_level', 'current_stock',
            'is_low_stock_alert', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_is_low_stock_alert(self, obj):
        """Check if stock is below minimum level"""
        return obj.is_low_stock()


# ============================================================================
# Defect Batch Serializers
# ============================================================================

class DefectDetailSerializer(serializers.ModelSerializer):
    """Serializer for defect details (types)"""

    defect_type_name = serializers.CharField(source='defect_type.name', read_only=True)
    defect_type_category = serializers.CharField(source='defect_type.category', read_only=True)

    class Meta:
        model = DefectDetailV2
        fields = [
            'id', 'defect_type', 'defect_type_name', 'defect_type_category',
            'qty', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']


class DefectBatchListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for batch list view"""

    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_image = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    # warehouse_name is already a field on the model, no need to serialize from relation

    class Meta:
        model = DefectBatchV2
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'product_image',
            'total_qty', 'repairable_qty', 'non_repairable_qty',
            'status', 'status_display',
            'detected_at', 'inspected_at', 'completed_at',
            'created_by_name', 'warehouse_name',
            'created_at'
        ]

    def get_product_image(self, obj):
        """Get product image URL"""
        if obj.product.image:
            return obj.product.image.url
        return None


class DefectBatchDetailSerializer(serializers.ModelSerializer):
    """Full serializer for batch detail view"""

    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_image = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    # warehouse_name is already a field on the model, no need to serialize from relation

    defect_details = DefectDetailSerializer(many=True, read_only=True)
    is_fully_processed = serializers.BooleanField(read_only=True)
    remaining_qty = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = DefectBatchV2
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'product_image',
            'total_qty', 'repairable_qty', 'non_repairable_qty',
            'status', 'status_display',
            'detected_at', 'inspected_at', 'completed_at',
            'created_by', 'created_by_name',
            'warehouse_name',
            'notes', 'defect_details',
            'is_fully_processed', 'remaining_qty',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_product_image(self, obj):
        if obj.product.image:
            return obj.product.image.url
        return None


class CreateDefectBatchSerializer(serializers.Serializer):
    """Serializer for creating a new defect batch"""

    product_id = serializers.IntegerField()
    total_qty = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    repairable_qty = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.00'))
    non_repairable_qty = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.00'))
    defect_details = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    warehouse_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validate batch creation data"""
        # Check total = repairable + non_repairable
        total = data['total_qty']
        repairable = data['repairable_qty']
        non_repairable = data['non_repairable_qty']

        if abs(total - (repairable + non_repairable)) > Decimal('0.01'):
            raise serializers.ValidationError(
                f"Total quantity ({total}) must equal sum of repairable ({repairable}) "
                f"and non-repairable ({non_repairable})"
            )

        # Check product exists
        try:
            product = Product.objects.get(id=data['product_id'])
            if product.stock_ok < total:
                raise serializers.ValidationError(
                    f"Insufficient healthy stock. Available: {product.stock_ok}, Required: {total}"
                )
        except Product.DoesNotExist:
            raise serializers.ValidationError(f"Product with ID {data['product_id']} not found")

        # Validate defect details
        if 'defect_details' in data:
            for detail in data['defect_details']:
                if 'defect_type_id' not in detail or 'qty' not in detail:
                    raise serializers.ValidationError(
                        "Each defect detail must have 'defect_type_id' and 'qty'"
                    )

                # Check defect type exists
                if not DefectType.objects.filter(id=detail['defect_type_id']).exists():
                    raise serializers.ValidationError(
                        f"Defect type with ID {detail['defect_type_id']} not found"
                    )

        return data


class InspectBatchSerializer(serializers.Serializer):
    """Serializer for inspecting a batch"""

    repairable_qty = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.00'))
    non_repairable_qty = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.00'))
    defect_details = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )

    def validate(self, data):
        """Validate inspection data"""
        batch = self.context.get('batch')
        if not batch:
            raise serializers.ValidationError("Batch not found in context")

        # Check total matches
        total = data['repairable_qty'] + data['non_repairable_qty']
        if abs(total - batch.total_qty) > Decimal('0.01'):
            raise serializers.ValidationError(
                f"Sum of repairable ({data['repairable_qty']}) and non-repairable ({data['non_repairable_qty']}) "
                f"must equal total quantity ({batch.total_qty})"
            )

        # Validate defect details
        for detail in data['defect_details']:
            if 'defect_type_id' not in detail or 'qty' not in detail:
                raise serializers.ValidationError(
                    "Each defect detail must have 'defect_type_id' and 'qty'"
                )

        return data


# ============================================================================
# Repair Serializers
# ============================================================================

class RepairMaterialSerializer(serializers.ModelSerializer):
    """Serializer for repair materials"""

    spare_part_name = serializers.CharField(source='spare_part.name', read_only=True)
    spare_part_unit = serializers.CharField(source='spare_part.unit', read_only=True)

    class Meta:
        model = RepairMaterialV2
        fields = [
            'id', 'spare_part', 'spare_part_name', 'spare_part_unit',
            'qty_used', 'unit_cost_usd', 'total_cost_usd',
            'created_at'
        ]
        read_only_fields = ['created_at', 'total_cost_usd']


class DefectRepairSerializer(serializers.ModelSerializer):
    """Serializer for defect repairs"""

    batch_product_name = serializers.CharField(source='batch.product.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    materials = RepairMaterialSerializer(many=True, read_only=True)
    total_cost = serializers.DecimalField(source='total_cost_usd', max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = DefectRepairV2
        fields = [
            'id', 'batch', 'batch_product_name',
            'qty_repaired', 'started_at', 'completed_at',
            'performed_by', 'performed_by_name',
            'status', 'status_display', 'notes',
            'materials', 'total_cost',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class RepairDefectSerializer(serializers.Serializer):
    """Serializer for repairing defects"""

    qty = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    spare_parts = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validate repair data"""
        batch = self.context.get('batch')
        if not batch:
            raise serializers.ValidationError("Batch not found in context")

        # Check quantity
        if data['qty'] > batch.repairable_qty:
            raise serializers.ValidationError(
                f"Cannot repair {data['qty']} units. Only {batch.repairable_qty} units are repairable."
            )

        # Validate spare parts
        if 'spare_parts' in data:
            for sp in data['spare_parts']:
                if 'spare_part_id' not in sp or 'qty' not in sp:
                    raise serializers.ValidationError(
                        "Each spare part must have 'spare_part_id' and 'qty'"
                    )

                # Check spare part exists
                try:
                    spare_part = SparePartV2.objects.select_related('product').get(id=sp['spare_part_id'])
                    if spare_part.product.stock_ok < Decimal(str(sp['qty'])):
                        raise serializers.ValidationError(
                            f"Insufficient spare part: {spare_part.name}. "
                            f"Available: {spare_part.product.stock_ok}, Required: {sp['qty']}"
                        )
                except SparePartV2.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Spare part with ID {sp['spare_part_id']} not found"
                    )

        return data


# ============================================================================
# Write-Off Serializers
# ============================================================================

class DefectWriteOffSerializer(serializers.ModelSerializer):
    """Serializer for defect write-offs"""

    batch_product_name = serializers.CharField(source='batch.product.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    total_revenue = serializers.DecimalField(source='total_revenue_usd', max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = DefectWriteOffV2
        fields = [
            'id', 'batch', 'batch_product_name',
            'qty_written_off', 'reason', 'reason_display',
            'performed_at', 'performed_by', 'performed_by_name',
            'notes', 'sale_price_usd', 'total_revenue',
            'created_at'
        ]
        read_only_fields = ['created_at']


class WriteOffDefectSerializer(serializers.Serializer):
    """Serializer for writing off defects"""

    qty = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    reason = serializers.ChoiceField(choices=DefectWriteOffV2.Reason.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    sale_price_usd = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=False,
        allow_null=True
    )

    def validate(self, data):
        """Validate write-off data"""
        batch = self.context.get('batch')
        if not batch:
            raise serializers.ValidationError("Batch not found in context")

        # Check quantity
        if data['qty'] > batch.non_repairable_qty:
            raise serializers.ValidationError(
                f"Cannot write off {data['qty']} units. Only {batch.non_repairable_qty} units are non-repairable."
            )

        # Check sale price for outlet sales
        if data['reason'] == DefectWriteOffV2.Reason.OUTLET_SALE and not data.get('sale_price_usd'):
            raise serializers.ValidationError(
                "Sale price is required for outlet sales"
            )

        return data


# ============================================================================
# Audit Log Serializer
# ============================================================================

class DefectAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs"""

    batch_info = serializers.SerializerMethodField()
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = DefectAuditLogV2
        fields = [
            'id', 'batch', 'batch_info', 'action', 'action_display',
            'performed_by', 'performed_by_name', 'performed_at',
            'old_data', 'new_data', 'description'
        ]

    def get_batch_info(self, obj):
        """Get batch basic info"""
        return {
            'id': obj.batch.id,
            'product_name': obj.batch.product.name,
            'total_qty': str(obj.batch.total_qty),
        }


# ============================================================================
# Statistics Serializer
# ============================================================================

class DefectStatisticsSerializer(serializers.Serializer):
    """Serializer for defect statistics response"""

    totals = serializers.DictField()
    by_product = serializers.ListField()
    by_defect_type = serializers.ListField()
    by_status = serializers.ListField()
    spare_parts_consumption = serializers.ListField()
