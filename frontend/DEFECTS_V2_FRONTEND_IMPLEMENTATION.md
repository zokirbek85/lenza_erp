# Defects V2 Frontend Implementation Guide

## Status: In Progress

### ✅ Completed
1. API Service ([src/api/defectsV2.ts](src/api/defectsV2.ts))
2. TypeScript Types ([src/types/defectsV2.ts](src/types/defectsV2.ts))
3. DefectBatchList Page ([src/pages/DefectsV2/DefectBatchList.tsx](src/pages/DefectsV2/DefectBatchList.tsx))

### 🔄 Remaining Components

#### 1. DefectBatchDetail Page
**File:** `src/pages/DefectsV2/DefectBatchDetail.tsx`

**Features:**
- Display full batch information
- Product details with image
- Current status and timeline
- Defect types breakdown table
- Action buttons based on status:
  - Pending → Inspect button
  - Inspected → Repair/Write-off buttons
  - Processing → Complete button
- Repairs history table
- Write-offs history table
- Audit log timeline
- Stock impact visualization

**Key Sections:**
```tsx
- Batch Header (product, quantities, status badge)
- Defect Details Table
- Actions Card (context-aware buttons)
- Repairs Table
- Write-Offs Table
- Audit Log Timeline
```

#### 2. CreateDefectBatch Form
**File:** `src/pages/DefectsV2/CreateDefectBatch.tsx`

**Form Fields:**
- Product selector (autocomplete with image)
- Total quantity (number input)
- Repairable quantity (number input)
- Non-repairable quantity (number input)
  - Validation: total = repairable + non_repairable
- Warehouse selector/input
- Defect details (dynamic list):
  - Defect type selector
  - Quantity
  - Notes (optional)
  - Add/Remove buttons
- Notes (textarea)

**Validation:**
- Check product has enough stock_ok
- Validate quantities sum correctly
- At least one defect detail recommended

#### 3. InspectBatch Modal
**File:** `src/components/defectsV2/InspectBatchModal.tsx`

**Props:**
```tsx
interface InspectBatchModalProps {
  visible: boolean;
  batch: DefectBatchDetail;
  onCancel: () => void;
  onSuccess: () => void;
}
```

**Form Fields:**
- Display current batch info
- Repairable quantity (editable)
- Non-repairable quantity (editable)
- Defect details (editable list):
  - Can update existing
  - Can add new
  - Can remove
- Live validation of totals

#### 4. RepairDefect Modal
**File:** `src/components/defectsV2/RepairDefectModal.tsx`

**Props:**
```tsx
interface RepairDefectModalProps {
  visible: boolean;
  batch: DefectBatchDetail;
  onCancel: () => void;
  onSuccess: () => void;
}
```

**Form Fields:**
- Quantity to repair (max: batch.repairable_qty)
- Spare parts list (dynamic):
  - Spare part selector (with current stock display)
  - Quantity needed
  - Add/Remove buttons
  - Stock validation
- Notes
- Cost estimation display

#### 5. WriteOffDefect Modal
**File:** `src/components/defectsV2/WriteOffDefectModal.tsx`

**Props:**
```tsx
interface WriteOffDefectModalProps {
  visible: boolean;
  batch: DefectBatchDetail;
  onCancel: () => void;
  onSuccess: () => void;
}
```

**Form Fields:**
- Quantity to write off (max: batch.non_repairable_qty)
- Reason selector:
  - Disposal/Utilization
  - Scrap
  - Outlet Sale
  - Other
- Sale price (required if reason = outlet_sale)
- Notes
- Revenue calculation display (if outlet sale)

#### 6. SpareParts Management Page
**File:** `src/pages/DefectsV2/SpareParts.tsx`

**Features:**
- List with low stock alerts (red badge)
- Create spare part form (drawer/modal)
- Edit spare part
- Delete confirmation
- Search and filters
- Link to product in catalog

**Table Columns:**
- ID
- Product Name + SKU
- Spare Part Name
- Unit
- Current Stock
- Min Stock Level
- Status (Active/Inactive)
- Low Stock Alert (badge)
- Actions

#### 7. DefectsAnalyticsV2 Dashboard
**File:** `src/pages/DefectsV2/DefectsAnalytics.tsx`

**Features:**
- Date range filter
- Product filter
- Warehouse filter
- Status filter
- Export to Excel button

**Widgets:**

1. **Summary Cards:**
   - Total Defect Batches
   - Total Defective Items
   - Repairable Items
   - Non-Repairable Items

2. **Defect Trends Chart:**
   - Line chart showing defects over time
   - Group by day/week/month

3. **Top Defect Types Bar Chart:**
   - Horizontal bar chart
   - Top 10 defect types by quantity

4. **Defect Rate by Product Table:**
   - Product name
   - Total defective qty
   - Repairable qty
   - Non-repairable qty
   - Defect rate %

5. **Status Breakdown Pie Chart:**
   - Pending
   - Inspected
   - Processing
   - Completed

6. **Spare Parts Consumption Table:**
   - Spare part name
   - Times used
   - Total quantity consumed
   - Total cost

7. **Repair vs Write-Off Comparison:**
   - Donut chart or stacked bar

#### 8. Component: DefectTypeSelector
**File:** `src/components/defectsV2/DefectTypeSelector.tsx`

**Purpose:** Reusable component for selecting defect types with quantities

**Props:**
```tsx
interface DefectTypeSelectorProps {
  value: Array<{ defect_type_id: number; qty: number; notes?: string }>;
  onChange: (value: Array<{ defect_type_id: number; qty: number; notes?: string }>) => void;
  defectTypes: DefectTypeV2[];
}
```

**Features:**
- Multi-select with quantity input
- Add/remove rows
- Notes for each defect
- Validation

#### 9. Component: StockIndicator
**File:** `src/components/defectsV2/StockIndicator.tsx`

**Purpose:** Visual display of stock transitions

**Props:**
```tsx
interface StockIndicatorProps {
  stockOk: number;
  stockDefect: number;
  showChange?: {
    from: { stockOk: number; stockDefect: number };
    to: { stockOk: number; stockDefect: number };
  };
}
```

**Display:**
- Progress bars or gauges
- Color coding (green for OK, red for defect)
- Before/after comparison

#### 10. Component: AuditTimeline
**File:** `src/components/defectsV2/AuditTimeline.tsx`

**Purpose:** Display audit log as timeline

**Props:**
```tsx
interface AuditTimelineProps {
  batchId: number;
  auditLogs: DefectAuditLogV2[];
}
```

**Features:**
- Timeline with icons for each action
- Expandable details (old_data / new_data)
- User and timestamp
- Color coding by action type

### 🔧 Routes Configuration

**File:** `src/App.tsx` (or router config file)

Add these routes:
```tsx
// Defects V2 Routes
<Route path="/defects-v2" element={<DefectBatchListPage />} />
<Route path="/defects-v2/create" element={<CreateDefectBatchPage />} />
<Route path="/defects-v2/batches/:id" element={<DefectBatchDetailPage />} />
<Route path="/defects-v2/spare-parts" element={<SparePartsPage />} />
<Route path="/defects-v2/analytics" element={<DefectsAnalyticsV2Page />} />
```

### 🌐 Translations

**Files:**
- `public/locales/en/defects.json`
- `public/locales/ru/defects.json`
- `public/locales/uz/defects.json`

**Key Structure:**
```json
{
  "defects": {
    "title": "Defects Management",
    "defectBatches": "Defect Batches",
    "createBatch": "Create Defect Batch",
    "batchId": "Batch ID",
    "product": "Product",
    "totalQty": "Total Qty",
    "repairableQty": "Repairable",
    "nonRepairableQty": "Non-Repairable",
    "status": {
      "pending": "Pending Inspection",
      "inspected": "Inspected",
      "processing": "Processing",
      "completed": "Completed"
    },
    "actions": {
      "inspect": "Inspect",
      "repair": "Repair",
      "writeOff": "Write Off",
      "complete": "Complete"
    },
    "warehouse": "Warehouse",
    "detectedAt": "Detected At",
    "createdBy": "Created By",
    "analytics": "Analytics",
    "spareParts": "Spare Parts",
    "defectTypes": "Defect Types",
    "repairHistory": "Repair History",
    "writeOffHistory": "Write-Off History",
    "auditLog": "Audit Log",
    "stockImpact": "Stock Impact",
    "fetchError": "Failed to fetch defects",
    "createSuccess": "Defect batch created successfully",
    "inspectSuccess": "Batch inspected successfully",
    "repairSuccess": "Repair completed successfully",
    "writeOffSuccess": "Write-off completed successfully"
  }
}
```

### 📊 Charts Library

For analytics, use:
- **Recharts** (already used in project)
- Or **Chart.js with react-chartjs-2**

Install if needed:
```bash
npm install recharts
# or
npm install chart.js react-chartjs-2
```

### 🎨 UI Components

Using Ant Design (already in project):
- Table
- Form
- Modal
- Drawer
- Card
- Statistic
- Timeline
- Tag
- Badge
- Select (with autocomplete)
- DatePicker
- InputNumber
- Button
- Space
- Row/Col (Grid)
- Image

### 🧪 Testing Checklist

After implementation, test:
- [ ] Create defect batch (verify stock reduction)
- [ ] Inspect batch (update quantities)
- [ ] Repair defects (verify stock restoration, spare parts consumed)
- [ ] Write off defects (verify stock removed)
- [ ] Complete batch
- [ ] View audit log
- [ ] Filter and search batches
- [ ] View analytics
- [ ] Manage spare parts
- [ ] Export analytics to Excel

### 📝 Implementation Priority

1. **Phase 1: Core CRUD** (1-2 days)
   - DefectBatchDetail page
   - CreateDefectBatch form
   - Basic view/create functionality

2. **Phase 2: Workflows** (2-3 days)
   - InspectBatch modal
   - RepairDefect modal
   - WriteOffDefect modal
   - Test all workflows end-to-end

3. **Phase 3: Support Features** (1-2 days)
   - SpareParts management page
   - Reusable components (selectors, indicators, timeline)

4. **Phase 4: Analytics** (1-2 days)
   - DefectsAnalyticsV2 dashboard
   - Charts and visualizations
   - Export functionality

5. **Phase 5: Polish** (1 day)
   - Add all translations
   - Responsive design adjustments
   - Loading states
   - Error handling
   - Toast notifications

### 🔗 Integration Points

1. **Products:**
   - Link to product detail from batch
   - Product selector with stock check

2. **Dashboard:**
   - Add defect metrics widget
   - Low spare parts alerts

3. **Inventory:**
   - Show defect stock in product details
   - Stock adjustment history

4. **Notifications:**
   - Alert for low spare parts
   - Alert for pending inspections > 3 days

### 🚀 Quick Start for Developers

1. Start backend server:
```bash
cd backend
python manage.py runserver
```

2. Start frontend dev server:
```bash
cd frontend
npm run dev
```

3. Navigate to http://localhost:5173/defects-v2

4. Create first defect batch
5. Test workflows
6. View analytics

### 📖 API Endpoints Reference

All endpoints are in [src/api/defectsV2.ts](src/api/defectsV2.ts)

**Base URL:** `/api/defects-v2/`

- GET `/batches/` - List batches
- POST `/batches/` - Create batch
- GET `/batches/:id/` - Get batch details
- POST `/batches/:id/inspect/` - Inspect
- POST `/batches/:id/repair/` - Repair
- POST `/batches/:id/write-off/` - Write off
- GET `/spare-parts/` - List spare parts
- GET `/analytics/statistics/` - Get stats

### 💡 Tips

1. **Reuse Patterns:** Look at existing pages (Orders, Products) for patterns
2. **Form Validation:** Use Ant Design Form with custom validators
3. **Error Handling:** Use toast notifications consistently
4. **Loading States:** Show spinners during API calls
5. **Optimistic Updates:** Update UI immediately, rollback on error
6. **Type Safety:** Use TypeScript strictly, leverage the types created

### 🐛 Common Issues

1. **Import errors:** Check `tsconfig.json` paths
2. **API 404:** Verify backend is running and URLs match
3. **CORS:** Ensure API allows frontend origin
4. **Auth:** Check JWT token is being sent in headers

---

**Backend Status:** ✅ Complete
**Frontend Status:** 🔄 30% Complete

**Next Step:** Implement DefectBatchDetail page (highest priority for user interaction)
