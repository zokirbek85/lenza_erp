const CACHE_VERSION = 'v1';
const CACHE_NAME = `lenza-erp-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Critical assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((error) => {
          console.warn('Failed to cache some assets during install', error);
          // Continue even if some assets fail to cache
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Service worker install failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old cache versions
              return cacheName.startsWith('lenza-erp-') && cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
      .catch((error) => {
        console.error('Service worker activation failed', error);
      })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip API requests (let them fail naturally)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache error responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        // Cache successful responses
        caches.open(RUNTIME_CACHE)
          .then((cache) => {
            cache.put(request, responseToCache).catch(() => {
              // Silently ignore cache errors
            });
          })
          .catch(() => {
            // Silently ignore cache open errors
          });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to index.html for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html').then((indexResponse) => {
                return indexResponse || new Response('Offline', {
                  status: 503,
                  statusText: 'Service Unavailable',
                });
              });
            }
            // For other requests, return a simple offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          })
          .catch((error) => {
            console.error('Cache match failed', error);
            return new Response('Cache Error', {
              status: 500,
              statusText: 'Internal Server Error',
            });
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
