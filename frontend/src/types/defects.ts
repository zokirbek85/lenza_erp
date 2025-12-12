// ============================================================================
// DEFECT TYPES
// ============================================================================

export type DefectStatus = 'pending' | 'under_repair' | 'repaired' | 'disposed' | 'sold_outlet';

export type DefectCategory = 'repairable' | 'non_repairable';

export type DefectAuditAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'repaired' | 'disposed' | 'sold_outlet';

// ============================================================================
// DEFECT TYPE (Reference)
// ============================================================================

export interface DefectType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DefectTypeCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface DefectTypeUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// ============================================================================
// DEFECT DETAIL (inside ProductDefect)
// ============================================================================

export interface DefectDetail {
  type_id: number;
  type_name?: string;
  type_description?: string;
  qty: number;
}

export interface RepairMaterial {
  product_id: number;
  product_name?: string;
  product_sku?: string;
  qty: number;
}

// ============================================================================
// PRODUCT DEFECT
// ============================================================================

export interface ProductDefect {
  id: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  product_image?: string | null;
  product_price_usd?: number;
  qty: number;
  repairable_qty: number;
  non_repairable_qty: number;
  defect_details: DefectDetail[];
  defect_details_enriched?: DefectDetail[];
  status: DefectStatus;
  status_display?: string;
  description: string;
  repair_materials: RepairMaterial[];
  repair_completed_at: string | null;
  disposed_at: string | null;
  sold_outlet_at: string | null;
  created_by: number | null;
  created_by_name?: string;
  updated_by: number | null;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductDefectListItem {
  id: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  product_image?: string | null;
  qty: number;
  repairable_qty: number;
  non_repairable_qty: number;
  status: DefectStatus;
  status_display?: string;
  defect_summary?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductDefectCreate {
  product: number;
  qty: number;
  repairable_qty: number;
  non_repairable_qty: number;
  defect_details?: DefectDetail[];
  description?: string;
}

export interface ProductDefectUpdate {
  qty?: number;
  repairable_qty?: number;
  non_repairable_qty?: number;
  defect_details?: DefectDetail[];
  description?: string;
  status?: DefectStatus;
}

// ============================================================================
// DEFECT ACTIONS
// ============================================================================

export interface DefectRepairRequest {
  quantity: number;
  materials?: RepairMaterial[];
  description?: string;
}

export interface DefectDisposeRequest {
  quantity: number;
  description?: string;
}

export interface DefectSellOutletRequest {
  quantity: number;
  sale_price_usd: number;
  description?: string;
}

export interface DefectStatusChangeRequest {
  status: DefectStatus;
  description?: string;
}

// ============================================================================
// DEFECT AUDIT LOG
// ============================================================================

export interface DefectAuditLog {
  id: number;
  defect: number;
  action: DefectAuditAction;
  action_display?: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  description: string;
  user: number | null;
  user_name?: string;
  created_at: string;
}

// ============================================================================
// DEFECT STATISTICS
// ============================================================================

export interface DefectStatistics {
  totals: {
    total_defects: number;
    total_qty: number;
    total_repairable: number;
    total_non_repairable: number;
  };
  by_status: {
    status: DefectStatus;
    count: number;
    qty_sum: number;
  }[];
  by_product: {
    product__id: number;
    product__name: string;
    product__sku: string;
    defect_count: number;
    defect_qty: number;
  }[];
  by_defect_type: {
    type_name: string;
    total_qty: number;
  }[];
}

// ============================================================================
// FILTERS & PAGINATION
// ============================================================================

export interface DefectFilters {
  product?: number;
  status?: DefectStatus;
  created_by?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedDefectsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductDefectListItem[];
}

export interface PaginatedDefectTypesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DefectType[];
}

export interface PaginatedAuditLogsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DefectAuditLog[];
}
