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
  try {
    const res = await http.get('/dealers/list-all/');
    const normalized = toArray<T>(res.data);
    if (normalized.length) return normalized;
  } catch (error: any) {
    // Swallow 404 to try fallback; rethrow other errors.
    if (error?.response?.status !== 404) {
      throw error;
    }
  }

  const fallback = await http.get('/dealers/', { params: { page_size: 1000 } });
  return toArray<T>(fallback.data);
};
