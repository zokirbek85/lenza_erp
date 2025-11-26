import http from '../app/http';

/**
 * Cashbox Opening Balance Types
 */
export interface CashboxOpeningBalance {
  id: number;
  cashbox_type: 'CARD' | 'CASH_UZS' | 'CASH_USD';
  cashbox_type_display: string;
  balance: number;
  currency: 'USD' | 'UZS';
  date: string;
  created_at: string;
}

export interface CashboxSummary {
  card_uzs: number;
  cash_uzs: number;
  cash_usd: number;
  usd_rate: number;
  total_usd: number;
  total_uzs: number;
  opening_balances: {
    card: CashboxOpeningBalance | null;
    cash_uzs: CashboxOpeningBalance | null;
    cash_usd: CashboxOpeningBalance | null;
  };
}

/**
 * Fetch cashbox summary with opening balances and totals
 */
export const getCashboxSummary = async (): Promise<CashboxSummary> => {
  const response = await http.get<CashboxSummary>('/cashbox/summary/');
  return response.data;
};

/**
 * Fetch all opening balances
 */
export const getOpeningBalances = async (): Promise<CashboxOpeningBalance[]> => {
  const response = await http.get<CashboxOpeningBalance[]>('/cashbox-opening-balances/');
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Create a new opening balance
 */
export const createOpeningBalance = async (
  data: Omit<CashboxOpeningBalance, 'id' | 'created_at' | 'cashbox_type_display'>
): Promise<CashboxOpeningBalance> => {
  const response = await http.post<CashboxOpeningBalance>('/cashbox-opening-balances/', data);
  return response.data;
};

/**
 * Update an existing opening balance
 */
export const updateOpeningBalance = async (
  id: number,
  data: Partial<Omit<CashboxOpeningBalance, 'id' | 'created_at' | 'cashbox_type_display'>>
): Promise<CashboxOpeningBalance> => {
  const response = await http.patch<CashboxOpeningBalance>(`/cashbox-opening-balances/${id}/`, data);
  return response.data;
};

/**
 * Delete an opening balance
 */
export const deleteOpeningBalance = async (id: number): Promise<void> => {
  await http.delete(`/cashbox-opening-balances/${id}/`);
};
