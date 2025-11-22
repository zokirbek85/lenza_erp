import http from '../app/http';

export interface ExpenseType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  date: string;
  type: number;
  type_name?: string;
  method: 'cash' | 'card';
  card?: number | null;
  card_name?: string | null;
  currency: 'USD' | 'UZS';
  amount: number;
  amount_usd: number;
  amount_uzs: number;
  description?: string;
  status: 'pending' | 'approved';
  created_by: number;
  created_by_name?: string;
  approved_by?: number | null;
  approved_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseStats {
  today: { count: number; total_usd: number; total_uzs: number };
  week: { count: number; total_usd: number; total_uzs: number };
  month: { count: number; total_usd: number; total_uzs: number };
  total: { count: number; total_usd: number; total_uzs: number };
}

export interface ExpenseTrend {
  date: string;
  total_usd: number;
  total_uzs: number;
}

export interface ExpenseDistribution {
  type_name: string;
  total_usd: number;
  total_uzs: number;
  percentage: number;
}

export interface ExpenseFilters {
  date_from?: string;
  date_to?: string;
  type?: number;
  method?: 'cash' | 'card';
  card?: number;
  status?: 'pending' | 'approved';
  currency?: 'USD' | 'UZS';
  [key: string]: string | number | undefined;
}

// ========== EXPENSE TYPES ==========
export const fetchExpenseTypes = async (): Promise<ExpenseType[]> => {
  const response = await http.get('/expense-types/');
  return Array.isArray(response.data) ? response.data : [];
};

export const createExpenseType = async (data: Partial<ExpenseType>): Promise<ExpenseType> => {
  const response = await http.post('/expense-types/', data);
  return response.data;
};

export const updateExpenseType = async (id: number, data: Partial<ExpenseType>): Promise<ExpenseType> => {
  const response = await http.patch(`/expense-types/${id}/`, data);
  return response.data;
};

export const deleteExpenseType = async (id: number): Promise<void> => {
  await http.delete(`/expense-types/${id}/`);
};

// ========== EXPENSES ==========
export const fetchExpenses = async (filters?: ExpenseFilters): Promise<Expense[]> => {
  console.log('рџ”Ќ fetchExpenses called with filters:', filters);
  const response = await http.get('/expenses/', { params: filters });
  console.log('рџ“Ґ fetchExpenses response:', response.data);
  
  // DRF paginated response - {results: [], count: 0}
  if (response.data && typeof response.data === 'object' && Array.isArray(response.data.results)) {
    console.log('вњ… Found paginated results:', response.data.results.length, 'items');
    return response.data.results;
  }
  
  // Direct array response
  if (Array.isArray(response.data)) {
    console.log('вњ… Found direct array:', response.data.length, 'items');
    return response.data;
  }
  
  console.warn('вљ пёЏ Unexpected response format:', response.data);
  return [];
};

export const createExpense = async (data: Partial<Expense>): Promise<Expense> => {
  const response = await http.post('/expenses/', data);
  return response.data;
};

export const updateExpense = async (id: number, data: Partial<Expense>): Promise<Expense> => {
  const response = await http.patch(`/expenses/${id}/`, data);
  return response.data;
};

export const deleteExpense = async (id: number): Promise<void> => {
  await http.delete(`/expenses/${id}/`);
};

export const approveExpense = async (id: number): Promise<Expense> => {
  const response = await http.post(`/expenses/${id}/approve/`);
  return response.data;
};

// ========== STATISTICS ==========
export const fetchExpenseStats = async (): Promise<ExpenseStats> => {
  console.log('рџ“Љ fetchExpenseStats called');
  const response = await http.get('/expenses/stats/');
  console.log('рџ“Ґ fetchExpenseStats response:', response.data);
  return response.data;
};

export const fetchExpenseTrend = async (days: number = 30): Promise<ExpenseTrend[]> => {
  console.log('рџ“€ fetchExpenseTrend called with days:', days);
  const response = await http.get('/expenses/trend/', { params: { days } });
  console.log('рџ“Ґ fetchExpenseTrend response:', response.data);
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchExpenseDistribution = async (
  period: 'day' | 'week' | 'month' | 'all' = 'month'
): Promise<ExpenseDistribution[]> => {
  console.log('рџҐ§ fetchExpenseDistribution called with period:', period);
  const response = await http.get('/expenses/distribution/', { params: { period } });
  console.log('рџ“Ґ fetchExpenseDistribution response:', response.data);
  return Array.isArray(response.data) ? response.data : [];
};

// ========== EXPORT ==========
const fetchExportBlob = async (url: string, params?: Record<string, unknown>): Promise<Blob> => {
  const response = await http.get(url, {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export const exportExpensesPdf = async (filters?: ExpenseFilters): Promise<Blob> => {
  return fetchExportBlob('/api/expenses/export/pdf/', filters);
};

export const exportExpensesExcel = async (filters?: ExpenseFilters): Promise<Blob> => {
  return fetchExportBlob('/api/expenses/export/excel/', filters);
};

export const exportMonthlyExpensesPdf = async (month: string): Promise<Blob> => {
  return fetchExportBlob('/api/expenses/monthly/export/pdf/', { month });
};

export const exportMonthlyExpensesExcel = async (month: string): Promise<Blob> => {
  return fetchExportBlob('/api/expenses/monthly/export/excel/', { month });
};

