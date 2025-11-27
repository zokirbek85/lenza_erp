/**
 * Cashbox API service - minimal version for Ledger page
 * Note: Standalone "Cashbox Balance" page has been removed
 * This file provides only the APIs needed for embedded cashbox management in Ledger
 */

import http from '../app/http';

export interface Cashbox {
  id: number;
  name: string;
  cashbox_type: 'card' | 'cash';
  currency: 'UZS' | 'USD';
  is_active: boolean;
  balance?: number;
  opening_balance?: number;
  income_sum?: number;
  expense_sum?: number;
}

export interface CashboxSummary {
  id: number;
  name: string;
  cashbox_type: string;
  currency: string;
  balance: number;
  opening_balance: number;
  income_sum: number;
  expense_sum: number;
}

export interface CashboxOpeningBalance {
  id: number;
  cashbox_type: 'card' | 'cash';
  currency: 'UZS' | 'USD';
  date: string;
  opening_balance_usd: number;
  opening_balance_uzs: number;
  created_at: string;
}

/**
 * Fetch all cashboxes
 */
export const fetchCashboxes = async (): Promise<Cashbox[]> => {
  const response = await http.get('/cashboxes/');
  return response.data.results || response.data;
};

/**
 * Fetch cashbox summary with balances (used by Ledger page)
 */
export const fetchCashboxSummary = async (): Promise<{ cashboxes: CashboxSummary[] }> => {
  const response = await http.get('/cashbox/summary/');
  return response.data;
};

/**
 * Create a new cashbox
 */
export const createCashbox = async (payload: Partial<Cashbox>): Promise<Cashbox> => {
  const response = await http.post('/cashboxes/', payload);
  return response.data;
};

/**
 * Update an existing cashbox
 */
export const updateCashbox = async (id: number, data: Partial<Cashbox>): Promise<Cashbox> => {
  const response = await http.patch(`/cashboxes/${id}/`, data);
  return response.data;
};

/**
 * Delete a cashbox
 */
export const deleteCashbox = async (id: number): Promise<void> => {
  await http.delete(`/cashboxes/${id}/`);
};

/**
 * Fetch all opening balances
 */
export const fetchOpeningBalances = async (): Promise<CashboxOpeningBalance[]> => {
  const response = await http.get('/cashbox-opening-balances/');
  return response.data.results || response.data;
};

/**
 * Create a new opening balance
 */
export const createOpeningBalance = async (data: Partial<CashboxOpeningBalance>): Promise<CashboxOpeningBalance> => {
  const response = await http.post('/cashbox-opening-balances/', data);
  return response.data;
};

/**
 * Update an existing opening balance
 */
export const updateOpeningBalance = async (id: number, data: Partial<CashboxOpeningBalance>): Promise<CashboxOpeningBalance> => {
  const response = await http.patch(`/cashbox-opening-balances/${id}/`, data);
  return response.data;
};

/**
 * Delete an opening balance
 */
export const deleteOpeningBalance = async (id: number): Promise<void> => {
  await http.delete(`/cashbox-opening-balances/${id}/`);
};
