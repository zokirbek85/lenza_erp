import { create } from 'zustand';

export interface DashboardFilters {
  dealers: number[];
  region?: number;
  manager?: number;
  categories?: number[]; // Multiple category IDs for analytics filtering
  dateRange?: [string, string]; // ISO format: YYYY-MM-DD
}

interface DashboardState {
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  resetFilters: () => void;
}

const STORAGE_KEY = 'lenza_dashboard_filters';

const defaultFilters: DashboardFilters = {
  dealers: [],
  region: undefined,
  manager: undefined,
  categories: [],
  dateRange: undefined,
};

const loadFiltersFromStorage = (): DashboardFilters => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load dashboard filters from localStorage', error);
  }
  return defaultFilters;
};

const saveFiltersToStorage = (filters: DashboardFilters) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.warn('Failed to save dashboard filters to localStorage', error);
  }
};

export const useDashboardStore = create<DashboardState>((set) => ({
  filters: loadFiltersFromStorage(),
  setFilters: (filters) => {
    saveFiltersToStorage(filters);
    set({ filters });
  },
  resetFilters: () => {
    saveFiltersToStorage(defaultFilters);
    set({ filters: defaultFilters });
  },
}));
