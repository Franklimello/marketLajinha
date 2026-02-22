const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;
let redis = null;

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
 * @param {number} ttlSeconds - tempo de vida em segundos (padrão 60)
 */
async function cacheOuBuscar(key, fn, ttlSeconds = 60) {
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  const data = await fn();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch {}
  }

  return data;
}

/**
 * Invalida cache por padrão de chave (ex: "lojas:*")
 */
async function invalidarCache(pattern) {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}

function getRedis() {
  return redis;
}

module.exports = { cacheOuBuscar, invalidarCache, getRedis };
