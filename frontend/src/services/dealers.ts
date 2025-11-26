import http from '../app/http';
import { toArray } from '../utils/api';

export type DealerDto = {
  id: number;
  name: string;
  [key: string]: any;
};

/**
 * Fetch all dealers without pagination for dropdowns.
 * Falls back to the standard paginated endpoint if list-all is unavailable.
 */
export const fetchAllDealers = async <T = DealerDto>(): Promise<T[]> => {
  // Prefer list-all; fall back silently on any failure/empty payload.
  try {
    const res = await http.get('/dealers/list-all/');
    const normalized = toArray<T>(res.data);
    if (normalized.length) return normalized;
  } catch (error: any) {
    console.warn('fetchAllDealers: list-all failed, falling back', error?.response?.status || error);
  }

  const fallback = await http.get('/dealers/', { params: { page_size: 1000 } });
  const fallbackList = toArray<T>(fallback.data);
  if (fallbackList.length) return fallbackList;

  // Final fallback: try unlimited limit param some backends honor
  const finalTry = await http.get('/dealers/', { params: { limit: 'all' } });
  return toArray<T>(finalTry.data);
};
