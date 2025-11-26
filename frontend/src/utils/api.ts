import http from '../app/http';

// Unified dealer fetcher (typed)
export const fetchAllDealers = async <T = any>(): Promise<T[]> => {
  const res = await http.get('/dealers/list-all/');
  return toArray<T>(res.data);
};
export const toArray = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
    return ((payload as { results: unknown[] }).results as T[]) ?? [];
  }
  return [];
};
