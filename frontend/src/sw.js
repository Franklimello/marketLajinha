const CACHE_VERSION = 'vite-pwa-v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

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
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Não intercepta cross-origin para não impactar imagens/stories.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        return (await caches.match('/offline.html')) || Response.error();
      })
    );
    return;
  }

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
