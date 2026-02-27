import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { FiArrowLeft, FiClock, FiCheckCircle, FiXCircle, FiPrinter } from 'react-icons/fi'

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700', corBorda: 'border-yellow-300' },
  APPROVED: { label: 'Aprovado', cor: 'bg-blue-100 text-blue-700', corBorda: 'border-blue-300' },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700', corBorda: 'border-green-300' },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700', corBorda: 'border-red-300' },
}

const PAGAMENTO_MAP = {
  PIX: 'PIX',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  CASH: 'Dinheiro',
}
const PIX_ONLINE_TAG = '[PIX ONLINE]'

function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function isPixOnline(pedido) {
  return pedido?.forma_pagamento === 'PIX' && String(pedido?.observacao || '').includes(PIX_ONLINE_TAG)
}

export default function PedidoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [feedbackErro, setFeedbackErro] = useState('')

  useEffect(() => {
    api.pedidos.buscar(id)
      .then(setPedido)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [id])

  async function mudarStatus(novoStatus) {
    try {
      await api.pedidos.atualizarStatus(id, novoStatus)
      setPedido((prev) => ({ ...prev, status: novoStatus }))
    } catch (err) {
      setFeedbackErro(err.message || 'Não foi possível alterar o status do pedido.')
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando...</div>
  }

  if (erro || !pedido) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{erro || 'Pedido não encontrado.'}</p>
        <button onClick={() => navigate('/pedidos')} className="text-amber-600 hover:underline">
          Voltar aos pedidos
        </button>
      </div>
    )
  }

  const st = STATUS_MAP[pedido.status] || STATUS_MAP.PENDING
  const pixOnline = isPixOnline(pedido)

  const TIMELINE = ['PENDING', 'APPROVED', 'DELIVERED']
  const statusIndex = TIMELINE.indexOf(pedido.status)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          to="/pedidos"
          className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:border-stone-300"
        >
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Detalhes do pedido</h1>
          <p className="text-xs text-stone-400 font-mono">{pedido.id}</p>
        </div>
      </div>
      {feedbackErro && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-red-700">{feedbackErro}</p>
        </div>
      )}

      {/* Timeline de status */}
      {pedido.status !== 'CANCELLED' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between">
            {TIMELINE.map((s, i) => {
              const info = STATUS_MAP[s]
              const atingido = statusIndex >= i
              return (
                <div key={s} className="flex flex-col items-center flex-1 relative">
                  {i > 0 && (
                    <div
                      className={`absolute top-3 right-1/2 w-full h-0.5 z-0 ${
                        statusIndex >= i ? 'bg-amber-400' : 'bg-stone-200'
                      }`}
                    />
                  )}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                      atingido ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-400'
                    }`}
                  >
                    {atingido ? <FiCheckCircle className="text-xs" /> : <span className="text-xs">{i + 1}</span>}
                  </div>
                  <span className={`text-xs mt-2 ${atingido ? 'text-amber-700 font-medium' : 'text-stone-400'}`}>
                    {info.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pedido.status === 'CANCELLED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <FiXCircle className="text-3xl text-red-400 mx-auto mb-2" />
          <p className="font-semibold text-red-700">Pedido cancelado</p>
        </div>
      )}

      {pixOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">
            Pagamento PIX online. Confira o comprovante antes de aprovar.
          </p>
        </div>
      )}

      {/* Info do cliente */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-900 mb-4">Dados do cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-400">Nome</p>
            <p className="font-medium text-stone-900">{pedido.nome_cliente}</p>
          </div>
          <div>
            <p className="text-stone-400">Telefone</p>
            <p className="font-medium text-stone-900">{pedido.telefone_cliente}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-stone-400">Endereço</p>
            <p className="font-medium text-stone-900">{pedido.endereco || '—'}</p>
          </div>
          {pedido.observacao && (
            <div className="sm:col-span-2">
              <p className="text-stone-400">Observação</p>
              <p className="font-medium text-stone-700 bg-stone-50 rounded-lg p-3 mt-1">{pedido.observacao}</p>
            </div>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="p-5 border-b border-stone-200">
          <h2 className="font-semibold text-stone-900">Itens ({pedido.itens?.length || 0})</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {(pedido.itens || []).map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-stone-900 text-sm">{item.produto?.nome || 'Produto'}</p>
                <p className="text-xs text-stone-400">
                  {item.quantidade}x {formatCurrency(item.preco_unitario)}
                </p>
              </div>
              <span className="font-semibold text-stone-900 text-sm">
                {formatCurrency(Number(item.preco_unitario) * item.quantidade)}
              </span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-stone-200 flex justify-between items-center bg-stone-50 rounded-b-xl">
          <div className="text-sm text-stone-500">
            {PAGAMENTO_MAP[pedido.forma_pagamento] || pedido.forma_pagamento} &middot; {formatDate(pedido.created_at)}
          </div>
          <span className="text-xl font-bold text-stone-900">{formatCurrency(pedido.total)}</span>
        </div>
      </div>

      {/* Ações de status */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-900 mb-3">Alterar status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(STATUS_MAP).map(([key, val]) => (
            <button
              key={key}
              onClick={() => mudarStatus(key)}
              disabled={pedido.status === key}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pedido.status === key
                  ? `${val.cor} ring-2 ring-offset-1 ring-amber-400`
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 disabled:opacity-50'
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
