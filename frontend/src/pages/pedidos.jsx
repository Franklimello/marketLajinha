import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import SEO from '../componentes/SEO'
import { FiClock, FiCheck, FiTruck, FiX, FiPackage, FiStar } from 'react-icons/fi'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_STEPS = [
  { key: 'APPROVED', label: 'Confirmado', icon: FiPackage },
  { key: 'IN_ROUTE', label: 'Saiu p/ entrega', icon: FiTruck },
  { key: 'DELIVERED', label: 'Entregue', icon: FiCheck },
]

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  APPROVED: { label: 'Confirmado', cor: 'bg-blue-100 text-blue-700', icon: FiPackage },
  IN_ROUTE: { label: 'Saiu p/ entrega', cor: 'bg-purple-100 text-purple-700', icon: FiTruck },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700', icon: FiCheck },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700', icon: FiX },
}

function StatusTracker({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
        <FiX className="text-red-500" />
        <span className="text-sm font-medium text-red-700">Pedido cancelado</span>
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status)

  return (
    <div className="flex items-center gap-1 w-full">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const Icon = step.icon
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              done ? 'bg-amber-500 text-white scale-105' : 'bg-stone-100 text-stone-400'
            } ${i === currentIdx ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}>
              <Icon size={14} />
            </div>
            <span className={`text-[10px] text-center leading-tight ${done ? 'text-amber-700 font-semibold' : 'text-stone-400'}`}>
              {step.label}
            </span>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`hidden`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AvaliacaoInline({ pedidoId }) {
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar() {
    if (nota === 0) return
    setEnviando(true)
    setErro('')
    try {
      await api.avaliacoes.criar({ pedido_id: pedidoId, nota, comentario })
      setEnviado(true)
    } catch (e) {
      if (e.message.includes('já avaliou')) setEnviado(true)
      else setErro(e.message)
    } finally { setEnviando(false) }
  }

  if (enviado) return (
    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mt-2">
      <FiCheck /> Avaliação enviada!
    </div>
  )

  return (
    <div className="mt-2 pt-2 border-t border-stone-100">
      <p className="text-xs text-stone-500 mb-1.5">Avalie este pedido:</p>
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setNota(n)} className="p-0.5">
              <FiStar className={`text-lg ${n <= nota ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`} />
            </button>
          ))}
        </div>
        {nota > 0 && (
          <button onClick={enviar} disabled={enviando} className="text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50">
            {enviando ? '...' : 'Enviar'}
          </button>
        )}
      </div>
      {nota > 0 && (
        <input
          type="text"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentário (opcional)"
          className="w-full mt-1.5 px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
        />
      )}
      {erro && <p className="text-[10px] text-red-500 mt-1">{erro}</p>}
    </div>
  )
}

export default function PedidosPage() {
  const { logado, carregando: authCarregando, cliente } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const socketRef = useRef(null)

  const carregar = useCallback(async () => {
    if (authCarregando) return
    if (!logado) { setCarregando(false); return }
    try { setPedidos(await api.pedidos.meus()) } catch { /* ignore */ }
    finally { setCarregando(false) }
  }, [logado, authCarregando])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!cliente?.id) return

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join:cliente', cliente.id)
    })

    socket.on('pedido:atualizado', (pedidoAtualizado) => {
      setPedidos((prev) => prev.map((p) => p.id === pedidoAtualizado.id ? { ...pedidoAtualizado, loja: p.loja } : p))
    })

    return () => { socket.disconnect() }
  }, [cliente?.id])

  if (authCarregando || carregando) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex justify-between">
              <div className="skeleton h-5 rounded w-1/3" />
              <div className="skeleton h-5 rounded-full w-20" />
            </div>
            <div className="skeleton h-3 rounded w-2/3" />
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="flex justify-between">
              <div className="skeleton h-4 rounded w-1/4" />
              <div className="skeleton h-4 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!logado) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 text-sm mb-4">Faça login para ver seus pedidos</p>
        <Link to="/login" className="inline-block px-6 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 text-sm">Entrar</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <SEO title="Meus pedidos" noIndex />
      <h1 className="text-xl font-bold text-stone-900 mb-4">Meus pedidos</h1>

      {pedidos.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-stone-400 text-sm">Você ainda não fez nenhum pedido.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-amber-600 font-medium hover:underline">Ver lojas</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING
            const Icon = st.icon
            return (
              <div key={p.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {p.loja?.logo_url && <img src={p.loja.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                    <div>
                      <span className="text-sm font-semibold text-stone-900">{p.loja?.nome || 'Loja'}</span>
                      <p className="text-[10px] text-stone-400">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')} às {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-amber-700">R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                </div>

                {/* Tracker visual */}
                <div className="mb-3">
                  <StatusTracker status={p.status} />
                </div>

                <div className="space-y-0.5">
                  {p.itens?.map((i) => (
                    <p key={i.id} className="text-xs text-stone-600">
                      {i.quantidade}x {i.produto?.nome || 'Produto'}
                      {i.variacao_nome && ` (${i.variacao_nome})`}
                    </p>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{p.forma_pagamento}</span>
                    {p.tipo_entrega === 'RETIRADA' && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">Retirada</span>}
                    {p.agendado_para && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Agendado</span>}
                  </div>
                </div>
                {p.status === 'DELIVERED' && <AvaliacaoInline pedidoId={p.id} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
