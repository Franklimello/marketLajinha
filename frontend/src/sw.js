const CACHE_VERSION = 'v2-2026-02-26';
const CACHE_PREFIX = 'uaifood';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const IMAGES_CACHE = `${CACHE_PREFIX}-images-${CACHE_VERSION}`;

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
          // Remove somente caches antigos deste app para evitar apagar dados de
          // outras aplicações no mesmo domínio.
          .filter((key) => key.startsWith(`${CACHE_PREFIX}-`))
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE && key !== IMAGES_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isCacheableResponse(response) {
  return response && (response.ok || response.type === 'opaque');
}

function notificationUrlFromData(data) {
  if (!data) return '/pedidos';
  const candidate = data.url || data.link || data.click_action || '/pedidos';
  try {
    const parsed = new URL(candidate, self.location.origin);
    if (parsed.origin !== self.location.origin) return '/pedidos';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/pedidos';
  }
}

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
            if (isCacheableResponse(res)) cache.put(request, res.clone());
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
      fetch(request)
        .then(async (response) => {
          if (response && response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          return (await caches.match('/offline.html')) || (await caches.match('/')) || Response.error();
        })
    );
    return;
  }

  // ── Assets estáticos locais (JS, CSS, fontes): cache-first ───────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!isCacheableResponse(response)) return response;
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => Response.error());
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = {};
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || 'UaiFood';
  const body = notification.body || data.body || 'Você tem uma atualização.';
  const targetUrl = notificationUrlFromData(data);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: targetUrl },
      requireInteraction: true,
      tag: data.pedidoId || data.tag || 'pedido',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/pedidos';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const currentUrl = new URL(client.url);
        const targetUrl = new URL(url, self.location.origin);
        if (`${currentUrl.pathname}${currentUrl.search}` === `${targetUrl.pathname}${targetUrl.search}` && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
