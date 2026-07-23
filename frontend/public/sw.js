const CACHE_NAME = 'solar-palmeiras-pwa-v1';
const API_CACHE_NAME = 'solar-palmeiras-api-v1';

// Static Shell Assets for Precaching
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png'
];

// Service Worker Install Event - Precaching Shell Assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando PWA Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Fazendo precache do App Shell...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate Event - Cleaning Old Caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando PWA Service Worker...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            console.log('[ServiceWorker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Service Worker Fetch Event - Advanced Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategy 1: Network First (with Cache Fallback) for API Calls (/api/*)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[ServiceWorker] API sem rede - retornando dados do cache offline para:', request.url);
          return caches.match(request);
        })
    );
    return;
  }

  // Strategy 2: Stale-While-Revalidate for Static Assets, Fonts & Styles
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Suppress fetch errors when offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});
