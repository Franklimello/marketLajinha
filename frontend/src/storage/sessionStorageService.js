const PREFIX = 'uaifood:session:';

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
    sessionStorage.setItem(keyOf(key), JSON.stringify(sanitize(value)));
  } catch {
    // noop
  }
}

export function getItem(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(keyOf(key));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function removeItem(key) {
  try {
    sessionStorage.removeItem(keyOf(key));
  } catch {
    // noop
  }
}

export function clear() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // noop
  }
}
