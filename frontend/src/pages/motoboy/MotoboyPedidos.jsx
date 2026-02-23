import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiTruck, FiLogOut, FiRefreshCw, FiCheckCircle, FiNavigation, FiClock, FiPhone, FiMapPin } from 'react-icons/fi'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_CONFIG = {
  APPROVED: { label: 'Aprovado', cor: 'bg-blue-100 text-blue-700', icon: FiClock },
  IN_ROUTE: { label: 'Saiu p/ entrega', cor: 'bg-red-100 text-red-700', icon: FiNavigation },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700', icon: FiCheckCircle },
}

export default function MotoboyPedidos() {
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(null)
  const [motoboy, setMotoboy] = useState(null)
  const [confirmacao, setConfirmacao] = useState(null)

  const token = localStorage.getItem('motoboy_token')

  useEffect(() => {
    if (!token) { navigate('/motoboy'); return }
    try {
      const data = JSON.parse(localStorage.getItem('motoboy_data') || '{}')
      setMotoboy(data)
    } catch { navigate('/motoboy') }
  }, [token, navigate])

  const carregar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/motoboys/pedidos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { logout(); return }
      const data = await res.json()
      setPedidos(Array.isArray(data) ? data : [])
    } catch {} finally { setLoading(false) }
  }, [token])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    const id = setInterval(carregar, 15000)
    return () => clearInterval(id)
  }, [carregar])

  function logout() {
    localStorage.removeItem('motoboy_token')
    localStorage.removeItem('motoboy_data')
    navigate('/motoboy')
  }

  async function mudarStatus(pedidoId, novoStatus) {
    setAtualizando(pedidoId)
    try {
      const res = await fetch(`${API_BASE}/motoboys/pedidos/${pedidoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setConfirmacao({ tipo: 'erro', msg: data.erro || 'Erro ao atualizar' })
        return
      }
      const label = novoStatus === 'IN_ROUTE' ? 'Saiu para entrega' : 'Entregue'
      setConfirmacao({ tipo: 'sucesso', msg: `Pedido #${pedidoId.slice(-6).toUpperCase()} — ${label}` })
      carregar()
    } catch { setConfirmacao({ tipo: 'erro', msg: 'Erro de conexão' }) }
    finally { setAtualizando(null) }
  }

  function formatarData(d) {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function formatarValor(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-30 bg-red-600 text-white shadow-md">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiTruck size={20} />
            <div>
              <p className="text-sm font-bold leading-tight">{motoboy?.nome || 'Motoboy'}</p>
              <p className="text-[10px] opacity-80">{motoboy?.loja?.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={carregar} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Atualizar">
              <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={logout} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Sair">
              <FiLogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900">Pedidos para entrega</h2>
          <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full">
            {pedidos.length} pedido(s)
          </span>
        </div>

        {loading && pedidos.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <FiTruck className="mx-auto text-stone-300 mb-3" size={48} />
            <p className="text-stone-500 text-sm">Nenhum pedido para entrega no momento.</p>
            <p className="text-stone-400 text-xs mt-1">Novos pedidos aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.APPROVED
              const Icon = cfg.icon
              return (
                <div key={p.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-stone-900">
                          Pedido #{p.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-stone-400">{formatarData(p.created_at)}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.cor}`}>
                        <Icon size={12} /> {cfg.label}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-2">
                        <FiMapPin className="text-stone-400 mt-0.5 flex-shrink-0" size={14} />
                        <div>
                          <p className="text-sm text-stone-700">{p.endereco}</p>
                          {p.bairro && <p className="text-xs text-stone-500">{p.bairro}</p>}
                        </div>
                      </div>
                      {p.telefone_cliente && (
                        <a href={`tel:${p.telefone_cliente}`} className="flex items-center gap-2 text-sm text-red-700 font-medium">
                          <FiPhone size={14} /> {p.telefone_cliente}
                        </a>
                      )}
                    </div>

                    <div className="bg-stone-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-stone-500 mb-1.5">Itens:</p>
                      {p.itens?.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-stone-700 py-0.5">
                          <span>{item.quantidade}x {item.produto?.nome || 'Produto'}</span>
                          <span>{formatarValor(item.preco_unitario * item.quantidade)}</span>
                        </div>
                      ))}
                      <div className="border-t border-stone-200 mt-2 pt-2 flex justify-between text-sm font-bold text-stone-900">
                        <span>Total</span>
                        <span>{formatarValor(p.total)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 mb-3">
                      <span className="font-semibold">Cliente:</span> {p.nome_cliente}
                    </p>

                    <div className="flex gap-2">
                      {p.status === 'APPROVED' && (
                        <button
                          onClick={() => mudarStatus(p.id, 'IN_ROUTE')}
                          disabled={atualizando === p.id}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <FiNavigation size={16} />
                          {atualizando === p.id ? 'Atualizando...' : 'Saiu para entrega'}
                        </button>
                      )}
                      {p.status === 'IN_ROUTE' && (
                        <button
                          onClick={() => mudarStatus(p.id, 'DELIVERED')}
                          disabled={atualizando === p.id}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <FiCheckCircle size={16} />
                          {atualizando === p.id ? 'Atualizando...' : 'Marcar entregue'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {confirmacao && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmacao(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs text-center p-6 animate-[scale-in_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            {confirmacao.tipo === 'sucesso' ? (
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiCheckCircle className="text-green-600" size={28} />
              </div>
            ) : (
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 text-2xl font-bold">!</span>
              </div>
            )}
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {confirmacao.tipo === 'sucesso' ? 'Status atualizado' : 'Erro'}
            </h3>
            <p className="text-sm text-stone-500 mb-5">{confirmacao.msg}</p>
            <button
              onClick={() => setConfirmacao(null)}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                confirmacao.tipo === 'sucesso' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
