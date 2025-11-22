const FALLBACK_API = 'http://localhost:8000/api/';

/**
 * Normalize API base URL to avoid trailing slashes or duplicated `/api` segments.
 */
export const getApiBase = (): string => {
  const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? FALLBACK_API;
  const normalized = raw.replace(/\/+$/, '');
  const withoutApi = normalized.replace(/\/api$/, '');
  return withoutApi || normalized;
};
