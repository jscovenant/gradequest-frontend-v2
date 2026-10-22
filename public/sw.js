// SchoolProfit Mobile Service Worker v2.1
const CACHE_NAME = 'schoolprofit-mobile-v2.1';
const STATIC_ASSETS = [
  '/favicon.svg',
  '/media/logo/schoolprofit-logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and API calls (always live network)
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // Network-first strategy to guarantee fresh updates while supporting offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          (request.url.endsWith('.png') ||
            request.url.endsWith('.svg') ||
            request.url.endsWith('.woff2'))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
