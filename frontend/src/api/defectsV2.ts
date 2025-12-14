/**
 * Defects V2 API Service
 * Handles all API calls for the new defects management system
 */

import http from '../app/http';
import type {
  DefectBatchV2,
  DefectBatchListItem,
  DefectBatchDetail,
  CreateDefectBatchData,
  InspectBatchData,
  RepairDefectData,
  WriteOffDefectData,
  DefectTypeV2,
  SparePartV2,
  DefectRepairV2,
  DefectWriteOffV2,
  DefectAuditLogV2,
  DefectStatistics,
  DefectBatchFilters,
  PaginatedResponse,
} from '../types/defectsV2';

const BASE_URL = '/defects-v2';

// ============================================================================
// Defect Types
// ============================================================================

export const getDefectTypes = async (): Promise<DefectTypeV2[]> => {
  const response = await http.get<PaginatedResponse<DefectTypeV2>>(`${BASE_URL}/types/`);
  return response.data.results;
};

export const createDefectType = async (data: Partial<DefectTypeV2>): Promise<DefectTypeV2> => {
  const response = await http.post<DefectTypeV2>(`${BASE_URL}/types/`, data);
  return response.data;
};

export const updateDefectType = async (id: number, data: Partial<DefectTypeV2>): Promise<DefectTypeV2> => {
  const response = await http.put<DefectTypeV2>(`${BASE_URL}/types/${id}/`, data);
  return response.data;
};

export const deleteDefectType = async (id: number): Promise<void> => {
  await http.delete(`${BASE_URL}/types/${id}/`);
};

// ============================================================================
// Spare Parts
// ============================================================================

export const getSpareParts = async (params?: { is_active?: boolean; search?: string }): Promise<PaginatedResponse<SparePartV2>> => {
  const response = await http.get<PaginatedResponse<SparePartV2>>(`${BASE_URL}/spare-parts/`, { params });
  return response.data;
};

export const getSparePart = async (id: number): Promise<SparePartV2> => {
  const response = await http.get<SparePartV2>(`${BASE_URL}/spare-parts/${id}/`);
  return response.data;
};

export const createSparePart = async (data: Partial<SparePartV2>): Promise<SparePartV2> => {
  const response = await http.post<SparePartV2>(`${BASE_URL}/spare-parts/`, data);
  return response.data;
};

export const updateSparePart = async (id: number, data: Partial<SparePartV2>): Promise<SparePartV2> => {
  const response = await http.put<SparePartV2>(`${BASE_URL}/spare-parts/${id}/`, data);
  return response.data;
};

export const deleteSparePart = async (id: number): Promise<void> => {
  await http.delete(`${BASE_URL}/spare-parts/${id}/`);
};

export const getLowStockSpareParts = async (): Promise<SparePartV2[]> => {
  const response = await http.get<SparePartV2[]>(`${BASE_URL}/spare-parts/low-stock/`);
  return response.data;
};

// ============================================================================
// Defect Batches
// ============================================================================

export const getDefectBatches = async (params?: DefectBatchFilters): Promise<PaginatedResponse<DefectBatchListItem>> => {
  const response = await http.get<PaginatedResponse<DefectBatchListItem>>(`${BASE_URL}/batches/`, { params });
  return response.data;
};

export const getDefectBatch = async (id: number): Promise<DefectBatchDetail> => {
  const response = await http.get<DefectBatchDetail>(`${BASE_URL}/batches/${id}/`);
  return response.data;
};

export const createDefectBatch = async (data: CreateDefectBatchData): Promise<DefectBatchDetail> => {
  const response = await http.post<DefectBatchDetail>(`${BASE_URL}/batches/`, data);
  return response.data;
};

export const updateDefectBatch = async (id: number, data: Partial<DefectBatchV2>): Promise<DefectBatchDetail> => {
  const response = await http.patch<DefectBatchDetail>(`${BASE_URL}/batches/${id}/`, data);
  return response.data;
};

export const inspectBatch = async (id: number, data: InspectBatchData): Promise<DefectBatchDetail> => {
  const response = await http.post<DefectBatchDetail>(`${BASE_URL}/batches/${id}/inspect/`, data);
  return response.data;
};

export const repairDefect = async (id: number, data: RepairDefectData): Promise<DefectBatchDetail> => {
  const response = await http.post<DefectBatchDetail>(`${BASE_URL}/batches/${id}/repair/`, data);
  return response.data;
};

export const writeOffDefect = async (id: number, data: WriteOffDefectData): Promise<DefectBatchDetail> => {
  const response = await http.post<DefectBatchDetail>(`${BASE_URL}/batches/${id}/write-off/`, data);
  return response.data;
};

export const completeBatch = async (id: number): Promise<DefectBatchDetail> => {
  const response = await http.post<DefectBatchDetail>(`${BASE_URL}/batches/${id}/complete/`);
  return response.data;
};

export const getDefectBatchAuditLog = async (id: number): Promise<DefectAuditLogV2[]> => {
  const response = await http.get<DefectAuditLogV2[]>(`${BASE_URL}/batches/${id}/audit-log/`);
  return response.data;
};

// ============================================================================
// Repairs
// ============================================================================

export const getRepairs = async (params?: { batch?: number; status?: string }): Promise<PaginatedResponse<DefectRepairV2>> => {
  const response = await http.get<PaginatedResponse<DefectRepairV2>>(`${BASE_URL}/repairs/`, { params });
  return response.data;
};

export const getRepair = async (id: number): Promise<DefectRepairV2> => {
  const response = await http.get<DefectRepairV2>(`${BASE_URL}/repairs/${id}/`);
  return response.data;
};

// ============================================================================
// Write-Offs
// ============================================================================

export const getWriteOffs = async (params?: { batch?: number; reason?: string }): Promise<PaginatedResponse<DefectWriteOffV2>> => {
  const response = await http.get<PaginatedResponse<DefectWriteOffV2>>(`${BASE_URL}/write-offs/`, { params });
  return response.data;
};

export const getWriteOff = async (id: number): Promise<DefectWriteOffV2> => {
  const response = await http.get<DefectWriteOffV2>(`${BASE_URL}/write-offs/${id}/`);
  return response.data;
};

// ============================================================================
// Analytics
// ============================================================================

export const getDefectStatistics = async (params?: {
  start_date?: string;
  end_date?: string;
  product_id?: number;
  warehouse_name?: string;
  status?: string;
}): Promise<DefectStatistics> => {
  const response = await http.get<DefectStatistics>(`${BASE_URL}/analytics/statistics/`, { params });
  return response.data;
};

export const exportDefectStatistics = async (params?: {
  start_date?: string;
  end_date?: string;
  product_id?: number;
  warehouse_name?: string;
  status?: string;
}): Promise<Blob> => {
  const response = await http.get(`${BASE_URL}/analytics/export-excel/`, {
    params,
    responseType: 'blob',
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `defect-statistics-${new Date().toISOString().split('T')[0]}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();

  return response.data;
};
