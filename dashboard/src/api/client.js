const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

let getToken = () => null

export function setTokenGetter(fn) {
  getToken = fn
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const token = await getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }
  const res = await fetch(url, { ...options, headers, credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.detalhes ? `${err.erro} ${err.detalhes}` : (err.erro || `Erro ${res.status}`)
    throw new Error(msg)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  lojas: {
    criar: (data) => request('/lojas', { method: 'POST', body: JSON.stringify(data) }),
    minha: () => request('/lojas/minha'),
    atualizar: (id, data) => request(`/lojas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggle: (id, aberta) => request(`/lojas/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ aberta }) }),
    voltarAutomatico: (id) => request(`/lojas/${id}/automatico`, { method: 'PATCH' }),
  },
  produtos: {
    listar: (lojaId, pagina = 1) => request(`/produtos?loja_id=${lojaId}&pagina=${pagina}`),
    criar: (data) => request('/produtos', { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (id) => request(`/produtos/${id}`, { method: 'DELETE' }),
  },
  bairros: {
    listar: (lojaId) => request(`/lojas/${lojaId}/bairros`),
    criar: (lojaId, nome, taxa) =>
      request(`/lojas/${lojaId}/bairros`, { method: 'POST', body: JSON.stringify({ nome, taxa }) }),
    criarLote: (lojaId, bairros) =>
      request(`/lojas/${lojaId}/bairros/lote`, { method: 'POST', body: JSON.stringify({ bairros }) }),
    atualizar: (lojaId, id, data) =>
      request(`/lojas/${lojaId}/bairros/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (lojaId, id) =>
      request(`/lojas/${lojaId}/bairros/${id}`, { method: 'DELETE' }),
  },
  pedidos: {
    listar: () => request('/pedidos'),
    buscar: (id) => request(`/pedidos/${id}`),
    atualizarStatus: (id, status) =>
      request(`/pedidos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    atualizar: (id, data) =>
      request(`/pedidos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (id) => request(`/pedidos/${id}`, { method: 'DELETE' }),
  },
  usuarios: {
    salvarFcmToken: (token) => request('/usuarios/me/fcm-token', { method: 'POST', body: JSON.stringify({ token }) }),
  },
  cupons: {
    listar: () => request('/cupons'),
    buscar: (id) => request(`/cupons/${id}`),
    criar: (data) => request('/cupons', { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/cupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (id) => request(`/cupons/${id}`, { method: 'DELETE' }),
  },
  impressoras: {
    listar: () => request('/impressoras'),
    criar: (data) => request('/impressoras', { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/impressoras/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (id) => request(`/impressoras/${id}`, { method: 'DELETE' }),
    testar: (id) => request(`/impressoras/${id}/testar`, { method: 'POST' }),
    imprimir: (pedidoId) => request(`/impressoras/imprimir/${pedidoId}`, { method: 'POST' }),
    obterToken: () => request('/impressoras/token'),
    gerarToken: () => request('/impressoras/token/gerar', { method: 'POST' }),
  },
  combos: {
    listar: () => request('/combos'),
    buscar: (id) => request(`/combos/${id}`),
    criar: (data) => request('/combos', { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/combos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (id) => request(`/combos/${id}`, { method: 'DELETE' }),
  },
  motoboys: {
    listar: () => request('/motoboys'),
    buscar: (id) => request(`/motoboys/${id}`),
    criar: (data) => request('/motoboys', { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (id, data) => request(`/motoboys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (id) => request(`/motoboys/${id}`, { method: 'DELETE' }),
  },
  chat: {
    mensagens: (pedidoId) => request(`/chat/${pedidoId}/mensagens`),
    enviar: (pedidoId, conteudo) => request(`/chat/${pedidoId}/mensagens/loja`, { method: 'POST', body: JSON.stringify({ conteudo }) }),
    naoLidas: () => request('/chat/nao-lidas'),
  },
  admin: {
    stats: () => request('/admin/stats'),
    listarLojas: () => request('/admin/lojas'),
    buscarLoja: (id) => request(`/admin/lojas/${id}`),
    listarCobrancasLoja: (lojaId) => request(`/admin/cobrancas/loja/${lojaId}`),
    gerarCobrancaLoja: (lojaId, payload) => request(`/admin/cobrancas/loja/${lojaId}/gerar`, { method: 'POST', body: JSON.stringify(payload) }),
    bloquearLoja: (id) => request(`/admin/lojas/${id}/bloquear`, { method: 'PATCH' }),
    desbloquearLoja: (id) => request(`/admin/lojas/${id}/desbloquear`, { method: 'PATCH' }),
    excluirLoja: (id) => request(`/admin/lojas/${id}`, { method: 'DELETE' }),
    listarMotoboys: () => request('/admin/motoboys'),
    resetSenhaMotoboy: (id, novaSenha) => request(`/admin/motoboys/${id}/reset-senha`, { method: 'PATCH', body: JSON.stringify({ novaSenha }) }),
    listarLojistas: () => request('/admin/lojistas'),
    resetSenhaLojista: (id, novaSenha) => request(`/admin/lojistas/${id}/reset-senha`, { method: 'PATCH', body: JSON.stringify({ novaSenha }) }),
  },
}
