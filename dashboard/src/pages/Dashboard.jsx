import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { FiClipboard, FiDollarSign, FiPackage, FiTruck, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi'

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  APPROVED: { label: 'Aprovado', cor: 'bg-blue-100 text-blue-700', icon: FiCheckCircle },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700', icon: FiCheckCircle },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700', icon: FiXCircle },
}

function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const { loja } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [produtos, setProdutos] = useState({ dados: [], total: 0 })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!loja) return
    Promise.all([
      api.pedidos.listar().catch(() => []),
      api.produtos.listar(loja.id, 1).catch(() => ({ dados: [], total: 0 })),
    ]).then(([ped, prod]) => {
      setPedidos(Array.isArray(ped) ? ped : [])
      setProdutos(prod)
    }).finally(() => setCarregando(false))
  }, [loja])

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando...</div>
  }

  const pedidosHoje = pedidos.filter((p) => {
    const hoje = new Date()
    const d = new Date(p.created_at)
    return d.toDateString() === hoje.toDateString()
  })

  const pendentes = pedidos.filter((p) => p.status === 'PENDING')
  const totalVendas = pedidos
    .filter((p) => p.status !== 'CANCELLED')
    .reduce((acc, p) => acc + Number(p.total || 0), 0)
  const vendasHoje = pedidosHoje
    .filter((p) => p.status !== 'CANCELLED')
    .reduce((acc, p) => acc + Number(p.total || 0), 0)

  const cards = [
    { label: 'Pedidos hoje', valor: pedidosHoje.length, icon: FiClipboard, cor: 'text-amber-600 bg-amber-50' },
    { label: 'Vendas hoje', valor: formatCurrency(vendasHoje), icon: FiDollarSign, cor: 'text-green-600 bg-green-50' },
    { label: 'Pendentes', valor: pendentes.length, icon: FiClock, cor: 'text-yellow-600 bg-yellow-50' },
    { label: 'Total produtos', valor: produtos.total, icon: FiPackage, cor: 'text-blue-600 bg-blue-50' },
    { label: 'Total pedidos', valor: pedidos.length, icon: FiTruck, cor: 'text-purple-600 bg-purple-50' },
    { label: 'Faturamento total', valor: formatCurrency(totalVendas), icon: FiDollarSign, cor: 'text-emerald-600 bg-emerald-50' },
  ]

  const recentes = [...pedidos]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Painel</h1>
        <p className="text-stone-500 text-sm mt-1">Resumo da sua loja</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${c.cor}`}>
              <c.icon className="text-xl" />
            </div>
            <div>
              <p className="text-sm text-stone-500">{c.label}</p>
              <p className="text-xl font-bold text-stone-900">{c.valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pedidos pendentes */}
      {pendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-yellow-800 flex items-center gap-2">
              <FiClock /> {pendentes.length} pedido(s) pendente(s)
            </h2>
            <Link to="/pedidos" className="text-sm text-yellow-700 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {pendentes.slice(0, 3).map((p) => (
              <div key={p.id} className="bg-white rounded-lg p-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-stone-900">{p.nome_cliente}</span>
                  <span className="text-stone-400 ml-2">{formatDate(p.created_at)}</span>
                </div>
                <span className="font-semibold text-stone-900">{formatCurrency(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pedidos recentes */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Pedidos recentes</h2>
          <Link to="/pedidos" className="text-sm text-amber-600 hover:underline">
            Ver todos
          </Link>
        </div>
        {recentes.length === 0 ? (
          <p className="p-8 text-center text-stone-400">Nenhum pedido ainda.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentes.map((p) => {
              const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING
              return (
                <Link
                  key={p.id}
                  to={`/pedidos/${p.id}`}
                  className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="font-medium text-stone-900 text-sm">{p.nome_cliente}</p>
                      <p className="text-xs text-stone-400">{formatDate(p.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cor}`}>
                      {st.label}
                    </span>
                    <span className="font-semibold text-stone-900 text-sm whitespace-nowrap">
                      {formatCurrency(p.total)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
