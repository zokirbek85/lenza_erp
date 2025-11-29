import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  expense_date: string;
  category: number;
  category_name: string;
  cashbox: number;
  cashbox_name: string;
  cashbox_type: string;
  currency: 'USD' | 'UZS';
  amount_original: string;
  manual_rate: string | null;
  amount_uzs: string;
  amount_usd: string;
  description: string;
  status: 'pending' | 'approved';
  created_by: number | null;
  created_by_username: string;
  created_by_fullname: string;
  created_at: string;
  approved_by: number | null;
  approved_by_username: string;
  approved_by_fullname: string;
  approved_at: string | null;
  updated_at: string;
}

export interface ExpenseCreateData {
  expense_date: string;
  category: number;
  cashbox: number;
  currency: 'USD' | 'UZS';
  amount_original: string | number;
  manual_rate?: string | number | null;
  description?: string;
}

export interface ExpenseFilters {
  category?: number;
  cashbox?: number;
  currency?: 'USD' | 'UZS';
  status?: 'pending' | 'approved';
  expense_date__gte?: string;
  expense_date__lte?: string;
  created_by?: number;
}

// Expense Categories API

export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const response = await axios.get(`${API_URL}/api/expense-categories/`);
  return response.data;
};

export const createExpenseCategory = async (
  data: Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<ExpenseCategory> => {
  const response = await axios.post(`${API_URL}/api/expense-categories/`, data);
  return response.data;
};

export const updateExpenseCategory = async (
  id: number,
  data: Partial<ExpenseCategory>
): Promise<ExpenseCategory> => {
  const response = await axios.patch(`${API_URL}/api/expense-categories/${id}/`, data);
  return response.data;
};

export const deleteExpenseCategory = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/expense-categories/${id}/`);
};

// Expenses API

export const fetchExpenses = async (filters?: ExpenseFilters): Promise<Expense[]> => {
  const response = await axios.get(`${API_URL}/api/expenses/`, {
    params: filters,
  });
  return response.data.results || response.data;
};

export const fetchExpenseById = async (id: number): Promise<Expense> => {
  const response = await axios.get(`${API_URL}/api/expenses/${id}/`);
  return response.data;
};

export const createExpense = async (data: ExpenseCreateData): Promise<Expense> => {
  const response = await axios.post(`${API_URL}/api/expenses/`, data);
  return response.data;
};

export const updateExpense = async (
  id: number,
  data: Partial<ExpenseCreateData>
): Promise<Expense> => {
  const response = await axios.patch(`${API_URL}/api/expenses/${id}/`, data);
  return response.data;
};

export const approveExpense = async (id: number): Promise<Expense> => {
  const response = await axios.post(`${API_URL}/api/expenses/${id}/approve/`);
  return response.data;
};

export const deleteExpense = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/expenses/${id}/`);
};

// Export functions

export const exportExpensesToExcel = async (filters?: ExpenseFilters): Promise<Blob> => {
  const response = await axios.get(`${API_URL}/api/expenses/export/`, {
    params: { ...filters, format: 'xlsx' },
    responseType: 'blob',
  });
  return response.data;
};

export const exportExpensesToPDF = async (filters?: ExpenseFilters): Promise<Blob> => {
  const response = await axios.get(`${API_URL}/api/expenses/export/`, {
    params: { ...filters, format: 'pdf' },
    responseType: 'blob',
  });
  return response.data;
};

// Report functions

export const generateExpenseReport = async (
  dateFrom?: string,
  dateTo?: string,
  format: 'json' | 'pdf' | 'xlsx' = 'json'
): Promise<any> => {
  const response = await axios.get(`${API_URL}/api/expenses/report/`, {
    params: {
      date_from: dateFrom,
      date_to: dateTo,
      format,
    },
    responseType: format === 'json' ? 'json' : 'blob',
  });
  return response.data;
};

// Summary functions

export interface ExpenseSummary {
  total_usd: number;
  total_uzs: number;
  count: number;
  by_category: Array<{
    category: string;
    amount_usd: number;
    amount_uzs: number;
    count: number;
  }>;
  monthly: Array<{
    month: string;
    amount_usd: number;
    amount_uzs: number;
    count: number;
  }>;
}

export const fetchExpenseSummary = async (
  startDate?: string,
  endDate?: string
): Promise<ExpenseSummary> => {
  const response = await axios.get(`${API_URL}/api/expenses/summary/`, {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
  return response.data;
};
