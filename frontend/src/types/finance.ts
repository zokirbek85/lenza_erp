export type Currency = 'UZS' | 'USD';

export type AccountType = 'cash' | 'card' | 'bank';

export type TransactionType = 'income' | 'expense' | 'opening_balance' | 'currency_exchange_out' | 'currency_exchange_in';

export type TransactionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface FinanceAccount {
  id: number;
  type: AccountType;
  type_display?: string;
  currency: Currency;
  name: string;
  is_active: boolean;
  opening_balance_amount: number;
  opening_balance_date: string | null;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: number;
  type: TransactionType;
  type_display?: string;
  dealer: number | null;
  dealer_name?: string;
  manager_name?: string;
  account: number;
  account_name?: string;
  related_account?: number | null;
  related_account_name?: string;
  date: string;
  currency: Currency;
  amount: number;
  amount_usd: number;
  amount_uzs: number;
  exchange_rate: number | null;
  exchange_rate_date: string | null;
  category: string;
  comment: string;
  status: TransactionStatus;
  status_display?: string;
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
  opening_balance_amount: number;
  opening_balance_date: string | null;
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
  page_size?: number;
}

// Currency transfer request
export interface CurrencyTransferRequest {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  rate: number;
  date: string;
  comment?: string;
}

// Currency transfer response
export interface CurrencyTransferResponse {
  success: boolean;
  message: string;
  source_transaction_id: number;
  target_transaction_id: number;
  usd_amount: number;
  uzs_amount: number;
  rate: number;
  from_account: {
    id: number;
    name: string;
    new_balance: number;
  };
  to_account: {
    id: number;
    name: string;
    new_balance: number;
  };
}

// Pagination response from DRF
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Expense Category
export interface ExpenseCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  is_global: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryCreate {
  name: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  is_global?: boolean;
}

export interface ExpenseCategoryUpdate {
  name?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  is_global?: boolean;
}

export interface ExpenseCategoryStatistics {
  id: number;
  name: string;
  icon: string;
  color: string;
  transaction_count: number;
  total_uzs: number;
  total_usd: number;
}

// Dealer Refund
export interface DealerRefundRequest {
  dealer_id: number;
  amount: number;
  currency: 'USD' | 'UZS';
  account_id: number;
  description?: string;
  date?: string; // YYYY-MM-DD format
}

export interface DealerRefundResponse {
  success: boolean;
  message: string;
  transaction_id: number;
  refund_amount: number;
  currency: string;
  dealer_balance_deduction: number;
  dealer_currency: string;
  exchange_rate: number | null;
  account: {
    id: number;
    name: string;
    new_balance: number;
  };
  dealer: {
    id: number;
    name: string;
    new_balance: number | null;
  };
}
