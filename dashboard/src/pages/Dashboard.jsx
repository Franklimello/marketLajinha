import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import DashboardUAIFOOD from '../components/DashboardUAIFOOD'

export default function Dashboard() {
  const { loja } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!loja) return
    let cancelado = false
    setErro('')
    setCarregando(true)

    async function carregarPedidosPainel() {
      try {
        const limite = 100
        const primeira = await api.pedidos.listar({
          pagina: 1,
          limite,
          include_finalizados: true,
        }).catch(() => ({ dados: [] }))

        const pedidosPrimeiraPagina = Array.isArray(primeira)
          ? primeira
          : (Array.isArray(primeira?.dados) ? primeira.dados : [])

        let acumulado = [...pedidosPrimeiraPagina]
        const totalPaginas = Number(primeira?.total_paginas || 1)

        if (totalPaginas > 1) {
          const paginasExtras = []
          for (let p = 2; p <= totalPaginas; p += 1) {
            paginasExtras.push(
              api.pedidos.listar({ pagina: p, limite, include_finalizados: true })
                .catch(() => ({ dados: [] }))
            )
          }
          const respostas = await Promise.all(paginasExtras)
          for (const resp of respostas) {
            const lista = Array.isArray(resp)
              ? resp
              : (Array.isArray(resp?.dados) ? resp.dados : [])
            acumulado = acumulado.concat(lista)
          }
        }

        if (cancelado) return
        setPedidos(acumulado)
      } catch {
        if (!cancelado) {
          setErro('Não foi possível carregar os indicadores agora. Tente novamente em instantes.')
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregarPedidosPainel()

    return () => {
      cancelado = true
    }
  }, [loja])

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando...</div>
  }

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
      <DashboardUAIFOOD pedidos={pedidos} />
    </div>
  )
}
