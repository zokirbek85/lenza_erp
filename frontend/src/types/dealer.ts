export interface Dealer {
  id: number;
  name: string;
  phone: string;
  address: string;
  current_debt_usd?: number;
  current_debt_uzs?: number;
  created_at: string;
  updated_at: string;
}
