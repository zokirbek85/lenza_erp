/**
 * Utility for fetching all pages from DRF paginated endpoints
 */

import http from '../app/http';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Fetches all items from a paginated DRF endpoint
 * Automatically follows 'next' links until all pages are loaded
 * 
 * @param endpoint - API endpoint (e.g., '/dealers/')
 * @param params - Query parameters (e.g., { is_active: true })
 * @returns Array of all items across all pages
 */
export async function fetchAllPages<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T[]> {
  const allItems: T[] = [];
  let nextUrl: string | null = endpoint;
  let isFirstPage = true;

  while (nextUrl) {
    try {
      let requestUrl: string;
      let requestParams: Record<string, any> | undefined;

      if (isFirstPage) {
        // First page: use endpoint with params
        requestUrl = endpoint;
        requestParams = params;
      } else {
        // Subsequent pages: extract relative path from 'next' URL
        // DRF returns full URLs like "http://erp.lenza.uz/api/dealers/?page=2"
        // We need to extract just "/api/dealers/?page=2" or "/dealers/?page=2"
        if (nextUrl.startsWith('http://') || nextUrl.startsWith('https://')) {
          try {
            const url = new URL(nextUrl);
            // Extract pathname + search (e.g., "/api/dealers/?page=2")
            requestUrl = url.pathname + url.search;
            // Remove /api prefix if present (since http client already has baseURL: '/api')
            if (requestUrl.startsWith('/api/')) {
              requestUrl = requestUrl.substring(4); // Remove '/api'
            }
          } catch (e) {
            console.warn('Failed to parse next URL, using as-is:', nextUrl);
            requestUrl = nextUrl;
          }
        } else {
          // Already a relative URL
          requestUrl = nextUrl;
        }
        requestParams = undefined;
      }

      const response: { data: PaginatedResponse<T> | T[] } = await http.get<PaginatedResponse<T>>(
        requestUrl,
        requestParams ? { params: requestParams } : undefined
      );

      const data: PaginatedResponse<T> | T[] = response.data;

      // Handle both paginated and non-paginated responses
      if (Array.isArray(data)) {
        // Non-paginated response (list-all endpoint)
        allItems.push(...data);
        break;
      } else if (data && typeof data === 'object' && 'results' in data) {
        // Paginated response
        allItems.push(...data.results);
        nextUrl = data.next;
      } else {
        // Unexpected format
        console.warn('Unexpected response format:', data);
        break;
      }

      isFirstPage = false;
    } catch (error) {
      console.error('Error fetching page:', error);
      throw error;
    }
  }

  return allItems;
}

/**
 * Fetches all items from multiple endpoints in parallel
 * Each endpoint is fetched with full pagination
 * 
 * @param requests - Array of { endpoint, params } objects
 * @returns Array of results in same order as requests
 */
export async function fetchAllPagesParallel<T = any>(
  requests: Array<{ endpoint: string; params?: Record<string, any> }>
): Promise<T[][]> {
  return Promise.all(
    requests.map(({ endpoint, params }) => fetchAllPages<T>(endpoint, params))
  );
}
