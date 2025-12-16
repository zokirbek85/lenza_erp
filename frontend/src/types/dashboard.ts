export interface DebtAnalytics {
  total_debt: number;
  by_dealers: Array<{ dealer: string; debt: number }>;
  by_regions: Array<{ region: string; debt: number }>;
  monthly: Array<{ month: string; debt: number }>;
  daily?: Array<{ date: string; debt: number }>;
}

