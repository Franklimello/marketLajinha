// ─────────────────────────────────────────────────────────────────────────────
// UaiFood – Service Worker
// Estratégias:
//   - Navegação (SPA)  → Network First com fallback para '/'
//   - Assets estáticos → Stale-While-Revalidate
//   - API (same-origin) → Network First com fallback no cache
//   - Imagens cross-origin (Railway/GCS) → Network First simples (sem cache)
//   - Demais cross-origin → passa direto (sem interceptar)
// ─────────────────────────────────────────────────────────────────────────────

// ── Versão do cache ──────────────────────────────────────────────────────────
// Incrementar CACHE_VERSION força a limpeza de todos os caches antigos
// e reinicia o precache no próximo activate.
const CACHE_VERSION = 'v5';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];

// Manifesto injetado pelo vite-plugin-pwa (URLs dos assets do build)
const INJECTED_MANIFEST = self.__WB_MANIFEST || [];

// PRECACHE: deduplica para evitar erro ao tentar guardar a mesma URL duas vezes.
// '/', '/manifest.json' e os ícones são adicionados manualmente porque podem
// não estar incluídos no manifesto gerado pelo Vite.
const PRECACHE_URLS = [
  ...new Set([
    ...INJECTED_MANIFEST.map((e) => e.url),
    '/',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-maskable-192.png',
    '/icons/icon-maskable-512.png',
    '/icons/novalogo.png',
    '/icons/logouaifood.png',
  ]),
];

// Padrão de rotas da API para identificar chamadas de dados
const API_PATTERN = /\/(lojas|produtos|pedidos|clientes|cupons|bairros|usuarios|admin|impressoras|health|motoboys|combos|promocoes|stories|chat)/;

// Limite máximo de entradas no cache dinâmico (evita crescimento infinito)
const MAX_DYNAMIC_ENTRIES = 120;

// Origins com permissão de cache para imagens cross-origin (Railway / GCS)
// Adicione aqui o origin exato do backend de imagens, se necessário.
const IMAGE_ORIGINS = [
  'https://marketlajinha-production.up.railway.app',
  'https://storage.googleapis.com',
];

// ── Firebase Cloud Messaging (background) ───────────────────────────────────

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
  // PWA continua funcionando sem FCM (ex.: Safari, Firefox)
  console.warn('[SW] Firebase Messaging indisponível:', err?.message || err);
}

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Pré-cacheamos os assets do build.
  // skipWaiting() faz com que este SW assuma o controle IMEDIATAMENTE,
  // sem esperar que todas as abas fechem (necessário para update imediato).
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Apaga caches de versões anteriores (chaves que não estão em ALL_CACHES)
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );

      // 2. Habilita Navigation Preload.
      //    O navegador dispara a requisição de rede em paralelo com a
      //    inicialização do SW, reduzindo latência em navegações.
      //    O resultado chega via event.preloadResponse no fetch handler.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    })()
  );

  // Assume o controle de todas as abas abertas imediatamente.
  self.clients.claim();
});

// ── Helpers de estratégia ─────────────────────────────────────────────────────

/**
 * Stale-While-Revalidate: retorna o cache imediatamente e atualiza em segundo plano.
 * Ideal para assets estáticos (JS, CSS, imagens do próprio host).
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  // Atualiza o cache sem bloquear a resposta atual
  const networkPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  // Serve do cache se disponível, senão aguarda a rede
  return cached ?? networkPromise ?? new Response('', { status: 503 });
}

/**
 * Network First: tenta a rede, cai no cache se offline.
 * Ideal para API e dados dinâmicos.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone()); // não bloqueia a resposta
      trimCache(cache, MAX_DYNAMIC_ENTRIES); // limpeza assíncrona
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ erro: 'Sem conexão com a internet.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Network First para navegação SPA.
 *
 * O preloadResponse PRECISA ser consumido (mesmo que descartado) para evitar
 * o warning "preload request was cancelled before preloadResponse settled".
 * O .catch(() => null) trata cancelamentos sem lançar exceção.
 */
async function navigationHandler(request, preloadResponsePromise) {
  try {
    // Tenta aproveitar o preload (requisição paralela do navegador)
    const preload = await Promise.resolve(preloadResponsePromise).catch(() => null);
    if (preload?.ok) return preload;

    // Preload não disponível ou falhou — faz fetch normal
    return await fetch(request);
  } catch {
    // Offline: devolve o index.html do cache (SPA funciona offline assim)
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/'); // fallback final para a raiz
  }
}

/**
 * Network First para imagens cross-origin (ex.: Railway, GCS).
 * Não faz cache para evitar problemas com CORS opaque responses.
 * Se a rede falhar, retorna resposta vazia (a imagem simplesmente não aparece).
 */
async function crossOriginImageHandler(request) {
  try {
    // mode: 'cors' garante que a resposta não seja opaque
    return await fetch(request, { mode: 'cors' });
  } catch {
    // Sem conexão: retorna 503 silencioso (não quebra o layout)
    return new Response('', { status: 503 });
  }
}

/** Remove entradas mais antigas do cache quando excede o limite */
async function trimCache(cache, maxItems) {
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  // Remove o mais antigo e verifica novamente recursivamente
  await cache.delete(keys[0]);
  await trimCache(cache, maxItems);
}

// ── Fetch handler ─────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // só intercepta GETs

  const url = new URL(request.url);

  // ── Imagens vindas de origins conhecidos (Railway, GCS) ──────────────────
  // IMPORTANTE: antes verificávamos apenas same-origin, o que fazia as imagens
  // do backend/storage sumirem silenciosamente. Agora tratamos explicitamente.
  if (IMAGE_ORIGINS.includes(url.origin)) {
    event.respondWith(crossOriginImageHandler(request));
    return;
  }

  // ── Ignora requisições de outros origins que não são imagens conhecidas ───
  // Ex.: analytics, firebase, gstatic — deixa o navegador tratar normalmente.
  if (url.origin !== self.location.origin) return;

  // ── Navegação SPA ─────────────────────────────────────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request, event.preloadResponse));
    return;
  }

  // ── API same-origin ───────────────────────────────────────────────────────
  if (API_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Assets estáticos (JS, CSS, fontes, imagens do próprio host) ───────────
  if (/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|gif|ico)(\?.*)?$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── Demais requisições same-origin ───────────────────────────────────────
  event.respondWith(networkFirst(request));
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Foca numa aba já aberta se possível
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});

// ── Message handler (atualização manual via postMessage) ─────────────────────

self.addEventListener('message', (event) => {
  // O hook usePWA envia SKIP_WAITING para ativar o novo SW imediatamente
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
