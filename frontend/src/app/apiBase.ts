/**
 * Get API base URL from environment variables or fallback.
 * Automatically uses HTTPS in production and HTTP in development.
 * 
 * Production: https://erp.lenza.uz or current window.location.origin
 * Development: http://localhost:8000
 * 
 * Updated: 2025-12-04 - Fixed mixed content with automatic protocol detection
 */
export const getApiBase = (): string => {
  // First try environment variable (set at build time)
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  
  if (envUrl && envUrl.trim()) {
    // Normalize: remove trailing slashes and /api suffix
    const normalized = envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    return normalized;
  }
  
  // In browser: use current origin (respects HTTPS automatically)
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    
    // Production domain detection
    if (hostname.includes('erp.lenza.uz') || hostname.includes('lenza')) {
      return `${protocol}//erp.lenza.uz`;
    }
    
    // For any other production domain, use current origin
    if (protocol === 'https:') {
      return window.location.origin;
    }
  }
  
  // Development fallback
  return import.meta.env.DEV ? 'http://localhost:8000' : 'https://erp.lenza.uz';
};
