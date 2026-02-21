import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import SEO from '../componentes/SEO'
import { FiClock, FiCheck, FiTruck, FiX } from 'react-icons/fi'

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  APPROVED: { label: 'Aprovado', cor: 'bg-blue-100 text-blue-700', icon: FiCheck },
  IN_ROUTE: { label: 'Saiu p/ entrega', cor: 'bg-purple-100 text-purple-700', icon: FiTruck },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700', icon: FiCheck },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700', icon: FiX },
}

export default function PedidosPage() {
  const { logado, carregando: authCarregando } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    if (authCarregando) return
    if (!logado) { setCarregando(false); return }
    try { setPedidos(await api.pedidos.meus()) } catch { /* ignore */ }
    finally { setCarregando(false) }
  }, [logado, authCarregando])

  useEffect(() => { carregar() }, [carregar])

  if (authCarregando || carregando) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {p.loja?.logo_url && <img src={p.loja.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                    <span className="text-sm font-semibold text-stone-900">{p.loja?.nome || 'Loja'}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.cor}`}>
                    <Icon className="text-[9px]" /> {st.label}
                  </span>
                </div>
                <div className="text-xs text-stone-400 mb-2">
                  {new Date(p.created_at).toLocaleDateString('pt-BR')} às {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                  </div>
                  <span className="text-sm font-bold text-amber-700">R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
