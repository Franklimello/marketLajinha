const PREFIX = 'uaifood:';
const memoryCache = new Map();

function keyOf(key) {
  return `${PREFIX}${key}`;
}

function sanitize(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'function') continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return null;
}

export function setItem(key, value) {
  try {
    const safeValue = sanitize(value);
    const serialized = JSON.stringify(safeValue);
    localStorage.setItem(keyOf(key), serialized);
    memoryCache.set(key, safeValue);
  } catch {
    // ignora erro de quota/parsing para nao quebrar UX
  }
}

export function getItem(key, fallback = null) {
  try {
    if (memoryCache.has(key)) return memoryCache.get(key);
    const raw = localStorage.getItem(keyOf(key));
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(keyOf(key));
    memoryCache.delete(key);
  } catch {
    // noop
  }
}

export function clear() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    memoryCache.clear();
  } catch {
    // noop
  }
}
