import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { FiClock, FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiPrinter } from 'react-icons/fi'

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Aprovado', cor: 'bg-blue-100 text-blue-700' },
  IN_ROUTE: { label: 'Saiu p/ entrega', cor: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700' },
}

const PAGAMENTO_MAP = {
  PIX: 'PIX',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  CASH: 'Dinheiro',
}

function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Pedidos() {
  const { loja } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [pedidoAberto, setPedidoAberto] = useState(null)

  useEffect(() => {
    if (!loja) return
    carregarPedidos()
  }, [loja])

  async function carregarPedidos() {
    setCarregando(true)
    try {
      const res = await api.pedidos.listar()
      setPedidos(Array.isArray(res) ? res : [])
    } catch {
      setPedidos([])
    } finally {
      setCarregando(false)
    }
  }

  async function mudarStatus(id, novoStatus) {
    try {
      await api.pedidos.atualizarStatus(id, novoStatus)
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)))
      if (pedidoAberto?.id === id) {
        setPedidoAberto((prev) => ({ ...prev, status: novoStatus }))
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const filtrados = pedidos
    .filter((p) => filtroStatus === 'TODOS' || p.status === filtroStatus)
    .filter((p) => {
      if (!busca) return true
      const q = busca.toLowerCase()
      return (
        p.nome_cliente?.toLowerCase().includes(q) ||
        p.telefone_cliente?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const contadores = {
    TODOS: pedidos.length,
    PENDING: pedidos.filter((p) => p.status === 'PENDING').length,
    APPROVED: pedidos.filter((p) => p.status === 'APPROVED').length,
    IN_ROUTE: pedidos.filter((p) => p.status === 'IN_ROUTE').length,
    DELIVERED: pedidos.filter((p) => p.status === 'DELIVERED').length,
    CANCELLED: pedidos.filter((p) => p.status === 'CANCELLED').length,
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando pedidos...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Pedidos</h1>
        <p className="text-stone-500 text-sm mt-1">{pedidos.length} pedido(s) no total</p>
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2">
        {Object.entries({ TODOS: 'Todos', ...Object.fromEntries(Object.entries(STATUS_MAP).map(([k, v]) => [k, v.label])) }).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltroStatus(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroStatus === key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {label} ({contadores[key] || 0})
            </button>
          )
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou ID..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <FiFilter className="text-3xl text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING
            return (
              <div
                key={p.id}
                onClick={() => setPedidoAberto(p)}
                className="bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900">{p.nome_cliente}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cor}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-stone-400 mt-1">{formatDate(p.created_at)}</p>
                    {p.endereco && (
                      <p className="text-sm text-stone-500 mt-1 truncate">{p.endereco}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-stone-900">{formatCurrency(p.total)}</p>
                    <p className="text-xs text-stone-400">{PAGAMENTO_MAP[p.forma_pagamento] || p.forma_pagamento}</p>
                  </div>
                </div>

                {p.itens && p.itens.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-xs text-stone-400 mb-1">{p.itens.length} item(ns)</p>
                    <div className="flex flex-wrap gap-1">
                      {p.itens.slice(0, 4).map((item, i) => (
                        <span key={i} className="text-xs bg-stone-50 text-stone-600 px-2 py-0.5 rounded">
                          {item.quantidade}x {item.produto?.nome || 'Produto'}
                        </span>
                      ))}
                      {p.itens.length > 4 && (
                        <span className="text-xs text-stone-400">+{p.itens.length - 4} mais</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal detalhes */}
      {pedidoAberto && (
        <ModalDetalhePedido
          pedido={pedidoAberto}
          onFechar={() => setPedidoAberto(null)}
          onMudarStatus={mudarStatus}
        />
      )}
    </div>
  )
}

function ModalDetalhePedido({ pedido, onFechar, onMudarStatus }) {
  const st = STATUS_MAP[pedido.status] || STATUS_MAP.PENDING
  const [imprimindo, setImprimindo] = useState(false)

  async function handleImprimir() {
    setImprimindo(true)
    try {
      const res = await api.impressoras.imprimir(pedido.id)
      const setores = res.setores || []
      const erros = setores.filter((s) => s.status === 'erro' || s.status === 'sem_impressora')
      if (erros.length === 0) {
        alert('Impressão enviada com sucesso!')
      } else {
        const msgs = erros.map((s) => `${s.setor}: ${s.erro || 'sem impressora cadastrada'}`).join('\n')
        alert(`Alguns setores não foram impressos:\n${msgs}`)
      }
    } catch (err) {
      alert(`Erro: ${err.message}`)
    } finally { setImprimindo(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Pedido</h2>
            <p className="text-xs text-stone-400 mt-0.5 font-mono">{pedido.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              disabled={imprimindo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
              title="Imprimir pedido"
            >
              <FiPrinter className={imprimindo ? 'animate-pulse' : ''} />
              {imprimindo ? 'Enviando...' : 'Imprimir'}
            </button>
            <button onClick={onFechar} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">
              &times;
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-medium text-stone-900">{pedido.nome_cliente}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Telefone</p>
              <p className="font-medium text-stone-900">{pedido.telefone_cliente}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Endereço</p>
              <p className="font-medium text-stone-900">{pedido.endereco || '—'}</p>
            </div>
            {pedido.observacao && (
              <div className="col-span-2">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Observação</p>
                <p className="text-sm text-stone-700 bg-stone-50 rounded-lg p-3">{pedido.observacao}</p>
              </div>
            )}
          </div>

          {/* Itens */}
          {pedido.itens && pedido.itens.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Itens do pedido</p>
              <div className="bg-stone-50 rounded-lg divide-y divide-stone-200">
                {pedido.itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <span className="font-medium text-stone-900">
                        {item.quantidade}x {item.produto?.nome || 'Produto'}
                      </span>
                    </div>
                    <span className="text-stone-600">
                      {formatCurrency(Number(item.preco_unitario) * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="bg-stone-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Pagamento</span>
              <span className="font-medium text-stone-900">{PAGAMENTO_MAP[pedido.forma_pagamento] || pedido.forma_pagamento}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Data</span>
              <span className="font-medium text-stone-900">{formatDate(pedido.created_at)}</span>
            </div>
            {Number(pedido.subtotal) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Subtotal</span>
                <span className="font-medium text-stone-900">{formatCurrency(pedido.subtotal)}</span>
              </div>
            )}
            {Number(pedido.desconto) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Desconto (cupom)</span>
                <span className="font-medium text-green-600">- {formatCurrency(pedido.desconto)}</span>
              </div>
            )}
            {Number(pedido.taxa_entrega) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Taxa entrega</span>
                <span className="font-medium text-stone-900">{formatCurrency(pedido.taxa_entrega)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-stone-200 pt-2 mt-2">
              <span className="font-semibold text-stone-900">Total</span>
              <span className="font-bold text-stone-900 text-lg">{formatCurrency(pedido.total)}</span>
            </div>
          </div>

          {/* Alterar status */}
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Alterar status</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => onMudarStatus(pedido.id, key)}
                  disabled={pedido.status === key}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pedido.status === key
                      ? `${val.cor} ring-2 ring-offset-1 ring-amber-400`
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
