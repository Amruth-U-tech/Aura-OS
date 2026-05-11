const CACHE_NAME = 'aura-os-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Assets cached successfully');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[PWA] Old cache removed:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // ---------------------------------------------------------------------------
  // API Requests: Network First, NO Cache Fallback
  // Detect API traffic by:
  //   • Path prefix /api/ (covers both dev proxy and production)
  //   • Port 5000 (local Express dev server)
  //   • Render production hostname (aura-os-d88w.onrender.com)
  // Let the frontend's axios interceptors handle offline failures natively.
  // ---------------------------------------------------------------------------
  const isApiRequest =
    url.pathname.startsWith('/api/') ||
    url.port === '5000' ||
    url.hostname === 'aura-os-d88w.onrender.com';

  if (isApiRequest) {
    event.respondWith(
      fetch(request).catch((err) => {
        console.log('[PWA] Offline fallback activated for API request:', request.url);
        // Return a network error response so axios cleanly catches it
        return Response.error();
      })
    );
    return;
  }

  // Static Assets & UI Bundles: Cache First, fallback to Network, then Cache Dynamically
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[PWA] Serving from cache:', request.url);
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Verify valid response before caching
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
          }

          // Cache dynamically fetched static assets (Vite hashed JS, CSS, Fonts, Images, Audio)
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
            console.log('[PWA] Asset cached dynamically:', request.url);
          });

          return networkResponse;
        })
        .catch(() => {
          console.log('[PWA] Offline fallback activated for missing static asset:', request.url);
          
          // Offline Fallback for Navigation (e.g. refreshing on a sub-route offline)
          if (request.mode === 'navigate') {
            return caches.match('/index.html').then((cachedResponse) => {
              return cachedResponse || Response.error();
            });
          }
          
          // For all other missing assets offline, return a proper network error response
          return Response.error();
        });
    })
  );
});
