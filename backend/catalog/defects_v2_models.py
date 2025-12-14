"""
Defects Module V2 - Complete Rewrite
=====================================

This module implements a complete defect tracking system
following real warehouse workflows.

Key improvements:
- Normalized data structure (no JSON fields for core data)
- Proper stock transitions via service layer
- Complete audit trail
- Analytics-ready structure
"""

from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

# Import models from main models.py
from .models import Product, DefectType as BaseDefectType

# We'll use the existing DefectType from models.py
DefectType = BaseDefectType


class SparePartV2(models.Model):
    """
    Spare parts / materials used for repairs.

    Links to Product model (spare parts are products).
    Provides friendly naming and inventory tracking.
    """
    product = models.OneToOneField(
        'Product',
        on_delete=models.CASCADE,
        related_name='spare_part_info',
        verbose_name="Продукт",
        help_text="Ссылка на продукт в каталоге"
    )
    name = models.CharField(
        max_length=200,
        verbose_name="Название",
        help_text="Удобное название (например: 'yon stoyevoy')"
    )
    unit = models.CharField(
        max_length=20,
        default='dona',
        verbose_name="Единица измерения"
    )
    min_stock_level = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Минимальный остаток",
        help_text="Уровень для предупреждения о низком запасе"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активна"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'spare_parts'
        ordering = ['name']
        verbose_name = "Запасная часть"
        verbose_name_plural = "Запасные части"

    def __str__(self):
        return f"{self.name} ({self.product.sku})"

    def is_low_stock(self):
        """Check if stock is below minimum level"""
        return self.product.stock_ok < self.min_stock_level


class DefectBatchV2(models.Model):
    """
    Main defect tracking entity.
    One batch = one defect detection event for a product.

    Business rule:
    total_qty = repairable_qty + non_repairable_qty (always)

    Lifecycle:
    pending → inspected → processing → completed
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидание проверки'
        INSPECTED = 'inspected', 'Проверен'
        PROCESSING = 'processing', 'В обработке'
        COMPLETED = 'completed', 'Завершен'
        CANCELLED = 'cancelled', 'Отменен'

    # Core data
    product = models.ForeignKey(
        'Product',
        on_delete=models.PROTECT,
        related_name='defect_batches',
        verbose_name="Продукт"
    )
    total_qty = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Общее количество",
        help_text="Всего дефектных единиц"
    )
    repairable_qty = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Ремонтопригодных",
        help_text="Количество, которое можно отремонтировать"
    )
    non_repairable_qty = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Неремонтопригодных",
        help_text="Количество, которое нельзя отремонтировать"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Статус"
    )

    # Timestamps
    detected_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Дата обнаружения"
    )
    inspected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата проверки"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата завершения"
    )

    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_defect_batches',
        verbose_name="Создал"
    )
    warehouse_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Склад",
        help_text="Название склада где обнаружен дефект"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Примечания"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'defect_batches'
        ordering = ['-detected_at']
        verbose_name = "Партия брака"
        verbose_name_plural = "Партии брака"
        indexes = [
            models.Index(fields=['product', 'status']),
            models.Index(fields=['status', '-detected_at']),
            models.Index(fields=['-detected_at']),
        ]

    def __str__(self):
        return f"Batch #{self.id}: {self.product.name} ({self.total_qty} шт)"

    def clean(self):
        """Validate business rules"""
        # Check that total = repairable + non_repairable
        total = self.repairable_qty + self.non_repairable_qty
        if abs(total - self.total_qty) > Decimal('0.01'):
            raise ValidationError({
                'total_qty': f'Сумма ремонтопригодных ({self.repairable_qty}) и '
                            f'неремонтопригодных ({self.non_repairable_qty}) '
                            f'должна равняться общему количеству ({self.total_qty})'
            })

        # Check quantities are non-negative
        if self.total_qty < 0:
            raise ValidationError({'total_qty': 'Не может быть отрицательным'})
        if self.repairable_qty < 0:
            raise ValidationError({'repairable_qty': 'Не может быть отрицательным'})
        if self.non_repairable_qty < 0:
            raise ValidationError({'non_repairable_qty': 'Не может быть отрицательным'})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def is_fully_processed(self):
        """Check if all items have been processed"""
        return self.total_qty == 0

    @property
    def remaining_qty(self):
        """Remaining unprocessed quantity"""
        return self.total_qty


class DefectDetailV2(models.Model):
    """
    Links defect batch to specific defect types.
    One batch can have multiple defect types.

    Note: qty sum can exceed batch.non_repairable_qty
    because one item can have multiple defects (statistical tracking).
    """
    batch = models.ForeignKey(
        DefectBatchV2,
        on_delete=models.CASCADE,
        related_name='defect_details',
        verbose_name="Партия брака"
    )
    defect_type = models.ForeignKey(
        DefectType,
        on_delete=models.PROTECT,
        related_name='defect_occurrences',
        verbose_name="Тип дефекта"
    )
    qty = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Количество",
        help_text="Количество единиц с этим дефектом"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Примечания"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'defect_details'
        unique_together = [['batch', 'defect_type']]
        ordering = ['-qty']
        verbose_name = "Детализация дефекта"
        verbose_name_plural = "Детализация дефектов"

    def __str__(self):
        return f"{self.batch} - {self.defect_type.name}: {self.qty}"


class DefectRepairV2(models.Model):
    """
    Repair transaction - moves items from defect stock to healthy stock.

    Process:
    1. Consume spare parts from warehouse
    2. Reduce batch.repairable_qty
    3. Increase product.stock_ok
    4. Reduce product.stock_defect
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидание'
        IN_PROGRESS = 'in_progress', 'В процессе'
        COMPLETED = 'completed', 'Завершен'
        FAILED = 'failed', 'Не удался'

    batch = models.ForeignKey(
        DefectBatchV2,
        on_delete=models.PROTECT,
        related_name='repairs',
        verbose_name="Партия брака"
    )
    qty_repaired = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Количество отремонтированных"
    )

    # Lifecycle
    started_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Начало ремонта"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Завершение ремонта"
    )
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='performed_repairs',
        verbose_name="Выполнил"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Статус"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Примечания"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'defect_repairs'
        ordering = ['-started_at']
        verbose_name = "Ремонт брака"
        verbose_name_plural = "Ремонты брака"
        indexes = [
            models.Index(fields=['batch', 'status']),
            models.Index(fields=['-started_at']),
        ]

    def __str__(self):
        return f"Repair #{self.id}: {self.batch.product.name} ({self.qty_repaired} шт)"

    @property
    def total_cost_usd(self):
        """Calculate total cost of materials used"""
        return self.materials.aggregate(
            total=models.Sum('total_cost_usd')
        )['total'] or Decimal('0.00')


class RepairMaterialV2(models.Model):
    """
    Materials/spare parts consumed during repair.
    Normalized relationship (not JSON).

    Enables:
    - Proper stock tracking
    - Cost analytics
    - Material consumption reports
    """
    repair = models.ForeignKey(
        DefectRepairV2,
        on_delete=models.CASCADE,
        related_name='materials',
        verbose_name="Ремонт"
    )
    spare_part = models.ForeignKey(
        SparePartV2,
        on_delete=models.PROTECT,
        related_name='usage_history',
        verbose_name="Запасная часть"
    )
    qty_used = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Использовано"
    )

    # Cost tracking (for analytics)
    unit_cost_usd = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Цена за единицу (USD)",
        help_text="Захватывается на момент использования"
    )
    total_cost_usd = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Общая стоимость (USD)"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'repair_materials'
        unique_together = [['repair', 'spare_part']]
        ordering = ['-qty_used']
        verbose_name = "Материал ремонта"
        verbose_name_plural = "Материалы ремонта"

    def __str__(self):
        return f"{self.spare_part.name}: {self.qty_used} {self.spare_part.unit}"

    def save(self, *args, **kwargs):
        # Auto-calculate total cost
        if self.unit_cost_usd and self.qty_used:
            self.total_cost_usd = self.unit_cost_usd * self.qty_used
        super().save(*args, **kwargs)


class DefectWriteOffV2(models.Model):
    """
    Write-off transaction - removes items from inventory.

    Reasons:
    - Disposal (утилизация)
    - Scrap (списание)
    - Outlet sale (future: sold at discount)

    Process:
    1. Reduce batch.non_repairable_qty
    2. Reduce product.stock_defect
    """

    class Reason(models.TextChoices):
        DISPOSAL = 'disposal', 'Утилизация'
        SCRAP = 'scrap', 'Списание'
        OUTLET_SALE = 'outlet_sale', 'Продажа через outlet'
        OTHER = 'other', 'Прочее'

    batch = models.ForeignKey(
        DefectBatchV2,
        on_delete=models.PROTECT,
        related_name='write_offs',
        verbose_name="Партия брака"
    )
    qty_written_off = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Количество списанных"
    )

    reason = models.CharField(
        max_length=20,
        choices=Reason.choices,
        default=Reason.DISPOSAL,
        verbose_name="Причина"
    )

    performed_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Дата списания"
    )
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='performed_write_offs',
        verbose_name="Выполнил"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Примечания"
    )

    # For outlet sales (future enhancement)
    sale_price_usd = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Цена продажи (USD)"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'defect_write_offs'
        ordering = ['-performed_at']
        verbose_name = "Списание брака"
        verbose_name_plural = "Списания брака"
        indexes = [
            models.Index(fields=['batch', 'reason']),
            models.Index(fields=['-performed_at']),
        ]

    def __str__(self):
        return f"Write-off #{self.id}: {self.batch.product.name} ({self.qty_written_off} шт)"

    @property
    def total_revenue_usd(self):
        """Calculate revenue for outlet sales"""
        if self.reason == self.Reason.OUTLET_SALE and self.sale_price_usd:
            return self.qty_written_off * self.sale_price_usd
        return Decimal('0.00')


class DefectAuditLogV2(models.Model):
    """
    Complete audit trail for all defect operations.
    Tracks every change for compliance and debugging.
    """

    class Action(models.TextChoices):
        CREATED = 'created', 'Создан'
        INSPECTED = 'inspected', 'Проверен'
        REPAIR_STARTED = 'repair_started', 'Ремонт начат'
        REPAIR_COMPLETED = 'repair_completed', 'Ремонт завершен'
        WRITTEN_OFF = 'written_off', 'Списан'
        STATUS_CHANGED = 'status_changed', 'Статус изменен'
        QUANTITY_ADJUSTED = 'quantity_adjusted', 'Количество скорректировано'

    batch = models.ForeignKey(
        DefectBatchV2,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        verbose_name="Партия брака"
    )
    action = models.CharField(
        max_length=30,
        choices=Action.choices,
        verbose_name="Действие"
    )

    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='defect_audit_actions',
        verbose_name="Выполнил"
    )
    performed_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата действия"
    )

    # Snapshot
    old_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Старые данные"
    )
    new_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Новые данные"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание"
    )

    class Meta:
        db_table = 'defect_audit_logs'
        ordering = ['-performed_at']
        verbose_name = "Лог аудита брака"
        verbose_name_plural = "Логи аудита брака"
        indexes = [
            models.Index(fields=['batch', '-performed_at']),
            models.Index(fields=['performed_by', '-performed_at']),
        ]

    def __str__(self):
        return f"{self.get_action_display()} - {self.batch} - {self.performed_at:%Y-%m-%d %H:%M}"
