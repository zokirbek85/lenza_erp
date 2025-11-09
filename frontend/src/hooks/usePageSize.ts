import { useEffect, useState } from 'react';

const clampPageSize = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  if (value > 200) {
    return 200;
  }
  return value;
};

export const usePersistedPageSize = (storageKey: string, defaultSize = 25): [number, (size: number) => void] => {
  const [pageSize, setPageSizeState] = useState(() => {
    if (typeof window === 'undefined') return defaultSize;
    try {
      const stored = Number(window.localStorage.getItem(storageKey));
      if (Number.isFinite(stored) && stored > 0) {
        return clampPageSize(stored, defaultSize);
      }
    } catch {
      // ignore
    }
    return defaultSize;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, String(pageSize));
    } catch {
      // ignore
    }
  }, [pageSize, storageKey]);

  const setPageSize = (size: number) => {
    setPageSizeState(clampPageSize(size, defaultSize));
  };

  return [pageSize, setPageSize];
};
