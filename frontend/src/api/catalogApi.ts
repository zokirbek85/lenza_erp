import http from '../app/http';
import { toArray } from '../utils/api';

export type BrandOption = { id: number; name: string };
export type CategoryOption = { id: number; name: string };
export type StyleOption = { id: number; name: string; description?: string; is_active?: boolean };

export const fetchBrands = async (dealerId?: number | string) => {
  const params: Record<string, string | number> = { limit: 'all' };
  if (dealerId) params.dealer_id = dealerId;
  const response = await http.get('/brands/', { params });
  return toArray<BrandOption>(response.data);
};

export const fetchCategories = async (brandId?: number | string, dealerId?: number | string) => {
  const params: Record<string, string | number> = { limit: 'all' };
  if (brandId) {
    params.brand_id = brandId;
  }
  if (dealerId) {
    params.dealer_id = dealerId;
  }
  const response = await http.get('/categories/', { params });
  return toArray<CategoryOption>(response.data);
};

export const fetchStyles = async () => {
  const response = await http.get('/styles/', { params: { limit: 'all' } });
  return toArray<StyleOption>(response.data);
};

export const createStyle = async (data: { name: string; description?: string; is_active?: boolean }) => {
  const response = await http.post('/styles/', data);
  return response.data;
};

export const updateStyle = async (id: number, data: { name?: string; description?: string; is_active?: boolean }) => {
  const response = await http.put(`/styles/${id}/`, data);
  return response.data;
};

export const deleteStyle = async (id: number) => {
  const response = await http.delete(`/styles/${id}/`);
  return response.data;
};
