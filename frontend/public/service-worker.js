/**
 * Service Worker Placeholder
 * Prepared for offline caching, background sync, and push notifications.
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Placeholder: Implement Cache-First or Network-First strategies here later.
  // Currently bypasses to network.
});
