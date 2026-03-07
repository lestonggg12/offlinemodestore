/**
 * service-worker.js — PWA Service Worker for Sari-Sari Store
 *
 * Strategy:
 *  - App shell (HTML, CSS, JS, icons): Cache-first, network-fallback
 *  - API calls: Network-first, cache-fallback (so offline reads work)
 *  - POST/PUT/DELETE while offline: Queued in IndexedDB, replayed on reconnect
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `sarisari-static-${CACHE_VERSION}`;
const API_CACHE     = `sarisari-api-${CACHE_VERSION}`;

// App-shell assets to pre-cache on install
const APP_SHELL = [
  '/dashboard/',
  '/static/css/reset.css',
  '/static/css/variables.css',
  '/static/css/badges.css',
  '/static/css/cards.css',
  '/static/css/darkmode.css',
  '/static/css/navigations.css',
  '/static/css/pages.css',
  '/static/css/calendar.css',
  '/static/css/product.css',
  '/static/css/cart-system.css',
  '/static/css/mobile-responsive.css',
  '/static/css/cash-payment-modal.css',
  '/static/css/glassmorphic-icons.css',
  '/static/css/nav-fix.css',
  '/static/js/emoji-to-svg.js',
  '/static/js/database.js',
  '/static/js/notifications.js',
  '/static/js/dark-mode.js',
  '/static/js/dialog-system.js',
  '/static/js/cart.js',
  '/static/js/inventory.js',
  '/static/js/profit.js',
  '/static/js/calendar.js',
  '/static/js/settings.js',
  '/static/js/price_list.js',
  '/static/js/debtors.js',
  '/static/js/dashboard.js',
  '/static/js/loading.js',
  '/static/js/page-backgrounds.js',
  '/static/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing…');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Don't let a single failed asset block the install
      return Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url).catch((err) => {
          console.warn(`[SW] Failed to cache ${url}:`, err);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for caching (mutations handled by offline queue in database.js)
  if (request.method !== 'GET') return;

  // API requests → network-first, cache-fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstThenCache(request));
    return;
  }

  // Dashboard page → cache-first (app shell)
  if (url.pathname === '/dashboard/' || url.pathname === '/dashboard') {
    event.respondWith(cacheFirstThenNetwork(request, STATIC_CACHE));
    return;
  }

  // Static assets → cache-first
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(cacheFirstThenNetwork(request, STATIC_CACHE));
    return;
  }

  // Everything else (login, admin, etc.) → network only
});

// ─── STRATEGIES ──────────────────────────────────────────────────────────────

async function cacheFirstThenNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a basic offline fallback
    if (request.destination === 'document') {
      return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:80px 20px;">' +
        '<h1>📴 You are offline</h1><p>Please check your internet connection.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    return new Response('', { status: 503 });
  }
}

async function networkFirstThenCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', detail: 'No cached data available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── OFFLINE QUEUE SYNC ─────────────────────────────────────────────────────
// Listen for the 'sync' event to replay queued mutations when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-offline-queue') {
    event.waitUntil(replayOfflineQueue());
  }
});

async function replayOfflineQueue() {
  const db = await openOfflineDB();
  const tx = db.transaction('queue', 'readonly');
  const store = tx.objectStore('queue');
  const allRequests = await idbGetAll(store);

  for (const entry of allRequests) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
        credentials: 'include',
      });
      if (response.ok || response.status < 500) {
        // Remove from queue on success or client error (don't retry 4xx)
        const delTx = db.transaction('queue', 'readwrite');
        delTx.objectStore('queue').delete(entry.id);
      }
    } catch {
      // Still offline — stop replaying, sync will fire again later
      break;
    }
  }
}

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sarisari-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
