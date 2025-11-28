import http from '../app/http';

// ============================================================================
// TYPES
// ============================================================================

export interface FinanceSource {
  id: number;
  name: string;
  type: 'cash' | 'card' | 'bank';
  type_display: string;
  currency: 'USD' | 'UZS';
  currency_display: string;
  balance: number;
  total_payments?: number;
  total_expenses?: number;
  transaction_count?: number;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  transaction_type: 'payment' | 'expense';
  transaction_date: string;
  transaction_amount: number;
  currency: string;
  transaction_description: string;
  status: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: number;
  source: number;
  source_name: string;
  source_balance: number;
  category: number;
  category_name: string;
  amount: number;
  currency: 'USD' | 'UZS';
  currency_display: string;
  description: string;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  status_display: string;
  created_by: number;
  created_by_username: string;
  created_by_fullname: string;
  approved_by?: number;
  approved_by_username?: string;
  approved_by_fullname?: string;
  approved_at?: string;
  rejection_reason: string;
  receipt_image?: string;
  receipt_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceLog {
  id: number;
  source: number;
  source_name: string;
  type: 'payment_in' | 'expense_out' | 'adjustment';
  type_display: string;
  amount: number;
  old_balance: number;
  new_balance: number;
  reference_type: string;
  reference_id?: number;
  description: string;
  created_at: string;
  created_by?: number;
  created_by_username?: string;
}

// ============================================================================
// FINANCE SOURCE API
// ============================================================================

export const fetchFinanceSources = async (params?: {
  type?: string;
  currency?: string;
  is_active?: boolean;
}) => {
  const response = await http.get<{ results: FinanceSource[] }>('/finance-sources/', { params });
  return response.data.results || [];
};

export const createFinanceSource = async (data: Partial<FinanceSource>) => {
  const response = await http.post<FinanceSource>('/finance-sources/', data);
  return response.data;
};

export const updateFinanceSource = async (id: number, data: Partial<FinanceSource>) => {
  const response = await http.patch<FinanceSource>(`/finance-sources/${id}/`, data);
  return response.data;
};

export const deleteFinanceSource = async (id: number) => {
  await http.delete(`/finance-sources/${id}/`);
};

export const fetchTransactions = async (sourceId: number, params?: {
  page?: number;
  page_size?: number;
}) => {
  const response = await http.get<{
    results: Transaction[];
    count: number;
    next?: string;
    previous?: string;
  }>(`/finance-sources/${sourceId}/transactions/`, { params });
  return {
    results: response.data.results || [],
    count: response.data.count || 0,
    next: response.data.next,
    previous: response.data.previous,
  };
};

// ============================================================================
// EXPENSE CATEGORY API
// ============================================================================

export const fetchExpenseCategories = async () => {
  const response = await http.get<{ results: ExpenseCategory[] }>('/expense-categories/');
  return response.data.results || [];
};

export const createExpenseCategory = async (data: Partial<ExpenseCategory>) => {
  const response = await http.post<ExpenseCategory>('/expense-categories/', data);
  return response.data;
};

export const updateExpenseCategory = async (id: number, data: Partial<ExpenseCategory>) => {
  const response = await http.patch<ExpenseCategory>(`/expense-categories/${id}/`, data);
  return response.data;
};

export const deleteExpenseCategory = async (id: number) => {
  await http.delete(`/expense-categories/${id}/`);
};

// ============================================================================
// EXPENSE API
// ============================================================================

export const fetchExpenses = async (params?: {
  page?: number;
  page_size?: number;
  source?: number;
  category?: number;
  currency?: string;
  expense_date__gte?: string;
  expense_date__lte?: string;
  status?: string;
  ordering?: string;
}) => {
  const response = await http.get<{ results: Expense[]; count: number }>('/expenses/', { params });
  return {
    results: response.data.results || [],
    count: response.data.count || 0,
  };
};

export const createExpense = async (data: FormData | Partial<Expense>) => {
  const response = await http.post<Expense>('/expenses/', data);
  return response.data;
};

export const updateExpense = async (id: number, data: FormData | Partial<Expense>) => {
  const response = await http.patch<Expense>(`/expenses/${id}/`, data);
  return response.data;
};

export const deleteExpense = async (id: number) => {
  await http.delete(`/expenses/${id}/`);
};

export const approveExpense = async (id: number) => {
  const response = await http.post<Expense>(`/expenses/${id}/approve/`);
  return response.data;
};

export const rejectExpense = async (id: number, rejection_reason?: string) => {
  const response = await http.post<Expense>(`/expenses/${id}/reject/`, { rejection_reason });
  return response.data;
};

// ============================================================================
// FINANCE LOG API
// ============================================================================

export const fetchFinanceLogs = async (params?: {
  source?: number;
  type?: string;
  reference_type?: string;
  ordering?: string;
}) => {
  const response = await http.get<{ results: FinanceLog[] }>('/finance-logs/', { params });
  return response.data.results || [];
};
