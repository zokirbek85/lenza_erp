import http from '../app/http';

// ========== NEW LEDGER API - DYNAMIC CALCULATOR ==========

export interface LedgerSummary {
  total_income_usd: number;
  total_income_uzs: number;
  total_expense_usd: number;
  total_expense_uzs: number;
  balance_usd: number;
  balance_uzs: number;
  history: Array<{
    date: string;
    income_usd: number;
    income_uzs: number;
    expense_usd: number;
    expense_uzs: number;
    balance_usd: number;
    balance_uzs: number;
  }>;
}

export interface CardBalance {
  card_id: number;
  card_name: string;
  income_usd: number;
  income_uzs: number;
  expense_usd: number;
  expense_uzs: number;
  balance_usd: number;
  balance_uzs: number;
}

export interface CategoryExpense {
  category: string;
  total_usd: number;
  total_uzs: number;
  count: number;
}

// Fetch ledger summary
export const fetchLedgerSummary = async (filters?: {
  from?: string;
  to?: string;
  card_id?: number;
}): Promise<LedgerSummary> => {
  const response = await http.get('/ledger/', { params: filters });
  return response.data;
};

// Fetch all card balances
export const fetchCardBalances = async (): Promise<CardBalance[]> => {
  const response = await http.get('/ledger/by-card/');
  return response.data;
};

// Fetch single card balance
export const fetchCardBalance = async (cardId: number): Promise<CardBalance> => {
  const response = await http.get(`/cards/${cardId}/balance/`);
  return response.data;
};

// Fetch expenses by category
export const fetchExpensesByCategory = async (filters?: {
  from?: string;
  to?: string;
}): Promise<CategoryExpense[]> => {
  const response = await http.get('/ledger/by-category/', { params: filters });
  return response.data;
};


