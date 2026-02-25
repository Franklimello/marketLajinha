// ─────────────────────────────────────────────
// UaiFood – Service Worker (Cache + FCM)
// ─────────────────────────────────────────────

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];
const INJECTED_MANIFEST = self.__WB_MANIFEST || [];

const PRECACHE_URLS = [
  ...INJECTED_MANIFEST.map((entry) => entry.url),
  '/',
  '/manifest.json',

  '/icons/icon-192.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/novalogo.png',
  '/icons/logouaifood.png',
];

const API_PATTERN = /\/(lojas|produtos|pedidos|clientes|cupons|bairros|usuarios|admin|impressoras|health)/;
const MAX_DYNAMIC_ENTRIES = 120;

// ──────────── Firebase Cloud Messaging ────────────

try {
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
    const { title, body } = payload.notification || {};
    const data = payload.data || {};

    self.registration.showNotification(title || 'UaiFood', {
      body: body || 'Você tem uma atualização.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/pedidos' },
      requireInteraction: true,
      tag: data.pedidoId || 'pedido',
    });
  });
} catch (err) {
  // Mantém cache/offline funcionando mesmo sem FCM.
  console.warn('[SW] Firebase Messaging indisponível:', err?.message || err);
}

// ──────────── Install ────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ──────────── Activate (limpa caches antigos) ────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches de versões anteriores.
      await Promise.all(
        (await caches.keys())
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );

      // Habilita Navigation Preload: o navegador dispara a requisição de rede
      // em paralelo com a inicialização do SW, reduzindo latência em navegações.
      // A resposta é entregue via event.preloadResponse no fetch handler.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    })()
  );
  // Assume controle imediatamente sem esperar próxima navegação.
  self.clients.claim();
});

// ──────────── Fetch strategies ────────────

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|gif|ico)(\?.*)?$/i.test(url.pathname);
}

function isApiRequest(url) {
  return API_PATTERN.test(url.pathname);
}

// Cache First: assets estáticos
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// Network First: API
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      await trimCache(cache, MAX_DYNAMIC_ENTRIES);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ erro: 'Sem conexão com a internet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || new Response('', { status: 503 });
}

async function trimCache(cache, maxItems) {
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  await cache.delete(keys[0]);
  await trimCache(cache, maxItems);
}

// Network First: navegação com fallback offline.
// O preloadResponse DEVE ser sempre consumido (await ou .catch) para evitar
// o aviso "cancelled before preloadResponse settled" no console.
async function navigationHandler(request, preloadResponsePromise) {
  try {
    // Tenta usar o preload (resposta paralela do navegador).
    // O .catch garante que um cancelamento não vire uma exceção não tratada.
    const preloadResponse = await Promise.resolve(preloadResponsePromise).catch(() => null);
    if (preloadResponse && preloadResponse.ok) return preloadResponse;

    // Em SPAs o preload raramente chega — faz fetch normal.
    return await fetch(request);
  } catch {
    // Offline: tenta cache e depois retorna a raiz (SPA funciona mesmo offline).
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback para '/' em vez de offline.html (já que offline.html foi removido).
    return caches.match('/');
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  if (isNavigationRequest(event.request)) {
    event.respondWith(navigationHandler(event.request, event.preloadResponse));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

// ──────────── Notification click ────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ──────────── Update message ────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
