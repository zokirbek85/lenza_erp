import http from '../app/http';

// Unified dealer fetcher
export const fetchAllDealers = async () => {
  const res = await http.get('/dealers/list-all/');
  return toArray(res.data);
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
