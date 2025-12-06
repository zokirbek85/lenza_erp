import http from '../app/http';
import { toArray } from '../utils/api';

export type ReturnItemPayload = {
  product_id: number;
  brand_id?: number | null;
  category_id?: number | null;
  quantity: number;
  status: 'healthy' | 'defect';
  comment?: string;
};

export type ReturnPayload = {
  dealer: number;
  items: ReturnItemPayload[];
  general_comment?: string;
};

export type ReturnItem = {
  id: number;
  product_id: number;
  product_name: string;
  brand_name?: string;
  category_name?: string;
  quantity: number;
  status: ReturnItemPayload['status'];
  comment?: string;
};

export type ReturnRecord = {
  id: number;
  dealer: number;
  dealer_name: string;
  items: ReturnItem[];
  general_comment?: string;
  status: string;
  status_display?: string;
  total_sum: number;
  created_at: string;
};

export const createReturn = async (payload: ReturnPayload) => {
  const response = await http.post<ReturnRecord>('/returns/', payload);
  return response.data;
};

export const fetchReturns = async () => {
  const response = await http.get('/returns/');
  const data = response.data;
  const records = toArray<ReturnRecord>(data.results ?? data);
  return records;
};

export const fetchReturnById = async (id: number): Promise<ReturnRecord> => {
  const response = await http.get<ReturnRecord>(`/returns/${id}/`);
  return response.data;
};

export const updateReturn = async (id: number, payload: ReturnPayload): Promise<ReturnRecord> => {
  try {
    const response = await http.put<ReturnRecord>(`/returns/${id}/`, payload);
    return response.data;
  } catch (error: any) {
    // Log detailed error for debugging
    console.error('Update return failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      payload,
    });
    throw error;
  }
};

export const deleteReturn = async (id: number): Promise<void> => {
  await http.delete(`/returns/${id}/`);
};

export const exportReturnPdf = async (id: number): Promise<void> => {
  const response = await http.get(`/returns/${id}/export-pdf/`, {
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `return_${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

