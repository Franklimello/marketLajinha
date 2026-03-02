import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

function getMesAtualLabel(mesReferencia) {
  const [ano, mes] = String(mesReferencia || '').split('-')
  const anoNum = Number(ano)
  const mesNum = Number(mes)
  if (!anoNum || !mesNum) return ''
  const dt = new Date(anoNum, mesNum - 1, 1)
  return dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function useMonthlyCityRanking({ cidadeId, currentUserId = '' }) {
  const rankingQuery = useQuery({
    queryKey: ['ranking-mensal-cidade', cidadeId, currentUserId],
    queryFn: () => api.ranking.mensalCidade(cidadeId),
    enabled: Boolean(cidadeId),
    staleTime: 1000 * 60 * 60 * 12,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })

  const data = rankingQuery.data || {}
  const top3 = Array.isArray(data.top3) ? data.top3 : []
  const top10 = Array.isArray(data.top10) ? data.top10 : []

  const result = useMemo(() => ({
    userPosition: Number(data.userPosition || 0),
    userPedidosMes: Number(data.userPedidosMes || 0),
    userRankingPublico: Boolean(data.userRankingPublico ?? true),
    faltamParaTop3: Number(data.faltamParaTop3 || 0),
    top3,
    top10,
    totalParticipantes: Number(data.totalParticipantes || 0),
    diasRestantes: Number(data.diasRestantes || 0),
    mesReferencia: String(data.mesReferencia || ''),
    mesLabel: getMesAtualLabel(String(data.mesReferencia || '')),
    isLoading: rankingQuery.isLoading,
    isFetching: rankingQuery.isFetching,
    error: rankingQuery.error,
    refetch: rankingQuery.refetch,
  }), [data, top3, top10, rankingQuery.error, rankingQuery.isFetching, rankingQuery.isLoading, rankingQuery.refetch])

  return result
}

