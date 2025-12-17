import http from '../app/http';

// Unified dealer fetcher (typed)
export const fetchAllDealers = async <T = any>(): Promise<T[]> => {
  const res = await http.get('/dealers/list-all/');
  return toArray<T>(res.data);
};
export const toArray = <T>(payload: unknown): T[] => {
  // Debug logging
  console.log('toArray input:', payload);
  console.log('toArray input type:', typeof payload, 'isArray:', Array.isArray(payload));
  
  if (Array.isArray(payload)) {
    console.log('toArray: returning direct array, length:', payload.length);
    return payload as T[];
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
    const results = (payload as { results: unknown[] }).results;
    console.log('toArray: returning results array, length:', results.length);
    return results as T[];
  }
  console.log('toArray: returning empty array');
  return [];
};
