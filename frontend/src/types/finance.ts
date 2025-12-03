export type Currency = 'UZS' | 'USD';

export type AccountType = 'cash' | 'card' | 'bank';

export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'draft' | 'approved' | 'cancelled';

export interface FinanceAccount {
  id: number;
  type: AccountType;
  currency: Currency;
  name: string;
  is_active: boolean;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: number;
  type: TransactionType;
  dealer: number | null;
  dealer_name?: string;
  account: number;
  account_name?: string;
  date: string;
  currency: Currency;
  amount: number;
  amount_usd: number;
  exchange_rate: number | null;
  exchange_rate_date: string | null;
  category: string;
  comment: string;
  status: TransactionStatus;
  created_by: number | null;
  created_by_name?: string;
  approved_by: number | null;
  approved_by_name?: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountSummary {
  account_id: number;
  account_name: string;
  account_type: AccountType;
  account_type_display: string;
  currency: Currency;
  income_total: number;
  expense_total: number;
  balance: number;
  is_active: boolean;
}

export interface CashSummary {
  accounts: AccountSummary[];
  total_balance_uzs: number;
  total_balance_usd: number;
  total_income_uzs: number;
  total_income_usd: number;
  total_expense_uzs: number;
  total_expense_usd: number;
}

export interface FinanceTransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  currency?: Currency;
  dealer?: number;
  account?: number;
  date_from?: string;
  date_to?: string;
  category?: string;
  search?: string;
}

export interface FinanceAccountFilters {
  type?: AccountType;
  currency?: Currency;
  is_active?: boolean;
}
