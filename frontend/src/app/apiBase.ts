// Use window.location.origin as fallback for production (same domain as frontend)
// This ensures HTTPS is used when accessing via HTTPS
const FALLBACK_API = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:8000';

/**
 * Normalize API base URL to avoid trailing slashes or duplicated `/api` segments.
 */
export const getApiBase = (): string => {
  const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? FALLBACK_API;
  const normalized = raw.replace(/\/+$/, '');
  const withoutApi = normalized.replace(/\/api$/, '');
  return withoutApi || normalized;
};
