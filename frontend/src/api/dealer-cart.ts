/**
 * API functions for dealer shopping cart
 */
import axios from 'axios';

const BASE_URL = '/api/dealer-portal';

export interface CartItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  product_price: number;
  product_stock: number;
  product_unit: string;
  quantity: number;
  subtotal: number;
  added_at: string;
  updated_at: string;
}

export interface Cart {
  id: number;
  dealer: number;
  items: CartItem[];
  total_items: number;
  total_quantity: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface AddToCartRequest {
  product_id: number;
  quantity: number;
}

export interface SubmitOrderRequest {
  note?: string;
}

export interface SubmitOrderResponse {
  message: string;
  order_id: number;
  order_number: string;
}

/**
 * Get current dealer's cart
 */
export const getCart = async (): Promise<Cart> => {
  const response = await axios.get(`${BASE_URL}/cart/`, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * Add product to cart
 */
export const addToCart = async (data: AddToCartRequest): Promise<{ message: string; cart: Cart }> => {
  const response = await axios.post(`${BASE_URL}/cart/add_item/`, data, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (itemId: number, quantity: number): Promise<{ message: string; item: CartItem }> => {
  const response = await axios.patch(`${BASE_URL}/cart-items/${itemId}/`, { quantity }, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * Remove item from cart
 */
export const removeCartItem = async (itemId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${BASE_URL}/cart-items/${itemId}/`, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * Clear all items from cart
 */
export const clearCart = async (): Promise<{ message: string }> => {
  const response = await axios.delete(`${BASE_URL}/cart/clear/`, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * Submit cart as order
 */
export const submitOrder = async (data: SubmitOrderRequest): Promise<SubmitOrderResponse> => {
  const response = await axios.post(`${BASE_URL}/cart/submit_order/`, data, {
    withCredentials: true,
  });
  return response.data;
};
