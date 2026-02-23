import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import {
  FiClipboard,
  FiDollarSign,
  FiPackage,
  FiTruck,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiAlertTriangle,
  FiBarChart2,
  FiArrowRight,
} from 'react-icons/fi'

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  APPROVED: { label: 'Aprovado', cor: 'bg-blue-100 text-blue-700', icon: FiCheckCircle },
  IN_ROUTE: { label: 'Em rota', cor: 'bg-purple-100 text-purple-700', icon: FiTruck },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700', icon: FiCheckCircle },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700', icon: FiXCircle },
}

function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1).replace('.', ',')}%`
}

export default function Dashboard() {
  const { loja } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [produtos, setProdutos] = useState({ dados: [], total: 0 })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!loja) return
    setErro('')
    setCarregando(true)
    Promise.all([
      api.pedidos.listar().catch(() => []),
      api.produtos.listar(loja.id, 1).catch(() => ({ dados: [], total: 0 })),
    ]).then(([ped, prod]) => {
      setPedidos(Array.isArray(ped) ? ped : [])
      setProdutos(prod)
    }).catch(() => {
      setErro('Não foi possível carregar os indicadores agora. Tente novamente em instantes.')
    }).finally(() => setCarregando(false))
  }, [loja])

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando...</div>
  }

  const indicadores = useMemo(() => {
    const hoje = new Date()
    const inicio7Dias = new Date()
    inicio7Dias.setDate(hoje.getDate() - 6)
    inicio7Dias.setHours(0, 0, 0, 0)

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const isHoje = (d) => d.toDateString() === hoje.toDateString()

    const pedidosHoje = pedidos.filter((p) => isHoje(new Date(p.created_at)))
    const pedidos7Dias = pedidos.filter((p) => new Date(p.created_at) >= inicio7Dias)
    const pedidosMes = pedidos.filter((p) => new Date(p.created_at) >= inicioMes)
    const pendentes = pedidos.filter((p) => p.status === 'PENDING')
    const cancelados = pedidos.filter((p) => p.status === 'CANCELLED')
    const concluidos = pedidos.filter((p) => p.status === 'DELIVERED')

    const faturamentoTotal = pedidos
      .filter((p) => p.status !== 'CANCELLED')
      .reduce((acc, p) => acc + Number(p.total || 0), 0)
    const faturamentoHoje = pedidosHoje
      .filter((p) => p.status !== 'CANCELLED')
      .reduce((acc, p) => acc + Number(p.total || 0), 0)
    const faturamento7Dias = pedidos7Dias
      .filter((p) => p.status !== 'CANCELLED')
      .reduce((acc, p) => acc + Number(p.total || 0), 0)

    const totalValidosHoje = pedidosHoje.filter((p) => p.status !== 'CANCELLED').length
    const ticketMedioHoje = totalValidosHoje > 0 ? faturamentoHoje / totalValidosHoje : 0

    const taxaCancelamento = pedidos.length > 0 ? (cancelados.length / pedidos.length) * 100 : 0
    const taxaConclusao = pedidos.length > 0 ? (concluidos.length / pedidos.length) * 100 : 0

    const statusCount = {
      PENDING: 0,
      APPROVED: 0,
      IN_ROUTE: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    }
    for (const p of pedidos) {
      if (statusCount[p.status] !== undefined) statusCount[p.status] += 1
    }

    const pedidosOrdenados = [...pedidos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const recentes = pedidosOrdenados.slice(0, 8)
    const ultimoPedido = pedidosOrdenados[0]

    const horaPicoMap = {}
    for (const p of pedidos7Dias) {
      const h = new Date(p.created_at).getHours()
      horaPicoMap[h] = (horaPicoMap[h] || 0) + 1
    }
    const horaPico = Object.keys(horaPicoMap).length > 0
      ? Number(Object.entries(horaPicoMap).sort((a, b) => b[1] - a[1])[0][0])
      : null

    const topProdutosMap = {}
    for (const p of pedidos7Dias) {
      for (const item of (p.itens || [])) {
        const nome = item?.produto?.nome || item?.produto_nome || 'Produto'
        topProdutosMap[nome] = (topProdutosMap[nome] || 0) + Number(item.quantidade || 0)
      }
    }
    const topProdutos = Object.entries(topProdutosMap)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)

    return {
      pedidosHoje,
      pedidos7Dias,
      pedidosMes,
      pendentes,
      faturamentoTotal,
      faturamentoHoje,
      faturamento7Dias,
      ticketMedioHoje,
      taxaCancelamento,
      taxaConclusao,
      statusCount,
      recentes,
      ultimoPedido,
      horaPico,
      topProdutos,
    }
  }, [pedidos])

  const cards = [
    { label: 'Pedidos hoje', valor: indicadores.pedidosHoje.length, icon: FiClipboard, cor: 'text-amber-600 bg-amber-50' },
    { label: 'Faturamento hoje', valor: formatCurrency(indicadores.faturamentoHoje), icon: FiDollarSign, cor: 'text-green-600 bg-green-50' },
    { label: 'Ticket médio hoje', valor: formatCurrency(indicadores.ticketMedioHoje), icon: FiTrendingUp, cor: 'text-sky-600 bg-sky-50' },
    { label: 'Pedidos 7 dias', valor: indicadores.pedidos7Dias.length, icon: FiBarChart2, cor: 'text-purple-600 bg-purple-50' },
    { label: 'Pendentes agora', valor: indicadores.pendentes.length, icon: FiClock, cor: 'text-yellow-600 bg-yellow-50' },
    { label: 'Produtos cadastrados', valor: produtos.total || 0, icon: FiPackage, cor: 'text-blue-600 bg-blue-50' },
    { label: 'Pedidos no mês', valor: indicadores.pedidosMes.length, icon: FiTruck, cor: 'text-indigo-600 bg-indigo-50' },
    { label: 'Faturamento total', valor: formatCurrency(indicadores.faturamentoTotal), icon: FiDollarSign, cor: 'text-emerald-600 bg-emerald-50' },
  ]

  const statusCards = [
    { key: 'PENDING', label: 'Pendentes', cor: 'bg-yellow-100 text-yellow-700' },
    { key: 'APPROVED', label: 'Aprovados', cor: 'bg-blue-100 text-blue-700' },
    { key: 'IN_ROUTE', label: 'Em rota', cor: 'bg-purple-100 text-purple-700' },
    { key: 'DELIVERED', label: 'Entregues', cor: 'bg-green-100 text-green-700' },
    { key: 'CANCELLED', label: 'Cancelados', cor: 'bg-red-100 text-red-700' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Painel de controle</h1>
        <p className="text-stone-500 text-sm mt-1">
          Visão estratégica da operação da sua loja
          {loja?.nome ? ` - ${loja.nome}` : ''}
        </p>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-white rounded-xl border border-stone-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Pedidos por status</h2>
            <Link to="/pedidos" className="text-sm text-amber-600 hover:underline">Gerenciar pedidos</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {statusCards.map((s) => {
              const total = pedidos.length || 1
              const valor = indicadores.statusCount[s.key]
              const pct = (valor / total) * 100
              return (
                <div key={s.key} className="border border-stone-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-stone-600">{s.label}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cor}`}>
                      {valor}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-900 mb-4">Saúde da operação</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <FiTrendingUp className="text-green-600 mt-0.5" />
              <div>
                <p className="text-stone-900 font-medium">Taxa de conclusão</p>
                <p className="text-stone-500">{formatPercent(indicadores.taxaConclusao)} dos pedidos foram entregues.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiAlertTriangle className="text-red-600 mt-0.5" />
              <div>
                <p className="text-stone-900 font-medium">Taxa de cancelamento</p>
                <p className="text-stone-500">{formatPercent(indicadores.taxaCancelamento)} do total de pedidos.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiClock className="text-amber-600 mt-0.5" />
              <div>
                <p className="text-stone-900 font-medium">Hora de maior movimento</p>
                <p className="text-stone-500">
                  {indicadores.horaPico === null ? 'Sem dados suficientes nos últimos 7 dias.' : `Por volta de ${String(indicadores.horaPico).padStart(2, '0')}:00.`}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-stone-100 text-stone-500">
              Último pedido:{' '}
              {indicadores.ultimoPedido ? (
                <span className="font-medium text-stone-800">{formatDate(indicadores.ultimoPedido.created_at)}</span>
              ) : 'nenhum pedido registrado'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-white rounded-xl border border-stone-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-900">Produtos mais vendidos (7 dias)</h2>
            <Link to="/produtos" className="text-sm text-amber-600 hover:underline">Ver cardápio</Link>
          </div>
          {indicadores.topProdutos.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">Ainda sem dados suficientes para ranking de produtos.</p>
          ) : (
            <div className="space-y-2">
              {indicadores.topProdutos.map((item, idx) => (
                <div key={item.nome} className="flex items-center justify-between border border-stone-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-stone-700 truncate">{item.nome}</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900">{item.quantidade} un.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-900 mb-3">Ações rápidas</h2>
          <div className="space-y-2">
            <Link to="/pedidos" className="flex items-center justify-between text-sm text-stone-700 hover:bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
              Ir para Pedidos
              <FiArrowRight />
            </Link>
            <Link to="/produtos" className="flex items-center justify-between text-sm text-stone-700 hover:bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
              Gerenciar cardápio
              <FiArrowRight />
            </Link>
            <Link to="/minha-loja" className="flex items-center justify-between text-sm text-stone-700 hover:bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
              Atualizar dados da loja
              <FiArrowRight />
            </Link>
            <Link to="/cupons" className="flex items-center justify-between text-sm text-stone-700 hover:bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
              Criar campanhas de cupom
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>

      {indicadores.pendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-yellow-800 flex items-center gap-2">
              <FiClock /> {indicadores.pendentes.length} pedido(s) pendente(s)
            </h2>
            <Link to="/pedidos" className="text-sm text-yellow-700 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {indicadores.pendentes.slice(0, 3).map((p) => (
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
        {indicadores.recentes.length === 0 ? (
          <p className="p-8 text-center text-stone-400">Nenhum pedido ainda.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {indicadores.recentes.map((p) => {
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
