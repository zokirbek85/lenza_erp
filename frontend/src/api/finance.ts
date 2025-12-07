import http from '../app/http';
import type {
  FinanceAccount,
  FinanceTransaction,
  CashSummary,
  FinanceTransactionFilters,
  FinanceAccountFilters,
  PaginatedResponse,
  CurrencyTransferRequest,
  CurrencyTransferResponse,
} from '../types/finance';

// Accounts
export const getFinanceAccounts = (params?: FinanceAccountFilters) => 
  http.get<PaginatedResponse<FinanceAccount>>('/finance/accounts/', { params });

export const getFinanceAccount = (id: number) => 
  http.get<FinanceAccount>(`/finance/accounts/${id}/`);

export const createFinanceAccount = (data: Partial<FinanceAccount>) => 
  http.post<FinanceAccount>('/finance/accounts/', data);

export const updateFinanceAccount = (id: number, data: Partial<FinanceAccount>) => 
  http.patch<FinanceAccount>(`/finance/accounts/${id}/`, data);

export const deleteFinanceAccount = (id: number) => 
  http.delete(`/finance/accounts/${id}/`);

// Transactions
export const getFinanceTransactions = (params?: FinanceTransactionFilters) => 
  http.get<PaginatedResponse<FinanceTransaction>>('/finance/transactions/', { params });

export const getFinanceTransaction = (id: number) => 
  http.get<FinanceTransaction>(`/finance/transactions/${id}/`);

export const createFinanceTransaction = (data: Partial<FinanceTransaction>) => 
  http.post<FinanceTransaction>('/finance/transactions/', data);

export const updateFinanceTransaction = (id: number, data: Partial<FinanceTransaction>) => 
  http.patch<FinanceTransaction>(`/finance/transactions/${id}/`, data);

export const deleteFinanceTransaction = (id: number) => 
  http.delete(`/finance/transactions/${id}/`);

export const approveFinanceTransaction = (id: number) => 
  http.post<FinanceTransaction>(`/finance/transactions/${id}/approve/`);

export const cancelFinanceTransaction = (id: number) => 
  http.post<FinanceTransaction>(`/finance/transactions/${id}/cancel/`);

// Summary
export const getCashSummary = () => 
  http.get<CashSummary>('/finance/summary/');

// Currency Transfer
export const transferCurrency = (data: CurrencyTransferRequest) => 
  http.post<CurrencyTransferResponse>('/finance/transfer-currency/', data);
