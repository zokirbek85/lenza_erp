import http from '../app/http';

export interface Cashbox {
  id: number;
  cashbox_type: 'CARD' | 'CASH_UZS' | 'CASH_USD';
  name: string;
  currency: 'USD' | 'UZS';
  is_active: boolean;
  card?: number;
  card_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CashboxSummary {
  id: number;
  cashbox_type: string;
  name: string;
  currency: string;
  is_active: boolean;
  opening_balance: number;
  income_sum: number;
  expense_sum: number;
  balance: number;
  history: Array<{
    date: string;
    type: string;
    amount: number;
    description: string;
  }>;
}

export interface CashboxHistory {
  cashbox_id: number;
  cashbox_name: string;
  cashbox_type: string;
  currency: string;
  start_date: string;
  end_date: string;
  history: Array<{
    date: string;
    balance: number;
  }>;
}

export interface CashboxOpeningBalance {
  id: number;
  cashbox: number;
  cashbox_name?: string;
  amount: number;
  date: string;
  created_by?: number;
  created_at: string;
}

/**
 * Fetch all cashboxes
 */
export const fetchCashboxes = async (): Promise<Cashbox[]> => {
  const response = await http.get('/api/cashbox/');
  return response.data;
};

/**
 * Fetch cashbox summary with balance calculations
 */
export const fetchCashboxSummary = async (): Promise<{ cashboxes: CashboxSummary[]; timestamp: string }> => {
  const response = await http.get('/api/cashbox/summary/');
  return response.data;
};

/**
 * Fetch cashbox history for chart
 */
export const fetchCashboxHistory = async (
  cashboxId: number,
  startDate?: string,
  endDate?: string
): Promise<CashboxHistory> => {
  const params = new URLSearchParams();
  params.append('cashbox_id', cashboxId.toString());
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await http.get(`/api/cashbox/history/?${params.toString()}`);
  return response.data;
};

/**
 * Create new cashbox
 */
export const createCashbox = async (data: Partial<Cashbox>): Promise<Cashbox> => {
  const response = await http.post('/api/cashbox/', data);
  return response.data;
};

/**
 * Update cashbox
 */
export const updateCashbox = async (id: number, data: Partial<Cashbox>): Promise<Cashbox> => {
  const response = await http.patch(`/api/cashbox/${id}/`, data);
  return response.data;
};

/**
 * Delete cashbox
 */
export const deleteCashbox = async (id: number): Promise<void> => {
  await http.delete(`/api/cashbox/${id}/`);
};

/**
 * Fetch opening balances
 */
export const fetchOpeningBalances = async (): Promise<CashboxOpeningBalance[]> => {
  const response = await http.get('/api/cashbox-opening-balances/');
  return response.data;
};

/**
 * Create opening balance
 */
export const createOpeningBalance = async (data: Partial<CashboxOpeningBalance>): Promise<CashboxOpeningBalance> => {
  const response = await http.post('/api/cashbox-opening-balances/', data);
  return response.data;
};

/**
 * Export cashbox summary to Excel
 */
export const exportCashboxExcel = async (): Promise<Blob> => {
  const response = await http.get('/api/cashbox/export/excel/', {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Export cashbox summary to PDF
 */
export const exportCashboxPdf = async (): Promise<Blob> => {
  const response = await http.get('/api/cashbox/export/pdf/', {
    responseType: 'blob',
  });
  return response.data;
};
