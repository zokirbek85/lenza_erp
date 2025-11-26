import http from '../app/http';
import type { DashboardFilters } from '../store/useDashboardStore';
import type { DebtAnalytics } from '@/types/dashboard';

export interface DashboardSummary {
  total_sales: number;
  net_profit: number;
  cash_balance: number;
  open_orders_count: number;
  satisfaction_score: number;
  total_debt_usd: number;
  products?: number;
  dealers?: number;
  overdue_receivables: Array<{
    id: number;
    dealer_name: string;
    days_overdue: number;
    amount_usd: number;
  }>;
  revenue_by_month: Array<{ month: string; total: number }>;
  revenue_by_product: Array<{ category: string; revenue: number }>;
  inventory_trend: Array<{ date: string; stock_value: number }>;
  expenses_vs_budget: { expenses: number; budget: number };
}

/**
 * Normalize dashboard summary response to ensure all fields have safe defaults
 */
const normalizeDashboardSummary = (data: any): DashboardSummary => {
  return {
    total_sales: typeof data?.total_sales === 'number' ? data.total_sales : 0,
    net_profit: typeof data?.net_profit === 'number' ? data.net_profit : 0,
    cash_balance: typeof data?.cash_balance === 'number' ? data.cash_balance : 0,
    open_orders_count: typeof data?.open_orders_count === 'number' ? data.open_orders_count : 0,
    satisfaction_score: typeof data?.satisfaction_score === 'number' ? data.satisfaction_score : 0,
    total_debt_usd: typeof data?.total_debt_usd === 'number' ? data.total_debt_usd : 0,
    products: typeof data?.products === 'number' ? data.products : 0,
    dealers: typeof data?.dealers === 'number' ? data.dealers : 0,
    overdue_receivables: Array.isArray(data?.overdue_receivables) ? data.overdue_receivables : [],
    revenue_by_month: Array.isArray(data?.revenue_by_month) ? data.revenue_by_month : [],
    revenue_by_product: Array.isArray(data?.revenue_by_product) ? data.revenue_by_product : [],
    inventory_trend: Array.isArray(data?.inventory_trend) ? data.inventory_trend : [],
    expenses_vs_budget: data?.expenses_vs_budget ?? { expenses: 0, budget: 100000 },
  };
};

/**
 * Fetch comprehensive dashboard summary with all KPIs and chart data
 */
export const fetchDashboardSummary = async (filters: DashboardFilters): Promise<DashboardSummary> => {
  const params = new URLSearchParams();

  if (filters.dealers.length > 0) {
    params.append('dealer', filters.dealers.join(','));
  }
  if (filters.region !== undefined) {
    params.append('region', String(filters.region));
  }
  if (filters.manager !== undefined) {
    params.append('manager', String(filters.manager));
  }
  if (filters.dateRange && filters.dateRange.length === 2) {
    params.append('from', filters.dateRange[0]);
    params.append('to', filters.dateRange[1]);
  }

  const queryString = params.toString();
  const url = queryString ? `/dashboard/summary/?${queryString}` : '/dashboard/summary/';

  const response = await http.get<DashboardSummary>(url);
  return normalizeDashboardSummary(response.data);
};

export const fetchDebtAnalytics = () => http.get<DebtAnalytics>('/dashboard/debt-analytics/');

/**
 * Fetch dashboard KPI data with optional filters
 */
export const fetchDashboardData = async (filters: DashboardFilters) => {
  const params = new URLSearchParams();

  if (filters.dealers.length > 0) {
    params.append('dealer', filters.dealers.join(','));
  }
  if (filters.region !== undefined) {
    params.append('region', String(filters.region));
  }
  if (filters.manager !== undefined) {
    params.append('manager', String(filters.manager));
  }
  if (filters.dateRange && filters.dateRange.length === 2) {
    params.append('from', filters.dateRange[0]);
    params.append('to', filters.dateRange[1]);
  }

  const queryString = params.toString();
  const url = queryString ? `/kpis/owner/?${queryString}` : '/kpis/owner/';

  return http.get(url);
};

/**
 * Fetch sales manager KPI with filters
 */
export const fetchSalesManagerData = async (filters: DashboardFilters) => {
  const params = new URLSearchParams();

  if (filters.dealers.length > 0) {
    params.append('dealer', filters.dealers.join(','));
  }
  if (filters.region !== undefined) {
    params.append('region', String(filters.region));
  }
  if (filters.dateRange && filters.dateRange.length === 2) {
    params.append('from', filters.dateRange[0]);
    params.append('to', filters.dateRange[1]);
  }

  const queryString = params.toString();
  const url = queryString ? `/kpis/sales-manager/?${queryString}` : '/kpis/sales-manager/';

  return http.get(url);
};

/**
 * Fetch accountant KPI with filters
 */
export const fetchAccountantData = async (filters: DashboardFilters) => {
  const params = new URLSearchParams();

  if (filters.dealers.length > 0) {
    params.append('dealer', filters.dealers.join(','));
  }
  if (filters.region !== undefined) {
    params.append('region', String(filters.region));
  }
  if (filters.dateRange && filters.dateRange.length === 2) {
    params.append('from', filters.dateRange[0]);
    params.append('to', filters.dateRange[1]);
  }

  const queryString = params.toString();
  const url = queryString ? `/kpis/accountant/?${queryString}` : '/kpis/accountant/';

  return http.get(url);
};

/**
 * Fetch currency rate history with optional date range filter
 */
export const fetchCurrencyHistory = async (filters: DashboardFilters) => {
  const params = new URLSearchParams();

  if (filters.dateRange && filters.dateRange.length === 2) {
    params.append('from', filters.dateRange[0]);
    params.append('to', filters.dateRange[1]);
  }

  const queryString = params.toString();
  const url = queryString ? `/payments/rates/history/?${queryString}` : '/payments/rates/history/';

  const response = await http.get(url);
  // Normalize: ensure we always return an array
  return {
    ...response,
    data: Array.isArray(response.data) ? response.data : [],
  };
};

/**
 * Fetch card payments KPI per active company card
 */
export interface CardKPIItem {
  card_id: number;
  card_name: string;
  holder_name: string;
  total_amount: number;
  payments_count: number;
  last_payment_date?: string | null;
}

export const fetchCardsKpi = async (filters: DashboardFilters) => {
  const params = new URLSearchParams();
  if (filters.dateRange && filters.dateRange.length === 2) {
    params.append('from', filters.dateRange[0]);
    params.append('to', filters.dateRange[1]);
  }
  const queryString = params.toString();
  const url = queryString ? `/kpi/cards/?${queryString}` : '/kpi/cards/';
  const response = await http.get<CardKPIItem[]>(url);
  // Normalize: ensure we always return an array
  return {
    ...response,
    data: Array.isArray(response.data) ? response.data : [],
  };
};

/**
 * Fetch inventory statistics (total healthy stock quantity and value in USD)
 */
export interface InventoryStats {
  total_quantity: number;
  total_value_usd: number;
}

export const fetchInventoryStats = async () => {
  const response = await http.get<InventoryStats>('/kpi/inventory-stats/');
  // Normalize: ensure we always have valid numbers
  return {
    ...response,
    data: {
      total_quantity: typeof response.data?.total_quantity === 'number' ? response.data.total_quantity : 0,
      total_value_usd: typeof response.data?.total_value_usd === 'number' ? response.data.total_value_usd : 0,
    },
  };
};
