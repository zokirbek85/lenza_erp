import http from '../app/http';

export interface ProductModel {
  id: number;
  brand: number;
  brand_name: string;
  model_name: string;
  collection: string;
  is_active: boolean;
}

export interface ProductSKU {
  id: number;
  variant: number;
  size: string;
  product: number;
  product_sku: string;
  product_name: string;
  price_usd: string;
  stock: string;
}

export interface Configuration {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: number;
  product_model: number;
  brand_name: string;
  collection: string;
  model_name: string;
  color: string;
  door_type: 'ПГ' | 'ПО' | 'ПДО' | 'ПДГ';
  door_type_display: string;
  sku: string;
  image?: string;
  configurations: Configuration[];
  is_active: boolean;
  skus?: ProductSKU[];
  created_at: string;
  updated_at: string;
}

export interface ProductVariantPayload {
  product_model: number;
  color: string;
  door_type: string;
  sku: string;
  image?: File | string;
  configurations: Configuration[];
  is_active: boolean;
}

export interface ProductVariantFilters {
  product_model?: number;
  door_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Fetch product variants with optional filters
 */
export async function fetchProductVariants(
  filters?: ProductVariantFilters
): Promise<PaginatedResponse<ProductVariant>> {
  const params = new URLSearchParams();
  
  if (filters?.product_model) params.append('product_model', filters.product_model.toString());
  if (filters?.door_type) params.append('door_type', filters.door_type);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.page_size) params.append('page_size', filters.page_size.toString());

  const response = await http.get<PaginatedResponse<ProductVariant>>(
    `/catalog/variants-detail/?${params.toString()}`
  );
  return response.data;
}

/**
 * Fetch a single product variant by ID
 */
export async function fetchProductVariant(id: number): Promise<ProductVariant> {
  const response = await http.get<ProductVariant>(`/catalog/variants-detail/${id}/`);
  return response.data;
}

/**
 * Create a new product variant
 */
export async function createProductVariant(data: ProductVariantPayload): Promise<ProductVariant> {
  const formData = new FormData();
  
  formData.append('product_model', data.product_model.toString());
  formData.append('color', data.color);
  formData.append('door_type', data.door_type);
  formData.append('is_active', data.is_active.toString());
  
  if (data.image && data.image instanceof File) {
    formData.append('image', data.image);
  }

  const response = await http.post<ProductVariant>('/catalog/variants-detail/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Update an existing product variant
 */
export async function updateProductVariant(
  id: number,
  data: Partial<ProductVariantPayload>
): Promise<ProductVariant> {
  const formData = new FormData();
  
  if (data.product_model !== undefined) formData.append('product_model', data.product_model.toString());
  if (data.color !== undefined) formData.append('color', data.color);
  if (data.door_type !== undefined) formData.append('door_type', data.door_type);
  if (data.is_active !== undefined) formData.append('is_active', data.is_active.toString());
  
  if (data.image && data.image instanceof File) {
    formData.append('image', data.image);
  }

  const response = await http.patch<ProductVariant>(`/catalog/variants-detail/${id}/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Delete a product variant
 */
export async function deleteProductVariant(id: number): Promise<void> {
  await http.delete(`/catalog/variants-detail/${id}/`);
}

/**
 * Upload image for a product variant
 */
export async function uploadVariantImage(id: number, image: File): Promise<ProductVariant> {
  const formData = new FormData();
  formData.append('image', image);

  const response = await http.post<ProductVariant>(
    `/catalog/variants-detail/${id}/upload-image/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

/**
 * Remove image from a product variant
 */
export async function removeVariantImage(id: number): Promise<ProductVariant> {
  const response = await http.delete<ProductVariant>(`/catalog/variants-detail/${id}/remove-image/`);
  return response.data;
}

/**
 * Fetch product models for select dropdown
 */
export async function fetchProductModels(search?: string): Promise<ProductModel[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  
  const response = await http.get<PaginatedResponse<ProductModel> | ProductModel[]>(
    `/catalog/models/?${params.toString()}`
  );
  
  // Handle both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results;
}
