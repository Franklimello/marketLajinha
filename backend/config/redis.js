const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;
let redis = null;
const inFlightByKey = new Map();
const refreshInFlight = new Set();
const storeAccessStats = new Map();

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => console.log('[Redis] Conectado'));
  redis.on('error', (err) => console.warn('[Redis] Erro:', err.message));

  redis.connect().catch(() => {
    console.warn('[Redis] Falha ao conectar. Cache desativado.');
    redis = null;
  });
} else {
  console.log('[Redis] REDIS_URL não definida. Cache desativado (apenas banco).');
}

/**
 * Busca do cache ou executa a função e salva no cache.
 * @param {string} key
 * @param {Function} fn - async function que retorna os dados
 * @param {number|object} ttlOrOptions - ttl em segundos ou objeto de opções
 */
function normalizeOptions(ttlOrOptions) {
  if (typeof ttlOrOptions === 'number') {
    return {
      ttlSeconds: ttlOrOptions,
      swrThresholdRatio: 0.3,
      forceRefresh: false,
      disableSWR: false,
      meta: null,
    };
  }

  const opts = ttlOrOptions && typeof ttlOrOptions === 'object' ? ttlOrOptions : {};
  return {
    ttlSeconds: Number(opts.ttlSeconds || 300),
    swrThresholdRatio: Number.isFinite(opts.swrThresholdRatio) ? Number(opts.swrThresholdRatio) : 0.3,
    forceRefresh: !!opts.forceRefresh,
    disableSWR: !!opts.disableSWR,
    meta: opts.meta || null,
  };
}

function trackStoreAccess(meta) {
  if (!meta) return;
  const storeSlug = String(meta.storeSlug || '').trim();
  const storeId = String(meta.storeId || '').trim();
  if (!storeSlug && !storeId) return;

  const key = storeSlug || storeId;
  const now = Date.now();
  const current = storeAccessStats.get(key) || {
    storeSlug: storeSlug || null,
    storeId: storeId || null,
    hits: 0,
    lastAccessTs: 0,
  };

  current.hits += 1;
  current.lastAccessTs = now;
  if (storeSlug) current.storeSlug = storeSlug;
  if (storeId) current.storeId = storeId;
  storeAccessStats.set(key, current);
}

function listarLojasMaisAtivas(limit = 20) {
  return [...storeAccessStats.values()]
    .sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return b.lastAccessTs - a.lastAccessTs;
    })
    .slice(0, Math.max(1, Number(limit || 20)));
}

async function salvarNoCache(key, data, ttlSeconds) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`[CACHE] WRITE_ERROR key=${key} erro=${err.message}`);
  }
}

function triggerSWRRefresh(key, fn, ttlSeconds, meta) {
  if (!redis || refreshInFlight.has(key)) return;
  refreshInFlight.add(key);
  setImmediate(async () => {
    try {
      console.log(`SWR: Background refresh triggered for ${key}`);
      const startedAt = Date.now();
      const data = await fn();
      const duration = Date.now() - startedAt;
      await salvarNoCache(key, data, ttlSeconds);
      trackStoreAccess(meta);
      console.log(`[CACHE] SWR_REFRESH key=${key} db_ms=${duration}`);
    } catch (err) {
      console.warn(`[CACHE] SWR_REFRESH_ERROR key=${key} erro=${err.message}`);
    } finally {
      refreshInFlight.delete(key);
    }
  });
}

async function carregarDoBancoESalvar(key, fn, ttlSeconds, meta, motivoLog) {
  const startedAt = Date.now();
  const data = await fn();
  const duration = Date.now() - startedAt;
  await salvarNoCache(key, data, ttlSeconds);
  trackStoreAccess(meta);
  console.log(`[CACHE] ${motivoLog} key=${key} db_ms=${duration}`);
  return data;
}

async function cacheOuBuscar(key, fn, ttlOrOptions = 300) {
  const opts = normalizeOptions(ttlOrOptions);
  const ttlSeconds = Math.max(1, Number(opts.ttlSeconds || 300));

  if (!redis) {
    return carregarDoBancoESalvar(key, fn, ttlSeconds, opts.meta, 'MISS_NO_REDIS');
  }

  if (opts.forceRefresh) {
    return carregarDoBancoESalvar(key, fn, ttlSeconds, opts.meta, 'FORCE_REFRESH');
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      trackStoreAccess(opts.meta);
      console.log(`[CACHE] HIT key=${key}`);
      if (!opts.disableSWR) {
        const ttlRemaining = await redis.ttl(key).catch(() => -1);
        const threshold = Math.max(1, Math.floor(ttlSeconds * Math.max(0, Math.min(1, opts.swrThresholdRatio))));
        if (ttlRemaining > 0 && ttlRemaining <= threshold) {
          triggerSWRRefresh(key, fn, ttlSeconds, opts.meta);
        }
      }
      return JSON.parse(cached);
    }
    console.log(`[CACHE] MISS key=${key}`);
  } catch (err) {
    console.warn(`[CACHE] READ_ERROR key=${key} erro=${err.message}`);
  }

  if (inFlightByKey.has(key)) {
    return inFlightByKey.get(key);
  }

  const inFlight = carregarDoBancoESalvar(key, fn, ttlSeconds, opts.meta, 'MISS')
    .finally(() => {
      inFlightByKey.delete(key);
    });
  inFlightByKey.set(key, inFlight);
  return inFlight;
}

/**
 * Invalida cache por padrão de chave (ex: "lojas:*")
 */
async function invalidarCache(pattern) {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
    console.log(`[CACHE] INVALIDATE pattern=${pattern} keys=${keys.length}`);
  } catch (err) {
    console.warn(`[CACHE] INVALIDATE_ERROR pattern=${pattern} erro=${err.message}`);
  }
}

function getRedis() {
  return redis;
}

module.exports = { cacheOuBuscar, invalidarCache, getRedis, listarLojasMaisAtivas };
