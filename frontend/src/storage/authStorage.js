const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.erro || `Erro ${res.status}`);
  }
  return res.status === 204 ? null : res.json().catch(() => ({}));
}

export function createSessionCookie(idToken) {
  return request('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export function refreshSessionCookie(idToken) {
  return request('/auth/session/refresh', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export function clearSessionCookie() {
  return request('/auth/session', { method: 'DELETE' });
}
