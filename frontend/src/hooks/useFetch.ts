import { useCallback, useEffect, useMemo, useState } from 'react';

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

  const stableParams = useMemo(() => {
    if (!params) {
      return undefined;
    }
    try {
      return JSON.parse(JSON.stringify(params));
    } catch {
      return params;
    }
  }, [JSON.stringify(params ?? {})]);

  const fetchData = useCallback(
    async (overrideParams?: Params) => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get<TResponse>(url, { params: overrideParams ?? stableParams });
        setData(response.data);
        return response.data;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url, stableParams]
  );

  useEffect(() => {
    if (immediate) {
      fetchData().catch(() => null);
    }
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
};
