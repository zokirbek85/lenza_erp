# Defects Module - Complete Architecture Design

## 🎯 Business Requirements

### Core Logic
1. **Product-level tracking** - Defects are tracked per product, not per individual item
2. **Stock separation** - `Product.stock_defect` holds defective items, `Product.stock_ok` holds healthy items
3. **Warehouse workflow** - Warehouse staff processes existing defect stock only
4. **Validation** - `repairable_qty + non_repairable_qty = total_defect_qty` (strict)

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEFECT WORKFLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. DETECTION
   └─> Product has stock_defect > 0
   └─> Warehouse creates DefectBatch

2. INSPECTION
   ├─> Warehouse splits: repairable vs non-repairable
   ├─> For repairable: specify spare parts needed
   └─> For non-repairable: specify defect types

3. REPAIR (Repairable items)
   ├─> Consume spare parts from warehouse
   ├─> Move qty from stock_defect → stock_ok
   └─> Create audit trail

4. WRITE-OFF (Non-repairable items)
   ├─> Record defect types for analytics
   ├─> Remove from stock_defect (scrap/util)
   └─> Create audit trail
```

---

## 🗄️ Database Schema

### Core Models

#### 1. **DefectBatch**
```python
class DefectBatch(models.Model):
    """
    Main defect tracking entity - one batch per product per detection event.

    Business rule:
    - total_qty = repairable_qty + non_repairable_qty (always)
    - total_qty must equal Product.stock_defect at creation
    """
    product = ForeignKey(Product)  # Which product
    total_qty = DecimalField()     # Total defective items
    repairable_qty = DecimalField()
    non_repairable_qty = DecimalField()

    # Lifecycle
    status = CharField(choices=[
        'pending',      # Created, awaiting inspection
        'inspected',    # Inspection complete
        'processing',   # Repair/disposal in progress
        'completed',    # Fully processed
    ])

    # Timestamps
    detected_at = DateTimeField()
    inspected_at = DateTimeField(null=True)
    completed_at = DateTimeField(null=True)

    # Audit
    created_by = ForeignKey(User)
    warehouse = ForeignKey(Warehouse, null=True)
    notes = TextField()
```

#### 2. **DefectType** (Reference table)
```python
class DefectType(models.Model):
    """
    Справочник типов дефектов.
    Examples: "замок joyi ochilgan", "suv o'tib shishgan", "qoplama ko'chgan"
    """
    name = CharField(unique=True)
    description = TextField()
    is_active = BooleanField(default=True)
    category = CharField(choices=[
        'mechanical',   # Механические повреждения
        'material',     # Дефекты материала
        'manufacturing',# Брак производства
        'other',
    ])
```

#### 3. **DefectDetail**
```python
class DefectDetail(models.Model):
    """
    Links non-repairable items to defect types.
    One batch can have multiple defect types.

    Note: qty sum can exceed batch.non_repairable_qty
    (statistical tracking, one item can have multiple defects)
    """
    batch = ForeignKey(DefectBatch)
    defect_type = ForeignKey(DefectType)
    qty = DecimalField()
    notes = TextField(blank=True)

    class Meta:
        unique_together = [['batch', 'defect_type']]
```

#### 4. **SparePart** (New entity)
```python
class SparePart(models.Model):
    """
    Spare parts / materials used for repairs.
    Links to Product (spare parts are products too).
    """
    product = OneToOneField(Product)  # Link to product catalog
    name = CharField()  # Friendly name (e.g. "yon stoyevoy")
    unit = CharField(default='dona')
    min_stock_level = DecimalField(default=0)
    is_active = BooleanField(default=True)
```

#### 5. **DefectRepair**
```python
class DefectRepair(models.Model):
    """
    Repair transaction - moves items from defect to healthy stock.
    """
    batch = ForeignKey(DefectBatch)
    qty_repaired = DecimalField()

    # Lifecycle
    started_at = DateTimeField()
    completed_at = DateTimeField()
    performed_by = ForeignKey(User)

    # Result
    status = CharField(choices=[
        'pending',
        'in_progress',
        'completed',
        'failed',
    ])
    notes = TextField()
```

#### 6. **RepairMaterial**
```python
class RepairMaterial(models.Model):
    """
    Materials consumed during repair.
    Normalized relationship (not JSON).
    """
    repair = ForeignKey(DefectRepair)
    spare_part = ForeignKey(SparePart)
    qty_used = DecimalField()

    # Cost tracking (for future analytics)
    unit_cost_usd = DecimalField(null=True)
    total_cost_usd = DecimalField(null=True)
```

#### 7. **DefectWriteOff**
```python
class DefectWriteOff(models.Model):
    """
    Write-off transaction - removes items from inventory.
    """
    batch = ForeignKey(DefectBatch)
    qty_written_off = DecimalField()

    reason = CharField(choices=[
        'disposal',     # Утилизация
        'scrap',        # Списание
        'outlet_sale',  # Продажа через outlet (future)
    ])

    performed_at = DateTimeField()
    performed_by = ForeignKey(User)
    notes = TextField()

    # For outlet sales (future)
    sale_price_usd = DecimalField(null=True)
```

#### 8. **DefectAuditLog**
```python
class DefectAuditLog(models.Model):
    """
    Complete audit trail for all defect operations.
    """
    batch = ForeignKey(DefectBatch)
    action = CharField(choices=[
        'created',
        'inspected',
        'repair_started',
        'repair_completed',
        'written_off',
        'status_changed',
    ])

    performed_by = ForeignKey(User)
    performed_at = DateTimeField(auto_now_add=True)

    # Snapshot
    old_data = JSONField(null=True)
    new_data = JSONField(null=True)
    description = TextField()
```

---

## 🔄 Service Layer

### StockService
```python
class StockService:
    """
    Handles all stock transitions atomically.
    Single source of truth for stock movements.
    """

    @staticmethod
    @transaction.atomic
    def move_to_defect(product_id, qty, reason, user):
        """
        Move items from stock_ok → stock_defect
        Used when defects are discovered.
        """
        product = Product.objects.select_for_update().get(id=product_id)

        # Validation
        if product.stock_ok < qty:
            raise ValidationError("Insufficient healthy stock")

        # Atomic update
        product.stock_ok -= qty
        product.stock_defect += qty
        product.save()

        # Create batch
        batch = DefectBatch.objects.create(
            product=product,
            total_qty=qty,
            repairable_qty=0,
            non_repairable_qty=0,
            status='pending',
            created_by=user,
            notes=reason
        )

        return batch

    @staticmethod
    @transaction.atomic
    def repair_defect(batch_id, qty, spare_parts, user):
        """
        Move items from stock_defect → stock_ok
        Consume spare parts.
        """
        batch = DefectBatch.objects.select_for_update().get(id=batch_id)
        product = batch.product

        # Validation
        if batch.repairable_qty < qty:
            raise ValidationError("Insufficient repairable quantity")

        # Consume spare parts
        for sp in spare_parts:
            spare_product = Product.objects.select_for_update().get(
                id=sp['spare_part_id']
            )
            if spare_product.stock_ok < sp['qty']:
                raise ValidationError(f"Insufficient spare part: {spare_product.name}")
            spare_product.stock_ok -= sp['qty']
            spare_product.save()

        # Update batch
        batch.repairable_qty -= qty
        batch.total_qty -= qty
        batch.save()

        # Update product stock
        product = Product.objects.select_for_update().get(id=product.id)
        product.stock_defect -= qty
        product.stock_ok += qty
        product.save()

        # Create repair record
        repair = DefectRepair.objects.create(
            batch=batch,
            qty_repaired=qty,
            status='completed',
            completed_at=timezone.now(),
            performed_by=user
        )

        # Record materials
        for sp in spare_parts:
            RepairMaterial.objects.create(
                repair=repair,
                spare_part_id=sp['spare_part_id'],
                qty_used=sp['qty']
            )

        return repair

    @staticmethod
    @transaction.atomic
    def write_off_defect(batch_id, qty, reason, user):
        """
        Remove items from stock_defect (scrap/disposal).
        """
        batch = DefectBatch.objects.select_for_update().get(id=batch_id)
        product = batch.product

        # Validation
        if batch.non_repairable_qty < qty:
            raise ValidationError("Insufficient non-repairable quantity")

        # Update batch
        batch.non_repairable_qty -= qty
        batch.total_qty -= qty
        batch.save()

        # Update product stock
        product = Product.objects.select_for_update().get(id=product.id)
        product.stock_defect -= qty
        product.save()

        # Create write-off record
        write_off = DefectWriteOff.objects.create(
            batch=batch,
            qty_written_off=qty,
            reason=reason,
            performed_at=timezone.now(),
            performed_by=user
        )

        return write_off
```

---

## 📊 Analytics Queries

### Defect Statistics
```python
class DefectAnalyticsService:

    @staticmethod
    def get_statistics(start_date=None, end_date=None, product_id=None):
        """
        Comprehensive defect analytics.
        """
        batches = DefectBatch.objects.all()

        if start_date:
            batches = batches.filter(detected_at__gte=start_date)
        if end_date:
            batches = batches.filter(detected_at__lte=end_date)
        if product_id:
            batches = batches.filter(product_id=product_id)

        return {
            # Totals
            'total_batches': batches.count(),
            'total_qty': batches.aggregate(Sum('total_qty'))['total_qty__sum'] or 0,
            'total_repairable': batches.aggregate(Sum('repairable_qty'))...
            'total_non_repairable': batches.aggregate(Sum('non_repairable_qty'))...

            # Top products
            'top_defective_products': batches.values('product__name')
                .annotate(total=Sum('total_qty'))
                .order_by('-total')[:10],

            # Top defect types
            'top_defect_types': DefectDetail.objects.filter(batch__in=batches)
                .values('defect_type__name')
                .annotate(total=Sum('qty'))
                .order_by('-total'),

            # Spare parts consumption
            'spare_parts_used': RepairMaterial.objects.filter(
                repair__batch__in=batches
            ).values('spare_part__name')
             .annotate(total=Sum('qty_used'))
             .order_by('-total'),
        }
```

---

## 🎨 Frontend Workflow

### Warehouse Interface

#### 1. Create Defect Batch
```
Select Product → Enter Total Qty → Split Repairable/Non-repairable
```

#### 2. Inspect & Detail
```
For Repairable:
  └─> Select Spare Parts Needed
      ├─ yon stoyevoy: 10
      ├─ tepa stoyevoy: 7
      └─ oyna: 4

For Non-repairable:
  └─> Select Defect Types
      ├─ zamok joyi ochilgan: 3
      ├─ suv o'tib shishgan: 7
      └─ qoplama ko'chgan: 5
```

#### 3. Process
```
Repair Button → Confirms spare parts → Executes repair
Write-off Button → Confirms → Removes from inventory
```

---

## 📈 Export Formats

### PDF Export
```
- Company header
- Filter criteria
- Summary statistics
- Detailed table
- Grouped by product/defect type
```

### XLSX Export
```
Sheets:
1. Summary
2. By Product
3. By Defect Type
4. Spare Parts Consumption
5. Audit Trail
```

---

## 🚀 Migration Strategy

1. **Keep old data** - Don't delete existing `ProductDefect` records
2. **Create new tables** - All new models
3. **Gradual transition** - Support both systems temporarily
4. **Data migration script** - Convert old records to new schema
5. **Deprecate old endpoints** - After migration complete

---

## ✅ Implementation Checklist

- [ ] Create new models
- [ ] Write migrations
- [ ] Implement StockService
- [ ] Build API endpoints
- [ ] Create serializers with validation
- [ ] Refactor frontend components
- [ ] Build analytics queries
- [ ] Add PDF export
- [ ] Add XLSX export
- [ ] Write comprehensive tests
- [ ] Update API documentation
- [ ] Deploy migration plan

---

**Status**: Ready for implementation
**Estimated effort**: 3-4 days full development
**Priority**: High - Core business logic
