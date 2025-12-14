"""
Defects Service Layer
====================

This module handles ALL stock transitions for defects.
All operations are atomic and include proper validation.

Rules:
1. NEVER modify Product.stock_* directly outside this service
2. ALL stock movements must go through atomic transactions
3. Create audit trail for every operation
4. Validate business rules before executing
"""

from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from typing import List, Dict, Any

from .models import Product
from .defects_v2_models import (
    DefectBatchV2,
    DefectDetailV2,
    DefectType,
    SparePartV2,
    DefectRepairV2,
    RepairMaterialV2,
    DefectWriteOffV2,
    DefectAuditLogV2,
)


class StockTransitionError(Exception):
    """Custom exception for stock transition failures"""
    pass


class DefectService:
    """
    Central service for defect management.
    Handles all defect-related operations with proper stock transitions.
    """

    @staticmethod
    @transaction.atomic
    def create_defect_batch(
        product_id: int,
        total_qty: Decimal,
        repairable_qty: Decimal,
        non_repairable_qty: Decimal,
        defect_details: List[Dict[str, Any]],
        user,
        warehouse_id: int = None,
        notes: str = ""
    ) -> DefectBatchV2:
        """
        Create a new defect batch and move items to defect stock.

        Process:
        1. Validate quantities
        2. Check product has enough healthy stock
        3. Create DefectBatch
        4. Move stock: stock_ok → stock_defect
        5. Record defect details (types)
        6. Create audit log

        Args:
            product_id: Product ID
            total_qty: Total defective items
            repairable_qty: Quantity that can be repaired
            non_repairable_qty: Quantity that cannot be repaired
            defect_details: List of {"defect_type_id": int, "qty": Decimal, "notes": str}
            user: User creating the batch
            warehouse_id: Optional warehouse ID
            notes: Optional notes

        Returns:
            DefectBatchV2 instance

        Raises:
            ValidationError: If validation fails
            StockTransitionError: If stock transition fails
        """
        # Get product with row lock
        try:
            product = Product.objects.select_for_update().get(id=product_id)
        except Product.DoesNotExist:
            raise ValidationError(f"Product with ID {product_id} not found")

        # Validate quantities
        if total_qty <= 0:
            raise ValidationError("Total quantity must be greater than 0")

        if abs(total_qty - (repairable_qty + non_repairable_qty)) > Decimal('0.01'):
            raise ValidationError(
                f"Total quantity ({total_qty}) must equal sum of repairable ({repairable_qty}) "
                f"and non-repairable ({non_repairable_qty})"
            )

        # Check if product has enough healthy stock
        if product.stock_ok < total_qty:
            raise StockTransitionError(
                f"Insufficient healthy stock. Available: {product.stock_ok}, Required: {total_qty}"
            )

        # Create defect batch
        batch = DefectBatchV2.objects.create(
            product=product,
            total_qty=total_qty,
            repairable_qty=repairable_qty,
            non_repairable_qty=non_repairable_qty,
            status=DefectBatchV2.Status.PENDING,
            detected_at=timezone.now(),
            created_by=user,
            warehouse_name=warehouse_id if warehouse_id else '',
            notes=notes
        )

        # Move stock: stock_ok → stock_defect
        product.stock_ok -= total_qty
        product.stock_defect += total_qty
        product.save(update_fields=['stock_ok', 'stock_defect'])

        # Record defect details
        for detail in defect_details:
            DefectDetailV2.objects.create(
                batch=batch,
                defect_type_id=detail['defect_type_id'],
                qty=Decimal(str(detail['qty'])),
                notes=detail.get('notes', '')
            )

        # Create audit log
        DefectAuditLogV2.objects.create(
            batch=batch,
            action=DefectAuditLogV2.Action.CREATED,
            performed_by=user,
            new_data={
                'product_id': product_id,
                'product_name': product.name,
                'total_qty': str(total_qty),
                'repairable_qty': str(repairable_qty),
                'non_repairable_qty': str(non_repairable_qty),
                'defect_details_count': len(defect_details),
            },
            description=f"Created defect batch for {product.name}: {total_qty} units"
        )

        return batch

    @staticmethod
    @transaction.atomic
    def inspect_batch(
        batch_id: int,
        repairable_qty: Decimal,
        non_repairable_qty: Decimal,
        defect_details: List[Dict[str, Any]],
        user
    ) -> DefectBatchV2:
        """
        Mark batch as inspected and update quantities.

        Process:
        1. Validate batch can be inspected
        2. Update repairable/non-repairable quantities
        3. Update/create defect details
        4. Change status to INSPECTED
        5. Create audit log

        Args:
            batch_id: Batch ID
            repairable_qty: Repairable quantity
            non_repairable_qty: Non-repairable quantity
            defect_details: List of defect types
            user: User performing inspection

        Returns:
            Updated DefectBatch

        Raises:
            ValidationError: If validation fails
        """
        batch = DefectBatchV2.objects.select_for_update().get(id=batch_id)

        # Validate batch status
        if batch.status not in [DefectBatchV2.Status.PENDING, DefectBatchV2.Status.INSPECTED]:
            raise ValidationError(f"Batch cannot be inspected in status: {batch.status}")

        # Validate quantities match total
        if abs(batch.total_qty - (repairable_qty + non_repairable_qty)) > Decimal('0.01'):
            raise ValidationError(
                f"Sum of repairable ({repairable_qty}) and non-repairable ({non_repairable_qty}) "
                f"must equal total quantity ({batch.total_qty})"
            )

        old_data = {
            'repairable_qty': str(batch.repairable_qty),
            'non_repairable_qty': str(batch.non_repairable_qty),
            'status': batch.status,
        }

        # Update batch
        batch.repairable_qty = repairable_qty
        batch.non_repairable_qty = non_repairable_qty
        batch.status = DefectBatchV2.Status.INSPECTED
        batch.inspected_at = timezone.now()
        batch.save()

        # Clear old defect details
        batch.defect_details.all().delete()

        # Create new defect details
        for detail in defect_details:
            DefectDetailV2.objects.create(
                batch=batch,
                defect_type_id=detail['defect_type_id'],
                qty=Decimal(str(detail['qty'])),
                notes=detail.get('notes', '')
            )

        # Audit log
        DefectAuditLogV2.objects.create(
            batch=batch,
            action=DefectAuditLogV2.Action.INSPECTED,
            performed_by=user,
            old_data=old_data,
            new_data={
                'repairable_qty': str(repairable_qty),
                'non_repairable_qty': str(non_repairable_qty),
                'status': batch.status,
                'defect_types_count': len(defect_details),
            },
            description=f"Inspected batch: {repairable_qty} repairable, {non_repairable_qty} non-repairable"
        )

        return batch

    @staticmethod
    @transaction.atomic
    def repair_defect(
        batch_id: int,
        qty: Decimal,
        spare_parts: List[Dict[str, Any]],
        user,
        notes: str = ""
    ) -> DefectRepairV2:
        """
        Repair defective items.

        Process:
        1. Validate batch has enough repairable qty
        2. Validate and consume spare parts
        3. Reduce batch.repairable_qty
        4. Reduce batch.total_qty
        5. Move stock: stock_defect → stock_ok
        6. Create DefectRepairV2 record
        7. Record materials used
        8. Create audit log

        Args:
            batch_id: Batch ID
            qty: Quantity to repair
            spare_parts: List of {"spare_part_id": int, "qty": Decimal}
            user: User performing repair
            notes: Optional notes

        Returns:
            DefectRepairV2 instance

        Raises:
            ValidationError: If validation fails
            StockTransitionError: If stock insufficient
        """
        batch = DefectBatchV2.objects.select_for_update().get(id=batch_id)
        product = Product.objects.select_for_update().get(id=batch.product_id)

        # Validate quantity
        if qty <= 0:
            raise ValidationError("Repair quantity must be greater than 0")

        if qty > batch.repairable_qty:
            raise ValidationError(
                f"Cannot repair {qty} units. Only {batch.repairable_qty} units are repairable."
            )

        # Validate and consume spare parts
        consumed_parts = []
        for sp_data in spare_parts:
            spare_part = SparePartV2.objects.select_related('product').select_for_update().get(
                id=sp_data['spare_part_id']
            )
            spare_product = spare_part.product

            qty_needed = Decimal(str(sp_data['qty']))

            if spare_product.stock_ok < qty_needed:
                raise StockTransitionError(
                    f"Insufficient spare part: {spare_part.name}. "
                    f"Available: {spare_product.stock_ok}, Required: {qty_needed}"
                )

            # Consume spare part
            spare_product.stock_ok -= qty_needed
            spare_product.save(update_fields=['stock_ok'])

            consumed_parts.append({
                'spare_part': spare_part,
                'qty': qty_needed,
                'unit_cost': spare_product.price_usd if hasattr(spare_product, 'price_usd') else None
            })

        # Update batch quantities
        old_repairable = batch.repairable_qty
        old_total = batch.total_qty

        batch.repairable_qty -= qty
        batch.total_qty -= qty

        if batch.repairable_qty == 0 and batch.non_repairable_qty == 0:
            batch.status = DefectBatchV2.Status.COMPLETED
            batch.completed_at = timezone.now()
        elif batch.status != DefectBatchV2.Status.COMPLETED:
            batch.status = DefectBatchV2.Status.PROCESSING

        batch.save()

        # Move stock: stock_defect → stock_ok
        product.stock_defect -= qty
        product.stock_ok += qty
        product.save(update_fields=['stock_defect', 'stock_ok'])

        # Create repair record
        repair = DefectRepairV2.objects.create(
            batch=batch,
            qty_repaired=qty,
            started_at=timezone.now(),
            completed_at=timezone.now(),
            performed_by=user,
            status=DefectRepairV2.Status.COMPLETED,
            notes=notes
        )

        # Record materials
        for part_data in consumed_parts:
            RepairMaterialV2.objects.create(
                repair=repair,
                spare_part=part_data['spare_part'],
                qty_used=part_data['qty'],
                unit_cost_usd=part_data['unit_cost']
            )

        # Audit log
        DefectAuditLogV2.objects.create(
            batch=batch,
            action=DefectAuditLogV2.Action.REPAIR_COMPLETED,
            performed_by=user,
            old_data={
                'repairable_qty': str(old_repairable),
                'total_qty': str(old_total),
                'stock_defect': str(product.stock_defect + qty),
                'stock_ok': str(product.stock_ok - qty),
            },
            new_data={
                'repairable_qty': str(batch.repairable_qty),
                'total_qty': str(batch.total_qty),
                'repaired_qty': str(qty),
                'spare_parts_used': len(consumed_parts),
                'stock_defect': str(product.stock_defect),
                'stock_ok': str(product.stock_ok),
            },
            description=f"Repaired {qty} units using {len(consumed_parts)} spare part types"
        )

        return repair

    @staticmethod
    @transaction.atomic
    def write_off_defect(
        batch_id: int,
        qty: Decimal,
        reason: str,
        user,
        notes: str = "",
        sale_price_usd: Decimal = None
    ) -> DefectWriteOffV2:
        """
        Write off (dispose/scrap) non-repairable items.

        Process:
        1. Validate batch has enough non-repairable qty
        2. Reduce batch.non_repairable_qty
        3. Reduce batch.total_qty
        4. Reduce product.stock_defect
        5. Create DefectWriteOffV2 record
        6. Create audit log

        Args:
            batch_id: Batch ID
            qty: Quantity to write off
            reason: Write-off reason (disposal/scrap/outlet_sale)
            user: User performing write-off
            notes: Optional notes
            sale_price_usd: For outlet sales only

        Returns:
            DefectWriteOffV2 instance

        Raises:
            ValidationError: If validation fails
        """
        batch = DefectBatchV2.objects.select_for_update().get(id=batch_id)
        product = Product.objects.select_for_update().get(id=batch.product_id)

        # Validate quantity
        if qty <= 0:
            raise ValidationError("Write-off quantity must be greater than 0")

        if qty > batch.non_repairable_qty:
            raise ValidationError(
                f"Cannot write off {qty} units. Only {batch.non_repairable_qty} units are non-repairable."
            )

        # Update batch quantities
        old_non_repairable = batch.non_repairable_qty
        old_total = batch.total_qty

        batch.non_repairable_qty -= qty
        batch.total_qty -= qty

        if batch.repairable_qty == 0 and batch.non_repairable_qty == 0:
            batch.status = DefectBatchV2.Status.COMPLETED
            batch.completed_at = timezone.now()
        elif batch.status != DefectBatchV2.Status.COMPLETED:
            batch.status = DefectBatchV2.Status.PROCESSING

        batch.save()

        # Reduce product.stock_defect
        product.stock_defect -= qty
        product.save(update_fields=['stock_defect'])

        # Create write-off record
        write_off = DefectWriteOffV2.objects.create(
            batch=batch,
            qty_written_off=qty,
            reason=reason,
            performed_at=timezone.now(),
            performed_by=user,
            notes=notes,
            sale_price_usd=sale_price_usd
        )

        # Audit log
        DefectAuditLogV2.objects.create(
            batch=batch,
            action=DefectAuditLogV2.Action.WRITTEN_OFF,
            performed_by=user,
            old_data={
                'non_repairable_qty': str(old_non_repairable),
                'total_qty': str(old_total),
                'stock_defect': str(product.stock_defect + qty),
            },
            new_data={
                'non_repairable_qty': str(batch.non_repairable_qty),
                'total_qty': str(batch.total_qty),
                'written_off_qty': str(qty),
                'reason': reason,
                'stock_defect': str(product.stock_defect),
                'sale_price_usd': str(sale_price_usd) if sale_price_usd else None,
            },
            description=f"Written off {qty} units. Reason: {reason}"
        )

        return write_off

    @staticmethod
    def get_batch_with_details(batch_id: int) -> Dict[str, Any]:
        """
        Get complete batch information including all details.

        Returns dict with:
        - batch: DefectBatchV2 instance
        - defect_details: List of DefectDetail
        - repairs: List of DefectRepair
        - write_offs: List of DefectWriteOff
        - audit_logs: List of DefectAuditLog
        """
        batch = DefectBatchV2.objects.select_related('product', 'created_by', 'warehouse').get(
            id=batch_id
        )

        return {
            'batch': batch,
            'defect_details': list(batch.defect_details.select_related('defect_type').all()),
            'repairs': list(batch.repairs.select_related('performed_by').prefetch_related('materials__spare_part').all()),
            'write_offs': list(batch.write_offs.select_related('performed_by').all()),
            'audit_logs': list(batch.audit_logs.select_related('performed_by').all()[:20]),  # Last 20 logs
        }


class DefectAnalyticsService:
    """
    Analytics and reporting for defects.
    Provides aggregated statistics and insights.
    """

    @staticmethod
    def get_statistics(start_date=None, end_date=None, product_id=None, warehouse_id=None):
        """
        Get comprehensive defect statistics.

        Returns:
        - totals: Overall statistics
        - by_product: Top defective products
        - by_defect_type: Most common defect types
        - by_status: Breakdown by batch status
        - spare_parts_consumption: Most used spare parts
        - cost_analysis: Repair costs (future)
        """
        from django.db.models import Sum, Count, Q, Avg

        # Base queryset
        batches = DefectBatchV2.objects.all()

        if start_date:
            batches = batches.filter(detected_at__date__gte=start_date)
        if end_date:
            batches = batches.filter(detected_at__date__lte=end_date)
        if product_id:
            batches = batches.filter(product_id=product_id)
        if warehouse_id:
            batches = batches.filter(warehouse_name__icontains=warehouse_id)

        # Overall totals
        totals = batches.aggregate(
            total_batches=Count('id'),
            total_qty=Sum('total_qty'),
            total_repairable=Sum('repairable_qty'),
            total_non_repairable=Sum('non_repairable_qty'),
        )

        # By product (top 20)
        by_product = list(
            batches.values('product__id', 'product__name', 'product__sku')
            .annotate(
                batch_count=Count('id'),
                total_defect_qty=Sum('total_qty'),
                repairable_qty=Sum('repairable_qty'),
                non_repairable_qty=Sum('non_repairable_qty'),
            )
            .order_by('-total_defect_qty')[:20]
        )

        # By defect type
        defect_details = DefectDetailV2.objects.filter(batch__in=batches)
        by_defect_type = list(
            defect_details.values('defect_type__id', 'defect_type__name', 'defect_type__category')
            .annotate(
                occurrence_count=Count('id'),
                total_qty=Sum('qty'),
            )
            .order_by('-total_qty')
        )

        # By status
        by_status = list(
            batches.values('status')
            .annotate(
                count=Count('id'),
                qty_sum=Sum('total_qty'),
            )
            .order_by('-qty_sum')
        )

        # Spare parts consumption
        repairs = DefectRepairV2.objects.filter(batch__in=batches, status=DefectRepairV2.Status.COMPLETED)
        spare_parts_used = list(
            RepairMaterialV2.objects.filter(repair__in=repairs)
            .values('spare_part__id', 'spare_part__name', 'spare_part__unit')
            .annotate(
                usage_count=Count('id'),
                total_qty_used=Sum('qty_used'),
                total_cost_usd=Sum('total_cost_usd'),
            )
            .order_by('-total_qty_used')
        )

        return {
            'totals': {
                'total_batches': totals['total_batches'] or 0,
                'total_qty': float(totals['total_qty'] or 0),
                'total_repairable': float(totals['total_repairable'] or 0),
                'total_non_repairable': float(totals['total_non_repairable'] or 0),
            },
            'by_product': by_product,
            'by_defect_type': by_defect_type,
            'by_status': by_status,
            'spare_parts_consumption': spare_parts_used,
        }
