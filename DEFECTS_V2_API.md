# Defects V2 API Documentation

Complete API reference for the new warehouse defects management system.

## Base URL
All endpoints are prefixed with: `/api/defects-v2/`

---

## 📋 Reference Data Endpoints

### Defect Types

#### List Defect Types
```http
GET /api/defects-v2/types/
```

**Query Parameters:**
- `category` - Filter by category (mechanical, material, manufacturing, other)
- `is_active` - Filter by active status (true/false)
- `search` - Search in name, name_uz, name_en, description

**Response:**
```json
[
  {
    "id": 1,
    "name": "Замок joyi ochilgan",
    "name_uz": "Замок joyi ochilgan",
    "name_en": "Lock mechanism damaged",
    "description": "Lock area is damaged or open",
    "category": "mechanical",
    "is_active": true,
    "created_at": "2025-01-10T10:00:00Z",
    "updated_at": "2025-01-10T10:00:00Z"
  }
]
```

#### Create Defect Type
```http
POST /api/defects-v2/types/
```

**Permissions:** Admin only

**Request Body:**
```json
{
  "name": "Suv o'tib shishgan",
  "name_uz": "Suv o'tib shishgan",
  "name_en": "Water damaged and swollen",
  "description": "Material swollen due to water damage",
  "category": "material"
}
```

#### Get/Update/Delete Defect Type
```http
GET /api/defects-v2/types/{id}/
PUT /api/defects-v2/types/{id}/
PATCH /api/defects-v2/types/{id}/
DELETE /api/defects-v2/types/{id}/
```

---

### Spare Parts

#### List Spare Parts
```http
GET /api/defects-v2/spare-parts/
```

**Query Parameters:**
- `is_active` - Filter by active status
- `search` - Search in name, product name, product SKU

**Response:**
```json
[
  {
    "id": 1,
    "product": 123,
    "product_name": "Yon Stoyevoy - Left",
    "product_sku": "SP-YON-001",
    "name": "Yon stoyevoy (chap)",
    "unit": "dona",
    "min_stock_level": "10.00",
    "current_stock": "45.00",
    "is_low_stock_alert": false,
    "is_active": true,
    "created_at": "2025-01-10T10:00:00Z",
    "updated_at": "2025-01-10T10:00:00Z"
  }
]
```

#### Get Low Stock Spare Parts
```http
GET /api/defects-v2/spare-parts/low-stock/
```

Returns spare parts where `current_stock < min_stock_level`.

#### Create/Update Spare Part
```http
POST /api/defects-v2/spare-parts/
PUT /api/defects-v2/spare-parts/{id}/
```

**Permissions:** Admin or Warehouse

**Request Body:**
```json
{
  "product": 123,
  "name": "Tepa stoyevoy",
  "unit": "dona",
  "min_stock_level": "5.00"
}
```

---

## 🔧 Defect Batch Endpoints

### List Defect Batches
```http
GET /api/defects-v2/batches/
```

**Query Parameters:**
- `status` - Filter by status (pending, inspected, processing, completed)
- `product` - Filter by product ID
- `warehouse` - Filter by warehouse ID
- `start_date` - Filter from date (ISO format)
- `end_date` - Filter to date (ISO format)
- `search` - Search in product name, SKU, notes

**Response (List View - Lightweight):**
```json
{
  "count": 50,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": 1,
      "product": 100,
      "product_name": "Дверь входная Люкс",
      "product_sku": "DOOR-LUX-001",
      "product_image": "/media/products/door-lux-001.jpg",
      "total_qty": "20.00",
      "repairable_qty": "15.00",
      "non_repairable_qty": "5.00",
      "status": "inspected",
      "status_display": "Inspected",
      "detected_at": "2025-01-10T10:00:00Z",
      "inspected_at": "2025-01-10T14:00:00Z",
      "completed_at": null,
      "created_by_name": "Warehouse Manager",
      "warehouse_name": "Main Warehouse",
      "created_at": "2025-01-10T10:00:00Z"
    }
  ]
}
```

### Get Defect Batch Detail
```http
GET /api/defects-v2/batches/{id}/
```

**Response (Detail View - Full):**
```json
{
  "id": 1,
  "product": 100,
  "product_name": "Дверь входная Люкс",
  "product_sku": "DOOR-LUX-001",
  "product_image": "/media/products/door-lux-001.jpg",
  "total_qty": "20.00",
  "repairable_qty": "15.00",
  "non_repairable_qty": "5.00",
  "status": "inspected",
  "status_display": "Inspected",
  "detected_at": "2025-01-10T10:00:00Z",
  "inspected_at": "2025-01-10T14:00:00Z",
  "completed_at": null,
  "created_by": 5,
  "created_by_name": "Warehouse Manager",
  "warehouse": 1,
  "warehouse_name": "Main Warehouse",
  "notes": "Damaged during transport",
  "defect_details": [
    {
      "id": 1,
      "defect_type": 1,
      "defect_type_name": "Замок joyi ochilgan",
      "defect_type_category": "mechanical",
      "qty": "3.00",
      "notes": "Lock area completely damaged",
      "created_at": "2025-01-10T14:00:00Z"
    },
    {
      "id": 2,
      "defect_type": 2,
      "defect_type_name": "Qoplama ko'chgan",
      "defect_type_category": "material",
      "qty": "2.00",
      "notes": "Surface coating peeled off",
      "created_at": "2025-01-10T14:00:00Z"
    }
  ],
  "is_fully_processed": false,
  "remaining_qty": "20.00",
  "created_at": "2025-01-10T10:00:00Z",
  "updated_at": "2025-01-10T14:00:00Z"
}
```

### Create Defect Batch
```http
POST /api/defects-v2/batches/
```

**Request Body:**
```json
{
  "product_id": 100,
  "total_qty": "20.00",
  "repairable_qty": "15.00",
  "non_repairable_qty": "5.00",
  "defect_details": [
    {
      "defect_type_id": 1,
      "qty": "3.00",
      "notes": "Lock area damaged"
    },
    {
      "defect_type_id": 2,
      "qty": "2.00",
      "notes": "Coating peeled"
    }
  ],
  "warehouse_id": 1,
  "notes": "Damaged during transport"
}
```

**Validations:**
- `total_qty` must equal `repairable_qty + non_repairable_qty`
- Product must have sufficient `stock_ok`
- All defect_type_ids must exist

**Side Effects:**
- Moves stock: `product.stock_ok` → `product.stock_defect`
- Creates DefectBatch with status='pending'
- Creates DefectDetail records
- Creates audit log entry

**Response:** Full batch detail (201 Created)

### Inspect Batch
```http
POST /api/defects-v2/batches/{id}/inspect/
```

Updates batch after inspection with final repairable/non-repairable split.

**Request Body:**
```json
{
  "repairable_qty": "15.00",
  "non_repairable_qty": "5.00",
  "defect_details": [
    {
      "defect_type_id": 1,
      "qty": "10.00",
      "notes": "Mechanical damage to lock"
    },
    {
      "defect_type_id": 3,
      "qty": "5.00",
      "notes": "Material defect - swelling"
    }
  ]
}
```

**Validations:**
- Sum must equal `batch.total_qty`
- Batch must not already be completed

**Side Effects:**
- Updates batch repairable/non_repairable quantities
- Replaces defect_details with new data
- Sets `inspected_at` timestamp
- Changes status to 'inspected'
- Creates audit log

**Response:** Full batch detail (200 OK)

### Repair Defects
```http
POST /api/defects-v2/batches/{id}/repair/
```

**Request Body:**
```json
{
  "qty": "10.00",
  "spare_parts": [
    {
      "spare_part_id": 1,
      "qty": "5.00",
      "unit_cost_usd": "2.50"
    },
    {
      "spare_part_id": 2,
      "qty": "10.00",
      "unit_cost_usd": "1.00"
    }
  ],
  "notes": "Replaced damaged lock mechanisms"
}
```

**Validations:**
- `qty` must not exceed `batch.repairable_qty`
- All spare parts must have sufficient stock

**Side Effects:**
- Consumes spare parts: reduces `spare_part.product.stock_ok`
- Moves stock: `product.stock_defect` → `product.stock_ok`
- Reduces `batch.repairable_qty` and `batch.total_qty`
- Creates DefectRepair record
- Creates RepairMaterial records
- Updates batch status to 'processing'
- Creates audit log

**Response:** DefectRepair detail (200 OK)
```json
{
  "id": 1,
  "batch": 1,
  "batch_product_name": "Дверь входная Люкс",
  "qty_repaired": "10.00",
  "started_at": "2025-01-10T15:00:00Z",
  "completed_at": "2025-01-10T15:30:00Z",
  "performed_by": 5,
  "performed_by_name": "Warehouse Manager",
  "status": "completed",
  "status_display": "Completed",
  "notes": "Replaced damaged lock mechanisms",
  "materials": [
    {
      "id": 1,
      "spare_part": 1,
      "spare_part_name": "Yon stoyevoy",
      "spare_part_unit": "dona",
      "qty_used": "5.00",
      "unit_cost_usd": "2.50",
      "total_cost_usd": "12.50",
      "created_at": "2025-01-10T15:30:00Z"
    }
  ],
  "total_cost": "22.50",
  "created_at": "2025-01-10T15:00:00Z",
  "updated_at": "2025-01-10T15:30:00Z"
}
```

### Write Off Defects
```http
POST /api/defects-v2/batches/{id}/write_off/
```

**Request Body:**
```json
{
  "qty": "5.00",
  "reason": "disposal",
  "notes": "Beyond repair - structural damage",
  "sale_price_usd": null
}
```

**Reasons:**
- `disposal` - Утилизация
- `scrap` - Списание
- `outlet_sale` - Продажа через outlet (requires sale_price_usd)

**Validations:**
- `qty` must not exceed `batch.non_repairable_qty`
- `sale_price_usd` required if reason is 'outlet_sale'

**Side Effects:**
- Removes from stock: reduces `product.stock_defect`
- Reduces `batch.non_repairable_qty` and `batch.total_qty`
- Creates DefectWriteOff record
- Updates batch status to 'processing'
- Creates audit log

**Response:** DefectWriteOff detail (200 OK)
```json
{
  "id": 1,
  "batch": 1,
  "batch_product_name": "Дверь входная Люкс",
  "qty_written_off": "5.00",
  "reason": "disposal",
  "reason_display": "Disposal/Utilization",
  "performed_at": "2025-01-10T16:00:00Z",
  "performed_by": 5,
  "performed_by_name": "Warehouse Manager",
  "notes": "Beyond repair - structural damage",
  "sale_price_usd": null,
  "total_revenue": "0.00",
  "created_at": "2025-01-10T16:00:00Z"
}
```

### Complete Batch
```http
POST /api/defects-v2/batches/{id}/complete/
```

Marks batch as completed. Only allowed when `is_fully_processed()` returns true (all items either repaired or written off).

**Validation:**
- `batch.remaining_qty()` must be 0

**Side Effects:**
- Sets status to 'completed'
- Sets `completed_at` timestamp
- Creates audit log

**Response:** Full batch detail (200 OK)

### Get Audit Log
```http
GET /api/defects-v2/batches/{id}/audit-log/
```

**Response:**
```json
[
  {
    "id": 5,
    "batch": 1,
    "batch_info": {
      "id": 1,
      "product_name": "Дверь входная Люкс",
      "total_qty": "0.00"
    },
    "action": "repair_completed",
    "action_display": "Repair Completed",
    "performed_by": 5,
    "performed_by_name": "Warehouse Manager",
    "performed_at": "2025-01-10T15:30:00Z",
    "old_data": {
      "repairable_qty": "15.00",
      "stock_defect": "20.00"
    },
    "new_data": {
      "repairable_qty": "5.00",
      "stock_defect": "10.00"
    },
    "description": "Repaired 10.00 units, consumed 2 spare parts"
  }
]
```

---

## 📊 Analytics Endpoints

### Get Statistics
```http
GET /api/defects-v2/analytics/statistics/
```

**Query Parameters:**
- `start_date` - Filter from date (ISO format)
- `end_date` - Filter to date (ISO format)
- `product_id` - Filter by product
- `warehouse_id` - Filter by warehouse
- `status` - Filter by batch status

**Response:**
```json
{
  "totals": {
    "total_batches": 50,
    "total_qty": "1250.00",
    "total_repairable": "800.00",
    "total_non_repairable": "450.00",
    "total_repaired": "650.00",
    "total_written_off": "300.00",
    "remaining_qty": "300.00",
    "total_repair_cost_usd": "15250.50",
    "total_recovery_revenue_usd": "2500.00"
  },
  "by_product": [
    {
      "product_id": 100,
      "product_name": "Дверь входная Люкс",
      "product_sku": "DOOR-LUX-001",
      "batch_count": 5,
      "total_qty": "100.00",
      "repairable_qty": "80.00",
      "non_repairable_qty": "20.00"
    }
  ],
  "by_defect_type": [
    {
      "defect_type_id": 1,
      "defect_type_name": "Замок joyi ochilgan",
      "category": "mechanical",
      "total_qty": "150.00",
      "batch_count": 12
    }
  ],
  "by_status": [
    {
      "status": "completed",
      "count": 25,
      "qty_sum": "625.00"
    },
    {
      "status": "processing",
      "count": 15,
      "qty_sum": "375.00"
    }
  ],
  "spare_parts_consumption": [
    {
      "spare_part_id": 1,
      "spare_part_name": "Yon stoyevoy",
      "unit": "dona",
      "total_qty_used": "125.00",
      "total_cost_usd": "312.50"
    }
  ]
}
```

### Export Statistics to Excel
```http
GET /api/defects-v2/analytics/export/excel/
```

Uses same query parameters as statistics endpoint.

**Response:** Excel file download with 5 sheets:
1. Summary - Overall statistics
2. By Product - Defects by product
3. By Defect Type - Defects by type
4. By Status - Batches by status
5. Spare Parts - Spare parts consumption

**Headers:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=defect_statistics_20250110_120000.xlsx
```

### Export Statistics to PDF
```http
GET /api/defects-v2/analytics/export/pdf/
```

**Status:** Not implemented yet (501 Not Implemented)

---

## 📖 Repair and Write-Off History

### List Repairs
```http
GET /api/defects-v2/repairs/
```

**Query Parameters:**
- `batch` - Filter by batch ID
- `status` - Filter by status
- `performed_by` - Filter by user

**Response:**
```json
{
  "count": 30,
  "results": [
    {
      "id": 1,
      "batch": 1,
      "batch_product_name": "Дверь входная Люкс",
      "qty_repaired": "10.00",
      "started_at": "2025-01-10T15:00:00Z",
      "completed_at": "2025-01-10T15:30:00Z",
      "performed_by": 5,
      "performed_by_name": "Warehouse Manager",
      "status": "completed",
      "status_display": "Completed",
      "notes": "Replaced damaged parts",
      "materials": [...],
      "total_cost": "22.50"
    }
  ]
}
```

### Get Repair Detail
```http
GET /api/defects-v2/repairs/{id}/
```

### List Write-Offs
```http
GET /api/defects-v2/write-offs/
```

**Query Parameters:**
- `batch` - Filter by batch ID
- `reason` - Filter by reason
- `performed_by` - Filter by user

**Response:** Similar structure to repairs

### Get Write-Off Detail
```http
GET /api/defects-v2/write-offs/{id}/
```

---

## 🔐 Permissions

- **DefectTypes:** View=All authenticated, Create/Update/Delete=Admin only
- **SpareParts:** View=All authenticated, Create/Update=Admin+Warehouse, Delete=Admin only
- **Batches:** All actions=Authenticated users
- **Repairs/WriteOffs:** Read-only (created via batch actions)
- **Analytics:** All authenticated users

---

## 🔄 Workflow Example

```
1. Create Batch
   POST /api/defects-v2/batches/
   → Moves stock_ok to stock_defect
   → Status: pending

2. Inspect Batch
   POST /api/defects-v2/batches/1/inspect/
   → Sets repairable/non-repairable split
   → Adds defect type details
   → Status: inspected

3a. Repair (for repairable items)
    POST /api/defects-v2/batches/1/repair/
    → Consumes spare parts
    → Moves stock_defect back to stock_ok
    → Status: processing

3b. Write-Off (for non-repairable items)
    POST /api/defects-v2/batches/1/write_off/
    → Removes from stock_defect
    → Status: processing

4. Complete Batch (when all processed)
   POST /api/defects-v2/batches/1/complete/
   → Status: completed
```

---

## 📝 Business Rules

1. **Stock Conservation:** `total_qty = repairable_qty + non_repairable_qty` (strictly enforced)
2. **Atomic Operations:** All stock movements use database transactions
3. **Audit Trail:** Every action creates an audit log entry
4. **Validation:** Stock availability checked before operations
5. **Normalization:** No JSON for core business data (spare parts, defect types)
6. **Protection:** Cannot delete referenced entities (PROTECT on foreign keys)

---

## 🚦 Status Transitions

```
pending → inspected → processing → completed
         ↓             ↓
    (Can skip)    (Auto-set)
```

- **pending:** Just created, awaiting inspection
- **inspected:** Inspection complete, ready for processing
- **processing:** Repair/write-off operations in progress
- **completed:** All items processed (repaired or written off)

---

## 💡 Tips

1. Use `?search=` for quick product/SKU lookups
2. Batch list view is lightweight - use for tables
3. Detail view includes all related data - use for forms
4. Export endpoints support same filters as statistics
5. Check `is_fully_processed` before completing batches
6. Use audit logs for compliance and debugging
