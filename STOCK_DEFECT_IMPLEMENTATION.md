# Stock Defect Management Module - Implementation Guide

## Overview

This document describes the complete implementation of the stock defect management module for Lenza ERP. This module allows tracking, repairing, disposing, and selling defective products.

## Backend Implementation

### 1. Models

#### DefectType (Reference Model)
Admin-managed reference for defect types (doshechka, oyna, yon stoyevoy, qoplama, etc.)

**Fields:**
- `name`: Defect type name (unique)
- `description`: Optional description
- `is_active`: Active flag
- `created_at`, `updated_at`: Timestamps

#### ProductDefect (Main Model)
Aggregated defect record per product.

**Fields:**
- `product`: ForeignKey to Product
- `qty`: Total defect quantity
- `repairable_qty`: Repairable quantity
- `non_repairable_qty`: Non-repairable quantity
- `defect_details`: JSON array of defect details
  ```json
  [
    {"type_id": 1, "type_name": "дошечка", "qty": 2},
    {"type_id": 2, "type_name": "оына", "qty": 1}
  ]
  ```
- `status`: detected | inspected | repairing | repaired | disposed | sold_outlet
- `description`: Text description
- `repair_materials`: JSON array of materials used for repair
- `repair_completed_at`, `disposed_at`, `sold_outlet_at`: Action timestamps
- `created_by`, `updated_by`: User tracking
- `created_at`, `updated_at`: Timestamps

**Validation:**
- `qty = repairable_qty + non_repairable_qty`

#### DefectAuditLog
Audit trail for all defect changes.

**Fields:**
- `defect`: ForeignKey to ProductDefect
- `action`: created | updated | status_changed | repaired | disposed | sold_outlet
- `old_data`: JSON snapshot before change
- `new_data`: JSON snapshot after change
- `description`: Action description
- `user`: User who performed action
- `created_at`: Timestamp

### 2. Signals

**File:** `backend/catalog/signals.py`

Automatically syncs `product.stock_defect`:

```python
product.stock_defect = sum(
    ProductDefect.qty 
    where status != 'disposed' and status != 'sold_outlet'
)
```

Triggers:
- `post_save` on ProductDefect
- `post_delete` on ProductDefect

### 3. API Endpoints

#### Defect Types
```
GET    /api/defects/types/          - List defect types
POST   /api/defects/types/          - Create defect type (Admin only)
GET    /api/defects/types/:id/      - Get defect type
PUT    /api/defects/types/:id/      - Update defect type (Admin only)
DELETE /api/defects/types/:id/      - Delete defect type (Admin only)
```

#### Product Defects
```
GET    /api/defects/                - List defects
POST   /api/defects/                - Create defect
GET    /api/defects/:id/            - Get defect details
PUT    /api/defects/:id/            - Update defect
PATCH  /api/defects/:id/            - Partial update
DELETE /api/defects/:id/            - Delete defect

# Custom actions
POST   /api/defects/:id/repair/         - Repair defect items
POST   /api/defects/:id/dispose/        - Dispose defect items
POST   /api/defects/:id/sell-outlet/    - Sell via outlet
PATCH  /api/defects/:id/change-status/  - Change status
GET    /api/defects/:id/audit-logs/     - Get audit logs
GET    /api/defects/statistics/         - Get defect statistics
```

#### Audit Logs
```
GET    /api/defects/audit-logs/     - List all audit logs
GET    /api/defects/audit-logs/:id/ - Get specific log
```

### 4. Permissions

**Defect Types:**
- Read: All authenticated users
- Write: Admin/Owner only

**Product Defects:**
- Create/Update/Delete: Admin/Warehouse/Owner
- Read: All authenticated users
- Actions (repair/dispose/sell): Admin/Warehouse/Owner

**Audit Logs:**
- Read only: All authenticated users
- No create/update/delete

### 5. API Usage Examples

#### Create Defect
```http
POST /api/defects/
Content-Type: application/json

{
  "product": 123,
  "qty": 3,
  "repairable_qty": 1,
  "non_repairable_qty": 2,
  "defect_details": [
    {"type_id": 1, "qty": 2},
    {"type_id": 2, "qty": 1}
  ],
  "status": "detected",
  "description": "Дефект обнаружен при приемке"
}
```

#### Repair Defect
```http
POST /api/defects/5/repair/
Content-Type: application/json

{
  "quantity": 1,
  "materials": [
    {"product_id": 456, "qty": 2},
    {"product_id": 789, "qty": 1}
  ],
  "description": "Заменены дошечки и стекло"
}
```

**Process:**
1. Validates quantity <= repairable_qty
2. Validates material availability
3. Deducts materials from stock_ok
4. Deducts quantity from repairable_qty
5. Adds quantity to product.stock_ok
6. Updates defect status
7. Creates audit log

#### Dispose Defect
```http
POST /api/defects/5/dispose/
Content-Type: application/json

{
  "quantity": 2,
  "description": "Утилизация сильно поврежденных изделий"
}
```

#### Sell Outlet
```http
POST /api/defects/5/sell-outlet/
Content-Type: application/json

{
  "quantity": 1,
  "sale_price_usd": 50.00,
  "description": "Продано через outlet с 40% скидкой"
}
```

#### Get Statistics
```http
GET /api/defects/statistics/?date_from=2024-01-01&date_to=2024-12-31
```

**Response:**
```json
{
  "totals": {
    "total_defects": 25,
    "total_qty": 47,
    "total_repairable": 15,
    "total_non_repairable": 32
  },
  "by_status": [
    {"status": "detected", "count": 5, "qty_sum": 12},
    {"status": "repaired", "count": 8, "qty_sum": 8}
  ],
  "by_product": [
    {
      "product__id": 123,
      "product__name": "Eshik Beta Soft",
      "product__sku": "SKU123",
      "defect_count": 3,
      "defect_qty": 7
    }
  ],
  "by_defect_type": [
    {"type_name": "дошечка", "total_qty": 15},
    {"type_name": "стекло", "total_qty": 8}
  ]
}
```

### 6. Query Filters

**Defects List:**
- `status`: Filter by status
- `product`: Filter by product ID
- `product__brand`: Filter by brand ID
- `created_by`: Filter by creator
- `date_from`, `date_to`: Date range
- `has_repairable`: true/false
- `has_non_repairable`: true/false
- `search`: Search in product name, SKU, description

**Example:**
```
GET /api/defects/?status=detected&has_repairable=true&date_from=2024-01-01
```

## Frontend Implementation (Quick Reference)

### Required TypeScript Types

**File:** `frontend/src/types/defects.ts`

```typescript
export interface DefectType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DefectDetail {
  type_id: number;
  type_name: string;
  qty: number;
}

export interface ProductDefect {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  product_image: string | null;
  product_price_usd: string;
  qty: string;
  repairable_qty: string;
  non_repairable_qty: string;
  defect_details: DefectDetail[];
  defect_details_enriched: DefectDetail[];
  status: 'detected' | 'inspected' | 'repairing' | 'repaired' | 'disposed' | 'sold_outlet';
  status_display: string;
  description: string;
  repair_materials: any[];
  repair_completed_at: string | null;
  disposed_at: string | null;
  sold_outlet_at: string | null;
  created_by: number;
  created_by_name: string;
  updated_by: number;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DefectListItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  product_image: string | null;
  qty: string;
  repairable_qty: string;
  non_repairable_qty: string;
  status: string;
  status_display: string;
  defect_summary: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}
```

### API Service

**File:** `frontend/src/api/defects.ts`

```typescript
import api from './client';

export const defectsApi = {
  // Defect Types
  getDefectTypes: () => api.get('/defects/types/'),
  createDefectType: (data: any) => api.post('/defects/types/', data),
  
  // Defects
  getDefects: (params?: any) => api.get('/defects/', { params }),
  getDefect: (id: number) => api.get(`/defects/${id}/`),
  createDefect: (data: any) => api.post('/defects/', data),
  updateDefect: (id: number, data: any) => api.put(`/defects/${id}/`, data),
  deleteDefect: (id: number) => api.delete(`/defects/${id}/`),
  
  // Actions
  repairDefect: (id: number, data: any) => api.post(`/defects/${id}/repair/`, data),
  disposeDefect: (id: number, data: any) => api.post(`/defects/${id}/dispose/`, data),
  sellOutlet: (id: number, data: any) => api.post(`/defects/${id}/sell-outlet/`, data),
  changeStatus: (id: number, status: string) => api.patch(`/defects/${id}/change-status/`, { status }),
  
  // Statistics
  getStatistics: (params?: any) => api.get('/defects/statistics/', { params }),
  
  // Audit
  getAuditLogs: (id: number) => api.get(`/defects/${id}/audit-logs/`),
};
```

### Key UI Components Needed

1. **DefectsListPage** - Main list page with filters and actions
2. **DefectFormModal** - Create/edit defect with product selector and defect types
3. **RepairModal** - Repair interface with material selection
4. **DisposeModal** - Disposal confirmation
5. **OutletSaleModal** - Outlet sale with price input
6. **DefectAnalyticsPage** - Statistics and charts

### Routing

```typescript
// Add to router
{
  path: '/defects',
  element: <DefectsListPage />,
  meta: { roles: ['admin', 'warehouse', 'owner'] }
},
{
  path: '/defects/analytics',
  element: <DefectAnalyticsPage />,
  meta: { roles: ['admin', 'owner'] }
}
```

## Database Migration

```bash
cd backend
python manage.py makemigrations catalog
python manage.py migrate
```

## Admin Interface

Access Django admin at `/admin/catalog/`:

- **DefectType**: Manage defect types
- **ProductDefect**: View/edit defects with inline audit logs
- **DefectAuditLog**: Read-only audit trail

## Testing

### Create Test Defect Type
```python
from catalog.models import DefectType

DefectType.objects.create(
    name="Дошечка",
    description="Повреждение дошечки двери",
    is_active=True
)
```

### Create Test Defect
```python
from catalog.models import ProductDefect, Product, DefectType

product = Product.objects.first()
defect_type = DefectType.objects.first()

defect = ProductDefect.objects.create(
    product=product,
    qty=3,
    repairable_qty=1,
    non_repairable_qty=2,
    defect_details=[
        {"type_id": defect_type.id, "type_name": defect_type.name, "qty": 3}
    ],
    status='detected',
    description='Test defect'
)
```

### Test Repair
```python
from catalog.models import Product

# Get materials
material1 = Product.objects.get(sku='MAT001')
material2 = Product.objects.get(sku='MAT002')

# Call repair endpoint
# POST /api/defects/{defect_id}/repair/
{
    "quantity": 1,
    "materials": [
        {"product_id": material1.id, "qty": 2},
        {"product_id": material2.id, "qty": 1}
    ],
    "description": "Test repair"
}
```

## Best Practices

1. **Always validate quantities** before repair/dispose/sell actions
2. **Check material availability** before confirming repairs
3. **Use audit logs** to track all changes
4. **Filter defects** by status to manage workflow
5. **Review statistics regularly** to identify patterns
6. **Set defect types** at the beginning (admin task)

## Common Workflows

### Workflow 1: Repair Defect
1. Warehouse discovers defect → Create defect record (status: detected)
2. Admin inspects → Change status to inspected
3. Warehouse repairs → Use repair action with materials
4. System automatically:
   - Deducts materials from stock
   - Deducts from repairable_qty
   - Adds to product.stock_ok
   - Updates status to repaired

### Workflow 2: Dispose Non-Repairable
1. Defect created with non_repairable_qty
2. Admin decides to dispose
3. Use dispose action
4. System marks as disposed, quantity no longer counts in stock_defect

### Workflow 3: Outlet Sale
1. Defect with non_repairable_qty
2. Admin decides to sell at discount
3. Use sell-outlet action with discounted price
4. System marks as sold_outlet
5. Create actual sale transaction separately (if needed)

## Troubleshooting

### Issue: stock_defect not updating
**Solution:** Check signals.py is imported in apps.py

### Issue: Validation error on quantities
**Solution:** Ensure qty = repairable_qty + non_repairable_qty

### Issue: Material not found during repair
**Solution:** Verify product_id exists and stock_ok >= required qty

## Summary

This module provides complete defect tracking with:
- ✅ Defect type reference management
- ✅ Product defect tracking with repairable/non-repairable classification
- ✅ Repair workflow with material deduction
- ✅ Disposal workflow
- ✅ Outlet sale workflow
- ✅ Automatic stock_defect synchronization
- ✅ Complete audit trail
- ✅ Statistics and analytics
- ✅ Role-based permissions
- ✅ Admin interface

All backend functionality is implemented and ready to use. Frontend components can be built using the provided API endpoints and TypeScript types.
