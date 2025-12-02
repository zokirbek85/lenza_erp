import { create } from 'zustand';

import http from '../app/http';
import { toArray } from '../utils/api';

export interface OrderProduct {
  id: number;
  name: string;
  sell_price_usd: number;
  stock_ok?: number;
  // stock_defect removed - order creation only uses good stock (stock_ok)
  total_stock?: number;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
}

export interface OrderItem {
  product: number;
  productName: string;
  qty: number;
  price_usd: number;
}

const clampQty = (qty: number): number => {
  if (!Number.isFinite(qty)) {
    return 0;
  }
  return Number(qty.toFixed(2));
};

interface FiltersState {
  brandId?: string;
  categoryId?: string;
}

export interface OrderState {
  filters: FiltersState;
  products: OrderProduct[];
  selectedItems: OrderItem[];
  selectedProduct?: OrderProduct | null;
  setFilters: (filters: Partial<FiltersState>) => void;
  setSelectedItems: (items: OrderItem[]) => void;
  setSelectedProduct: (product: OrderProduct | null) => void;
  fetchProducts: (searchText?: string) => Promise<void>;
  addItem: (item: OrderItem) => void;
  updateItem: (productId: number, payload: Partial<Pick<OrderItem, 'qty' | 'price_usd'>>) => void;
  removeItem: (productId: number) => void;
  clearOrder: () => void;
}

const DRAFT_KEY = 'draftOrder';

export const useOrderStore = create<OrderState>((set, get) => ({
  filters: {},
  products: [],
  selectedItems: [],
  selectedProduct: null,
  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  setSelectedItems: (items) => set({ selectedItems: items }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  fetchProducts: async (searchText = '') => {
    const { filters } = get();
    const params: Record<string, string> = { limit: 'all' };
    if (filters.brandId) params.brand = filters.brandId;
    if (filters.categoryId) params.category = filters.categoryId;
    if (searchText.trim()) params.search = searchText.trim();
    const response = await http.get('/products/', { params });
    set({ products: toArray<OrderProduct>(response.data) });
  },
  addItem: (item) =>
    set((state) => {
      const incomingQty = clampQty(item.qty);
      const existing = state.selectedItems.find((entry) => entry.product === item.product);
      if (existing) {
        return {
          selectedItems: state.selectedItems.map((entry) =>
            entry.product === item.product
              ? { ...entry, qty: clampQty(entry.qty + incomingQty), price_usd: item.price_usd }
              : entry
          ),
        };
      }
      return { selectedItems: [...state.selectedItems, { ...item, qty: incomingQty }] };
    }),
  updateItem: (productId, payload) =>
    set((state) => ({
      selectedItems: state.selectedItems.map((entry) =>
        entry.product === productId
          ? {
              ...entry,
              ...payload,
              ...(payload.qty !== undefined ? { qty: clampQty(payload.qty) } : {}),
            }
          : entry
      ),
    })),
  removeItem: (productId) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter((entry) => entry.product !== productId),
    })),
  clearOrder: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_KEY);
    }
    set({
      selectedItems: [],
      selectedProduct: null,
    });
  },
}));

export const saveDraftOrder = (items: OrderItem[]) => {
  if (typeof window === 'undefined') return;
  if (!items.length) {
    window.localStorage.removeItem(DRAFT_KEY);
  } else {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(items));
  }
};

export const loadDraftOrder = (): OrderItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrderItem[];
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => Number.isFinite(item?.product) && Number.isFinite(item?.qty))
        .map((item) => ({
          ...item,
          qty: clampQty(Number(item.qty) || 1),
          price_usd: Number(item.price_usd) || 0,
        }));
    }
  } catch {
    // ignore invalid draft
  }
  return [];
};

