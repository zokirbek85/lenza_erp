import http from '../app/http';
import { toArray } from '../utils/api';

export type ProductPayload = {
  sku: string;
  name: string;
  brand_id: number | null;
  category_id: number | null;
  style_id?: number | null;
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
  style?: { id: number; name: string; description?: string } | null;
  size?: string;
  sell_price_usd: number;
  current_price?: number;
  stock_ok: number;
  stock_defect: number;
  availability_status: string;
  image: string | null;
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

export const fetchProductsByCategory = async (options?: {
  categoryId?: number | string;
  brandId?: number | string;
  dealerId?: number | string;
  search?: string;
}) => {
  // If dealerId provided, prefer dealer-specific endpoint for full cascade
  if (options?.dealerId) {
    const response = await http.get(`/dealers/${options.dealerId}/products/`);
    return toArray<Product>(response.data);
  }

  const params: Record<string, string | number> = { limit: 'all' };
  if (options?.categoryId) params.category_id = options.categoryId;
  if (options?.brandId) params.brand_id = options.brandId;
  if (options?.search) params.search = options.search;
  const response = await http.get('/products/', { params });
  return toArray<Product>(response.data);
};

export const uploadProductImage = async (productId: number, imageFile: File): Promise<Product> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  const response = await http.post<Product>(`/products/${productId}/upload-image/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const removeProductImage = async (productId: number): Promise<Product> => {
  const response = await http.delete<Product>(`/products/${productId}/remove-image/`);
  return response.data;
};

// Catalog API (Old product-based - deprecated)
export type CatalogProduct = {
  id: number;
  name: string;
  brand_name: string;
  price_usd: string; // Decimal as string
  image: string | null;
  stock: {
    '400': number;
    '600': number;
    '700': number;
    '800': number;
    '900': number;
  };
};

export const fetchCatalogProducts = async (): Promise<CatalogProduct[]> => {
  const response = await http.get<CatalogProduct[]>('/catalog/');
  return Array.isArray(response.data) ? response.data : [];
};

// NEW: Variant-based Catalog API with Kit Komplektatsiya
export type DoorKitComponent = {
  id: number;
  component: number;
  component_sku: string;
  component_name: string;
  component_price_usd: number;
  quantity: number;
  total_price_usd: number;
};

export type VariantSize = {
  size: string;
  stock: number;
};

export type VariantCatalog = {
  id: number;
  brand: string;
  collection: string | null;
  model: string;
  color: string;
  door_type: string;
  door_type_display: string;
  image: string | null;
  
  // Three-tier pricing (komplektatsiya)
  polotno_price_usd: number | null;  // Door panel only
  kit_price_usd: number | null;       // Kit components (pogonaj)
  full_set_price_usd: number | null;  // Total = polotno + kit
  
  // Legacy field (backward compatibility)
  price_usd: number;
  price_uzs: number;
  
  // Sizes and stock
  sizes: VariantSize[];
  
  // Kit details
  kit_details: DoorKitComponent[];
  max_full_sets_by_stock: number | null;
};

export const fetchVariantCatalog = async (): Promise<VariantCatalog[]> => {
  const response = await http.get<{ count: number; results: VariantCatalog[] }>('/catalog/variants/');
  // Handle paginated response
  if (response.data && typeof response.data === 'object' && 'results' in response.data) {
    return Array.isArray(response.data.results) ? response.data.results : [];
  }
  // Fallback for non-paginated response
  return Array.isArray(response.data) ? response.data : [];
};
