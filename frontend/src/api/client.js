const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

let getTokenFn = () => null
export function setTokenGetter(fn) { getTokenFn = fn }

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const token = await getTokenFn()
  const res = await fetch(url, {
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

export const api = {
  lojas: {
    listarAtivas: () => request('/lojas/ativos'),
    buscarPorSlug: (slug) => request(`/lojas/slug/${slug}`),
    buscarPorId: (id) => request(`/lojas/${id}`),
    produtos: (lojaIdOuSlug, pagina = 1) =>
      request(`/lojas/${lojaIdOuSlug}/produtos?pagina=${pagina}`),
    bairros: (lojaId) => request(`/lojas/${lojaId}/bairros`),
    gerarPix: (lojaId, valor, pedidoId) =>
      request(`/lojas/${lojaId}/pix`, {
        method: 'POST',
        body: JSON.stringify({ valor, pedido_id: pedidoId }),
      }),
  },
  combos: {
    listarPorLoja: (lojaId) => request(`/combos/loja/${lojaId}`),
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
    listarPorLoja: (lojaId, pagina = 1) => request(`/avaliacoes/loja/${lojaId}?pagina=${pagina}`),
    mediaPorLoja: (lojaId) => request(`/avaliacoes/loja/${lojaId}/media`),
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
