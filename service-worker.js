// ================================================
// SERVICE WORKER - Hoja Maestra PWA
// ================================================

const CACHE_VERSION = 'hoja-maestra-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}`;

// Archivos esenciales para funcionar offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Logos desde Dropbox
  'https://www.dropbox.com/scl/fi/m2ynl5dn5raprkv4tmb1e/Logo-SmurfitWestrock.png?rlkey=iaxgatfb97h0osbqhmrpna4ne&st=0um2ym1j&raw=1',
  'https://www.dropbox.com/scl/fi/vlg771i5bfvb10whpvs5h/Logo-SmurfitWestrock-Blanco.png?rlkey=wzupayno47724qyxuqk3go3yd&st=wyki7giu&raw=1',
  'https://www.dropbox.com/scl/fi/32dqe6qluik6zei01wss5/SWMTY.svg?rlkey=z7db7u373j3j0ocjrlwyg28rt&st=oibmkca4&raw=1',
  // CDN resources (optional - cached on first load)
  'https://cdn.tailwindcss.com',
  'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// Imágenes que pueden cargarse bajo demanda
const DYNAMIC_CACHE_NAME = `${CACHE_VERSION}-dynamic`;

// ================================================
// INSTALL EVENT
// ================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential assets');
        // Intentar cachear todos, pero no fallar si alguno falla
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'no-cache' });
        })).catch((error) => {
          console.warn('[SW] Some assets failed to cache:', error);
          // Cache individual assets that succeed
          return Promise.allSettled(
            STATIC_ASSETS.map(url => cache.add(url))
          );
        });
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ================================================
// ACTIVATE EVENT
// ================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Eliminar caches antiguos
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// ================================================
// FETCH EVENT - Network First con Cache Fallback
// ================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que no sean GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar chrome extensions y otros protocolos
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Estrategia: Network First con Cache Fallback
  // Intenta la red primero, si falla usa el cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, clona y cachea
        if (response && response.status === 200) {
          const responseClone = response.clone();

          // Cachea dinámicamente imágenes y assets
          if (
            request.destination === 'image' ||
            request.destination === 'font' ||
            request.destination === 'style' ||
            request.destination === 'script'
          ) {
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              })
              .catch((error) => {
                console.warn('[SW] Failed to cache dynamic asset:', error);
              });
          }
        }
        return response;
      })
      .catch(() => {
        // Si la red falla, busca en el cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', request.url);
              return cachedResponse;
            }

            // Si es una navegación y no hay cache, muestra página offline
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }

            // Para otros recursos, retorna error
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// ================================================
// MESSAGE EVENT - Comunicación con la app
// ================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        return self.registration.unregister();
      })
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// ================================================
// SYNC EVENT - Background Sync (opcional)
// ================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Aquí podrías sincronizar datos guardados offline
      Promise.resolve()
    );
  }
});

console.log('[SW] Service Worker script loaded');
