import { useCallback, useEffect, useState } from 'react';

import http from '../app/http';

type Params = Record<string, unknown>;

interface Options {
  immediate?: boolean;
  params?: Params;
}

export const useFetch = <TResponse = unknown>(url: string, options: Options = {}) => {
  const { immediate = true, params } = options;
  const [data, setData] = useState<TResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchData = useCallback(
    async (overrideParams?: Params) => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get<TResponse>(url, { params: overrideParams ?? params });
        setData(response.data);
        return response.data;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url, params]
  );

  useEffect(() => {
    if (immediate) {
      fetchData().catch(() => null);
    }
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
};
