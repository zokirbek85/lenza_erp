import http from '../app/http';
import { toArray } from '../utils/api';

export type ProductPayload = {
  sku: string;
  name: string;
  brand_id: number | null;
  category_id: number | null;
  sell_price_usd: number;
  cost_usd?: number;
  stock_ok: number;
  stock_defect: number;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  brand: { id: number; name: string } | null;
  category: { id: number; name: string } | null;
  sell_price_usd: number;
  stock_ok: number;
  stock_defect: number;
  availability_status: string;
};

type PaginatedResponse<T> = {
  count?: number;
  results?: T[];
};

export const fetchProducts = async (params: Record<string, string | number>) => {
  const response = await http.get<PaginatedResponse<Product>>('/products/', { params });
  const data = response.data;
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return {
      items: data.results,
      total: Number(data.count) || data.results.length || 0,
    };
  }
  const fallback = toArray<Product>(data);
  return { items: fallback, total: fallback.length };
};

export const createProduct = async (payload: ProductPayload) => {
  const response = await http.post<Product>('/products/', payload);
  return response.data;
};

export const updateProduct = async (id: number, payload: ProductPayload) => {
  const response = await http.put<Product>(`/products/${id}/`, payload);
  return response.data;
};

export const deleteProduct = async (id: number) => {
  await http.delete(`/products/${id}/`);
};

export const adjustProductStock = async (
  id: number,
  payload: Partial<Pick<ProductPayload, 'stock_ok' | 'stock_defect'>>
) => {
  const response = await http.patch<Product>(`/products/${id}/adjust/`, payload);
  return response.data;
};

export const fetchProductsByCategory = async (categoryId?: number | string, search?: string) => {
  const params: Record<string, string | number> = { limit: 'all' };
  if (categoryId) params.category = categoryId;
  if (search) params.search = search;
  const response = await http.get('/products/', { params });
  return toArray<Product>(response.data);
};

