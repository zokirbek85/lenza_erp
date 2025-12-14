import http from '../app/http';
import type {
  DefectType,
  DefectTypeCreate,
  DefectTypeUpdate,
  ProductDefect,
  // ProductDefectCreate, // Disabled for stock-based defects
  // ProductDefectUpdate, // Disabled for stock-based defects
  // DefectRepairRequest, // Disabled for stock-based defects
  // DefectDisposeRequest, // Disabled for stock-based defects
  // DefectSellOutletRequest, // Disabled for stock-based defects
  // DefectStatusChangeRequest, // Disabled for stock-based defects
  DefectStatistics,
  DefectFilters,
  PaginatedDefectsResponse,
  PaginatedDefectTypesResponse,
  PaginatedAuditLogsResponse,
} from '../types/defects';

// ============================================================================
// DEFECT TYPES (Reference)
// ============================================================================

export const getDefectTypes = (params?: { is_active?: boolean; search?: string; page?: number; page_size?: number }) =>
  http.get<PaginatedDefectTypesResponse>('/defects/types/', { params });

export const getDefectType = (id: number) =>
  http.get<DefectType>(`/defects/types/${id}/`);

export const createDefectType = (data: DefectTypeCreate) =>
  http.post<DefectType>('/defects/types/', data);

export const updateDefectType = (id: number, data: DefectTypeUpdate) =>
  http.patch<DefectType>(`/defects/types/${id}/`, data);

export const deleteDefectType = (id: number) =>
  http.delete(`/defects/types/${id}/`);

// ============================================================================
// PRODUCT DEFECTS (Stock-based)
// ============================================================================

/**
 * Get products with stock_defect > 0
 * This queries the Product table directly, not a separate defects table
 */
export const getProductDefects = (params?: DefectFilters) =>
  http.get<PaginatedDefectsResponse>('/defects/stock/', { params });

export const getProductDefect = (id: number) =>
  http.get<ProductDefect>(`/defects/stock/${id}/`);

/**
 * NOTE: The following operations are disabled for stock-based defects.
 * Defects are managed by editing Product.stock_defect directly.
 * Use the Products module to adjust defect quantities.
 */

// DISABLED: Stock-based defects are read-only
// export const createProductDefect = (data: ProductDefectCreate) =>
//   http.post<ProductDefect>('/defects/', data);

// DISABLED: Stock-based defects are read-only
// export const updateProductDefect = (id: number, data: ProductDefectUpdate) =>
//   http.patch<ProductDefect>(`/defects/${id}/`, data);

// DISABLED: Stock-based defects are read-only
// export const deleteProductDefect = (id: number) =>
//   http.delete(`/defects/${id}/`);

// ============================================================================
// CUSTOM ACTIONS (DISABLED for stock-based defects)
// ============================================================================

/**
 * NOTE: These operations are for the legacy ProductDefect model.
 * For stock-based defects, manage quantities through the Products module.
 */

// DISABLED: Not applicable for stock-based defects
// export const repairDefect = (id: number, data: DefectRepairRequest) =>
//   http.post<ProductDefect>(`/defects/${id}/repair/`, data);

// DISABLED: Not applicable for stock-based defects
// export const disposeDefect = (id: number, data: DefectDisposeRequest) =>
//   http.post<ProductDefect>(`/defects/${id}/dispose/`, data);

// DISABLED: Not applicable for stock-based defects
// export const sellOutletDefect = (id: number, data: DefectSellOutletRequest) =>
//   http.post<ProductDefect>(`/defects/${id}/sell_outlet/`, data);

// DISABLED: Not applicable for stock-based defects
// export const changeDefectStatus = (id: number, data: DefectStatusChangeRequest) =>
//   http.post<ProductDefect>(`/defects/${id}/change_status/`, data);

/**
 * Get defect statistics from stock-based defects
 * GET /defects/stock/statistics/
 */
export const getDefectStatistics = (params?: { start_date?: string; end_date?: string }) =>
  http.get<DefectStatistics>('/defects/stock/statistics/', { params });

/**
 * Get audit logs for a defect
 * GET /defects/{id}/audit_logs/
 */
export const getDefectAuditLogs = (id: number, params?: { page?: number; page_size?: number }) =>
  http.get<PaginatedAuditLogsResponse>(`/defects/${id}/audit_logs/`, { params });

/**
 * Get all audit logs
 * GET /defects/audit-logs/
 */
export const getAllAuditLogs = (params?: { defect?: number; action?: string; user?: number; page?: number; page_size?: number }) =>
  http.get<PaginatedAuditLogsResponse>('/defects/audit-logs/', { params });

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export defects to Excel from stock-based data
 * GET /defects/stock/export/
 */
export const exportDefects = async (params?: DefectFilters) => {
  const response = await http.get('/defects/stock/export/', {
    params,
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `defects_${new Date().toISOString().split('T')[0]}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
