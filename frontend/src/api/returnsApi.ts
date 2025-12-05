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
  const response = await http.put<ReturnRecord>(`/returns/${id}/`, payload);
  return response.data;
};

export const deleteReturn = async (id: number): Promise<void> => {
  await http.delete(`/returns/${id}/`);
};

