/**
 * Get API base URL from environment variables or fallback.
 * In production, VITE_API_URL must be set to https://erp.lenza.uz
 * In development, it falls back to http://localhost:8000
 * 
 * Updated: 2025-11-24 - Fixed mixed content HTTPS issue with proper fallback
 */
export const getApiBase = (): string => {
  // First try environment variable (set at build time in Docker)
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  
  // If no env var, use production URL as default (safer than localhost)
  // This ensures HTTPS in production even if env var is missing
  const raw = envUrl || 'https://erp.lenza.uz';
  
  // Normalize: remove trailing slashes and /api suffix
  const normalized = raw.replace(/\/+$/, '');
  const withoutApi = normalized.replace(/\/api$/, '');
  return withoutApi || normalized;
};
