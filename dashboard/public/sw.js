// ─────────────────────────────────────────────
// MarketLajinha Dashboard – Service Worker
// ─────────────────────────────────────────────

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `dash-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dash-dynamic-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];

const PRECACHE_URLS = ['/'];

const API_PATTERN = /\/(lojas|produtos|pedidos|clientes|cupons|bairros|usuarios|admin|impressoras|health)/;

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

  self.registration.showNotification(notification.title || 'MarketLajinha', {
    body: notification.body || 'Você tem uma atualização.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    data: { url: data.url || '/pedidos' },
    requireInteraction: true,
    tag: data.pedidoId || 'novo-pedido',
  });
});

// ──────────── Install ────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ──────────── Activate ────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ──────────── Fetch ────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    return;
  }

  if (API_PATTERN.test(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((r) => { if (r.ok) { const cl = r.clone(); caches.open(DYNAMIC_CACHE).then((c) => c.put(event.request, cl)); } return r; })
        .catch(() => caches.match(event.request).then((c) => c || new Response('{"erro":"Offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((r) => {
        if (r.ok) { const cl = r.clone(); caches.open(STATIC_CACHE).then((c) => c.put(event.request, cl)); }
        return r;
      }).catch(() => new Response('', { status: 503 }));
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
