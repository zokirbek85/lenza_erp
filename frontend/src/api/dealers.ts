import http from '../app/http';

export interface Dealer {
  id: number;
  name: string;
  phone: string;
  address: string;
  current_debt_usd?: number;
  current_debt_uzs?: number;
  created_at: string;
}

export interface DealerFilters {
  search?: string;
  page_size?: number;
  is_active?: boolean;
}

export const getDealers = (params?: DealerFilters) =>
  http.get<Dealer[]>('/dealers/', { params });

export const getDealer = (id: number) =>
  http.get<Dealer>(`/dealers/${id}/`);
