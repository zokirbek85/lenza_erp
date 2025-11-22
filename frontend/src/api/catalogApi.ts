import http from '../app/http';
import { toArray } from '../utils/api';

export type BrandOption = { id: number; name: string };
export type CategoryOption = { id: number; name: string };

export const fetchBrands = async () => {
  const response = await http.get('/brands/', { params: { limit: 'all' } });
  return toArray<BrandOption>(response.data);
};

export const fetchCategories = async (brandId?: number | string) => {
  const params: Record<string, string | number> = { limit: 'all' };
  if (brandId) {
    params.brand = brandId;
  }
  const response = await http.get('/categories/', { params });
  return toArray<CategoryOption>(response.data);
};

