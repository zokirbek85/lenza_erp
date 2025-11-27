import http from '../app/http';
import { toArray } from '../utils/api';

export type BrandOption = { id: number; name: string };
export type CategoryOption = { id: number; name: string };

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
