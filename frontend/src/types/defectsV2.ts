/**
 * Defects V2 Type Definitions
 * Mirrors the backend models and API responses
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================================================
// Defect Type
// ============================================================================

export interface DefectTypeV2 {
  id: number;
  name: string;
  name_uz?: string;
  name_en?: string;
  description?: string;
  category?: 'production' | 'handling' | 'transport' | 'storage' | 'other';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Spare Part
// ============================================================================

export interface SparePartV2 {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  name: string;
  unit: string;
  min_stock_level: string;
  current_stock: string;
  is_low_stock_alert: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Defect Batch
// ============================================================================

export type DefectBatchStatus = 'pending' | 'inspected' | 'processing' | 'completed';

export interface DefectDetailV2 {
  id: number;
  defect_type: number;
  defect_type_name: string;
  defect_type_category: string;
  qty: string;
  notes: string;
  created_at: string;
}

export interface DefectBatchListItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  product_image: string | null;
  total_qty: string;
  repairable_qty: string;
  non_repairable_qty: string;
  status: DefectBatchStatus;
  status_display: string;
  detected_at: string;
  inspected_at: string | null;
  completed_at: string | null;
  created_by_name: string;
  warehouse_name: string;
  created_at: string;
}

export interface DefectBatchDetail extends DefectBatchListItem {
  created_by: number;
  notes: string;
  defect_details: DefectDetailV2[];
  is_fully_processed: boolean;
  remaining_qty: string;
  updated_at: string;
}

export interface DefectBatchV2 {
  id?: number;
  product: number;
  total_qty: string;
  repairable_qty: string;
  non_repairable_qty: string;
  status: DefectBatchStatus;
  detected_at?: string;
  inspected_at?: string | null;
  completed_at?: string | null;
  created_by?: number;
  warehouse_name?: string;
  notes?: string;
}

// ============================================================================
// Repair
// ============================================================================

export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface RepairMaterialV2 {
  id: number;
  spare_part: number;
  spare_part_name: string;
  spare_part_unit: string;
  qty_used: string;
  unit_cost_usd: string | null;
  total_cost_usd: string | null;
  created_at: string;
}

export interface DefectRepairV2 {
  id: number;
  batch: number;
  batch_product_name: string;
  qty_repaired: string;
  started_at: string;
  completed_at: string | null;
  performed_by: number;
  performed_by_name: string;
  status: RepairStatus;
  status_display: string;
  notes: string;
  materials: RepairMaterialV2[];
  total_cost: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Write-Off
// ============================================================================

export type WriteOffReason = 'disposal' | 'scrap' | 'outlet_sale' | 'other';

export interface DefectWriteOffV2 {
  id: number;
  batch: number;
  batch_product_name: string;
  qty_written_off: string;
  reason: WriteOffReason;
  reason_display: string;
  performed_at: string;
  performed_by: number;
  performed_by_name: string;
  notes: string;
  sale_price_usd: string | null;
  total_revenue: string;
  created_at: string;
}

// ============================================================================
// Audit Log
// ============================================================================

export type AuditAction =
  | 'created'
  | 'inspected'
  | 'repair_started'
  | 'repair_completed'
  | 'written_off'
  | 'status_changed'
  | 'quantity_adjusted';

export interface DefectAuditLogV2 {
  id: number;
  batch: number;
  batch_info: {
    id: number;
    product_name: string;
    total_qty: string;
  };
  action: AuditAction;
  action_display: string;
  performed_by: number;
  performed_by_name: string;
  performed_at: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  description: string;
}

// ============================================================================
// Request Data Types
// ============================================================================

export interface CreateDefectBatchData {
  product_id: number;
  total_qty: number | string;
  repairable_qty: number | string;
  non_repairable_qty: number | string;
  defect_details?: Array<{
    defect_type_id: number;
    qty: number | string;
    notes?: string;
  }>;
  warehouse_name?: string;
  notes?: string;
}

export interface InspectBatchData {
  repairable_qty: number | string;
  non_repairable_qty: number | string;
  defect_details: Array<{
    defect_type_id: number;
    qty: number | string;
    notes?: string;
  }>;
}

export interface RepairDefectData {
  qty: number | string;
  spare_parts?: Array<{
    spare_part_id: number;
    qty: number | string;
  }>;
  notes?: string;
}

export interface WriteOffDefectData {
  qty: number | string;
  reason: WriteOffReason;
  notes?: string;
  sale_price_usd?: number | string;
}

// ============================================================================
// Filters
// ============================================================================

export interface DefectBatchFilters {
  status?: DefectBatchStatus;
  product?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// ============================================================================
// Analytics
// ============================================================================

export interface DefectStatistics {
  totals: {
    total_batches: number;
    total_qty: string;
    total_repairable: string;
    total_non_repairable: string;
  };
  by_product: Array<{
    product__id: number;
    product__name: string;
    product__sku: string;
    total_defect_qty: string;
    repairable_qty: string;
    non_repairable_qty: string;
  }>;
  by_defect_type: Array<{
    defect_type__id: number;
    defect_type__name: string;
    defect_type__category: string;
    occurrence_count: number;
    total_qty: string;
  }>;
  by_status: Array<{
    status: DefectBatchStatus;
    count: number;
    qty_sum: string;
  }>;
  spare_parts_consumption: Array<{
    spare_part__id: number;
    spare_part__name: string;
    spare_part__unit: string;
    usage_count: number;
    total_qty_used: string;
    total_cost_usd: string | null;
  }>;
}
