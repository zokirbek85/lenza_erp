import http from '../app/http';
import { toArray } from '../utils/api';

export type InboundItem = {
  id?: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  brand_name?: string;
  quantity: number;
};

export type Inbound = {
  id: number;
  brand: number;
  brand_name: string;
  date: string;
  status: 'draft' | 'confirmed';
  comment: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  confirmed_at: string | null;
  items: InboundItem[];
  total_items: number;
  total_quantity: number;
};

export type InboundPayload = {
  brand: number;
  date: string;
  comment?: string;
  items: InboundItem[];
};

type PaginatedResponse<T> = {
  count?: number;
  results?: T[];
};

export const fetchInbounds = async (params?: Record<string, string | number>) => {
  const response = await http.get<PaginatedResponse<Inbound>>('/inbounds/', { params });
  const data = response.data;
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return {
      items: data.results,
      total: Number(data.count) || data.results.length || 0,
    };
  }
  const fallback = toArray<Inbound>(data);
  return { items: fallback, total: fallback.length };
};

export const fetchInbound = async (id: number) => {
  const response = await http.get<Inbound>(`/inbounds/${id}/`);
  return response.data;
};

export const createInbound = async (payload: InboundPayload) => {
  const response = await http.post<Inbound>('/inbounds/', payload);
  return response.data;
};

export const updateInbound = async (id: number, payload: Partial<InboundPayload>) => {
  const response = await http.patch<Inbound>(`/inbounds/${id}/`, payload);
  return response.data;
};

export const deleteInbound = async (id: number) => {
  await http.delete(`/inbounds/${id}/`);
};

export const confirmInbound = async (id: number) => {
  const response = await http.post<Inbound>(`/inbounds/${id}/confirm/`);
  return response.data;
};

export const addInboundItem = async (id: number, item: InboundItem) => {
  const response = await http.post<Inbound>(`/inbounds/${id}/add_item/`, item);
  return response.data;
};

export const removeInboundItem = async (inboundId: number, itemId: number) => {
  const response = await http.delete<Inbound>(`/inbounds/${inboundId}/items/${itemId}/`);
  return response.data;
};
