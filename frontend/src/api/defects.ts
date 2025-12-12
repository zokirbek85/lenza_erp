import http from '../app/http';
import type {
  DefectType,
  DefectTypeCreate,
  DefectTypeUpdate,
  ProductDefect,
  ProductDefectListItem,
  ProductDefectCreate,
  ProductDefectUpdate,
  DefectRepairRequest,
  DefectDisposeRequest,
  DefectSellOutletRequest,
  DefectStatusChangeRequest,
  DefectAuditLog,
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
// PRODUCT DEFECTS
// ============================================================================

export const getProductDefects = (params?: DefectFilters) =>
  http.get<PaginatedDefectsResponse>('/defects/', { params });

export const getProductDefect = (id: number) =>
  http.get<ProductDefect>(`/defects/${id}/`);

export const createProductDefect = (data: ProductDefectCreate) =>
  http.post<ProductDefect>('/defects/', data);

export const updateProductDefect = (id: number, data: ProductDefectUpdate) =>
  http.patch<ProductDefect>(`/defects/${id}/`, data);

export const deleteProductDefect = (id: number) =>
  http.delete(`/defects/${id}/`);

// ============================================================================
// CUSTOM ACTIONS
// ============================================================================

/**
 * Repair defective product
 * POST /defects/{id}/repair/
 */
export const repairDefect = (id: number, data: DefectRepairRequest) =>
  http.post<ProductDefect>(`/defects/${id}/repair/`, data);

/**
 * Dispose non-repairable defect
 * POST /defects/{id}/dispose/
 */
export const disposeDefect = (id: number, data: DefectDisposeRequest) =>
  http.post<ProductDefect>(`/defects/${id}/dispose/`, data);

/**
 * Sell defective product at outlet
 * POST /defects/{id}/sell_outlet/
 */
export const sellOutletDefect = (id: number, data: DefectSellOutletRequest) =>
  http.post<ProductDefect>(`/defects/${id}/sell_outlet/`, data);

/**
 * Change defect status
 * POST /defects/{id}/change_status/
 */
export const changeDefectStatus = (id: number, data: DefectStatusChangeRequest) =>
  http.post<ProductDefect>(`/defects/${id}/change_status/`, data);

/**
 * Get defect statistics
 * GET /defects/statistics/
 */
export const getDefectStatistics = (params?: { start_date?: string; end_date?: string }) =>
  http.get<DefectStatistics>('/defects/statistics/', { params });

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
 * Export defects to Excel
 * GET /defects/export/
 */
export const exportDefects = async (params?: DefectFilters) => {
  const response = await http.get('/defects/export/', {
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
