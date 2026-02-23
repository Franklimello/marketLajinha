import {
  getCache as getOfflineCache,
  setCache as setOfflineCache,
  makeCityKey,
  OFFLINE_STORES,
} from '../storage/offlineDatabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

let getTokenFn = () => null
export function setTokenGetter(fn) { getTokenFn = fn }

const cache = new Map()
const CACHE_TTL = 60_000

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

export function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const token = await getTokenFn()
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.erro || `Erro ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

function offlineMetaForPath(path) {
  if (path.startsWith('/lojas/home') || path.startsWith('/lojas/ativos')) {
    const url = new URL(path, 'http://local')
    const cidade = url.searchParams.get('cidade') || 'all'
    return { store: OFFLINE_STORES.lojasCidade, key: makeCityKey('lojas', cidade), ttl: 1000 * 60 * 15 }
  }
  if (path.includes('/produtos')) {
    return { store: OFFLINE_STORES.produtosCidade, key: path, ttl: 1000 * 60 * 10 }
  }
  if (path.startsWith('/pedidos/meus')) {
    return { store: OFFLINE_STORES.pedidosHistorico, key: 'pedidos:meus', ttl: 1000 * 60 * 5 }
  }
  return null
}

async function cachedRequest(path) {
  const cached = getCached(path)
  if (cached) return cached

  const offlineMeta = offlineMetaForPath(path)
  if (!navigator.onLine && offlineMeta) {
    const offline = await getOfflineCache(offlineMeta.store, offlineMeta.key, offlineMeta.ttl)
    if (offline) return offline
  }

  try {
    const data = await request(path)
    setCache(path, data)
    if (offlineMeta) await setOfflineCache(offlineMeta.store, offlineMeta.key, data)
    return data
  } catch (err) {
    if (offlineMeta) {
      const offline = await getOfflineCache(offlineMeta.store, offlineMeta.key, offlineMeta.ttl)
      if (offline) return offline
    }
    throw err
  }
}

export const api = {
  lojas: {
    home: () => cachedRequest('/lojas/home'),
    listarAtivas: () => cachedRequest('/lojas/ativos'),
    buscarPorSlug: (slug) => cachedRequest(`/lojas/slug/${slug}`),
    buscarPorId: (id) => cachedRequest(`/lojas/${id}`),
    produtos: (lojaIdOuSlug, pagina = 1) =>
      cachedRequest(`/lojas/${lojaIdOuSlug}/produtos?pagina=${pagina}`),
    bairros: (lojaId) => cachedRequest(`/lojas/${lojaId}/bairros`),
    gerarPix: (lojaId, valor, pedidoId) =>
      request(`/lojas/${lojaId}/pix`, {
        method: 'POST',
        body: JSON.stringify({ valor, pedido_id: pedidoId }),
      }),
  },
  combos: {
    listarPorLoja: (lojaId) => cachedRequest(`/combos/loja/${lojaId}`),
  },
  pedidos: {
    criar: (data) => request('/pedidos', { method: 'POST', body: JSON.stringify(data) }),
    meus: () => request('/pedidos/meus'),
  },
  cupons: {
    aplicar: (data) => request('/cupons/aplicar', { method: 'POST', body: JSON.stringify(data) }),
  },
  avaliacoes: {
    criar: (data) => request('/avaliacoes', { method: 'POST', body: JSON.stringify(data) }),
    listarPorLoja: (lojaId, pagina = 1) => cachedRequest(`/avaliacoes/loja/${lojaId}?pagina=${pagina}`),
    mediaPorLoja: (lojaId) => cachedRequest(`/avaliacoes/loja/${lojaId}/media`),
  },
  chat: {
    mensagens: (pedidoId) => request(`/chat/${pedidoId}/mensagens`),
    enviar: (pedidoId, conteudo) => request(`/chat/${pedidoId}/mensagens/cliente`, { method: 'POST', body: JSON.stringify({ conteudo }) }),
  },
  clientes: {
    me: () => request('/clientes/me'),
    cadastro: (data) => request('/clientes/cadastro', { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (data) => request('/clientes/me', { method: 'PUT', body: JSON.stringify(data) }),
    enderecos: () => request('/clientes/me/enderecos'),
    criarEndereco: (data) => request('/clientes/me/enderecos', { method: 'POST', body: JSON.stringify(data) }),
    atualizarEndereco: (id, data) => request(`/clientes/me/enderecos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    definirPadrao: (id) => request(`/clientes/me/enderecos/${id}/padrao`, { method: 'PATCH' }),
    excluirEndereco: (id) => request(`/clientes/me/enderecos/${id}`, { method: 'DELETE' }),
    salvarFcmToken: (token) => request('/clientes/me/fcm-token', { method: 'POST', body: JSON.stringify({ token }) }),
    removerFcmToken: (token) => request('/clientes/me/fcm-token', { method: 'DELETE', body: JSON.stringify({ token }) }),
  },
}
