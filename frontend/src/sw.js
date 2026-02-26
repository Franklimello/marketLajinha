// ──────────── Firebase Cloud Messaging ────────────
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8',
  authDomain: 'marcketlainha.firebaseapp.com',
  projectId: 'marcketlainha',
  storageBucket: 'marcketlainha.firebasestorage.app',
  messagingSenderId: '910649841875',
  appId: '1:910649841875:web:3ea1a73381a6914f56dc26',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(notification.title || 'UaiFood', {
    body: notification.body || 'Você tem uma atualização.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/pedidos' },
    requireInteraction: true,
    tag: data.pedidoId || 'status-pedido',
  });
});

// ──────────── Caches ────────────
const CACHE_VERSION = 'vite-pwa-v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const IMAGES_CACHE = 'images-cache-v1';

const INJECTED_MANIFEST = self.__WB_MANIFEST || [];

function normalizePrecacheUrl(input) {
  const url = new URL(input, self.location.origin);
  if (url.origin === self.location.origin) {
    if (url.pathname === '/index.html') return '/';
    return `${url.pathname}${url.search}`;
  }
  return url.href;
}

const PRECACHE_URLS = [
  ...new Set(
    [
      ...INJECTED_MANIFEST.map((entry) => entry.url),
      '/',
      '/manifest.json',
      '/offline.html',
    ].map(normalizePrecacheUrl)
  ),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== IMAGES_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // ── Estratégia para imagens: stale-while-revalidate ──────────────────────
  // Cobre imagens cross-origin (Supabase, Cloudinary, etc.) e imagens locais.
  // Retorna do cache instantaneamente se disponível e atualiza em background.
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGES_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached || Response.error());

        // Serve cache imediatamente (zero latência) e atualiza em background
        return cached || fetchPromise;
      })
    );
    return;
  }

  const url = new URL(request.url);

  // Recursos cross-origin que não são imagens (APIs, fontes CDN, etc.): sem cache
  if (url.origin !== self.location.origin) return;

  // ── Navegação SPA: rede com fallback offline ──────────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        return (await caches.match('/offline.html')) || Response.error();
      })
    );
    return;
  }

  // ── Assets estáticos locais (JS, CSS, fontes): cache-first ───────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || !response.ok) return response;
        const copy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});

// ──────────── Notification click ────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/pedidos';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
