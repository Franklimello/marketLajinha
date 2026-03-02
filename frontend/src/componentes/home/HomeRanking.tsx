import { useState } from 'react'
import { api } from '../../api/client'
import { useMonthlyCityRanking } from '../../hooks/useMonthlyCityRanking'
import { getDisplayUser } from '../../utils/ranking'

function medalha(posicao) {
  if (posicao === 1) return '🥇'
  if (posicao === 2) return '🥈'
  if (posicao === 3) return '🥉'
  return `#${posicao}`
}

export default function HomeRanking({ cidadeId, cidadeNome, currentUserId = '' }) {
  const [expandido, setExpandido] = useState(false)
  const [ativandoPublico, setAtivandoPublico] = useState(false)
  const ranking = useMonthlyCityRanking({ cidadeId, currentUserId })

  if (!cidadeId) return null

  async function atualizarParticipacaoPublica(publico) {
    setAtivandoPublico(true)
    try {
      await api.clientes.atualizarRankingPublico(publico)
      await ranking.refetch()
    } finally {
      setAtivandoPublico(false)
    }
  }

  const listaExibida = expandido ? ranking.top10 : ranking.top3
  const mostraCardPessoal =
    (ranking.userPosition > 0 && ranking.userPosition <= 20) || !ranking.userRankingPublico

  return (
    <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-amber-800">
          🏆 Ranking de {cidadeNome || 'sua cidade'} - {ranking.mesLabel || 'mês atual'}
        </h3>
        <div className="flex flex-col items-end gap-1">
          {currentUserId ? (
            <button
              type="button"
              onClick={() => atualizarParticipacaoPublica(!ranking.userRankingPublico)}
              disabled={ativandoPublico || ranking.isLoading}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${
                ranking.userRankingPublico
                  ? 'border-green-300 bg-green-100 text-green-700'
                  : 'border-red-300 bg-red-100 text-red-700'
              } disabled:opacity-60`}
              title={ranking.userRankingPublico ? 'Você está no ranking público' : 'Você está fora do ranking público'}
            >
              {ativandoPublico
                ? 'Salvando...'
                : (ranking.userRankingPublico ? 'Público: ON' : 'Público: OFF')}
            </button>
          ) : null}
          <span className="text-[11px] font-semibold text-amber-700">
            ⏳ encerra em {ranking.diasRestantes} dia{ranking.diasRestantes === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {mostraCardPessoal && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2.5">
          <p className="text-sm font-semibold text-stone-800">
            {ranking.userPosition > 0
              ? `🏅 Você está em ${ranking.userPosition}º lugar este mês!`
              : '🏅 Faça seus pedidos e apareça no ranking deste mês!'}
          </p>
          {ranking.userPosition > 3 && ranking.faltamParaTop3 > 0 && (
            <p className="text-xs text-stone-600 mt-1">
              Faltam {ranking.faltamParaTop3} pedido{ranking.faltamParaTop3 === 1 ? '' : 's'} para entrar no Top 3.
            </p>
          )}
          {!ranking.userRankingPublico && (
            <p className="text-[11px] text-stone-500 mt-1">Ative o botão &quot;Público: ON&quot; para aparecer no Top 10.</p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {ranking.error && (
          <p className="text-xs text-red-600">Não foi possível carregar o ranking agora.</p>
        )}
        {ranking.isLoading && (
          <p className="text-xs text-stone-500">Carregando ranking...</p>
        )}
        {!ranking.isLoading && listaExibida.length === 0 && (
          <p className="text-xs text-stone-500">Ainda não há participantes públicos neste mês.</p>
        )}
        {!ranking.isLoading && listaExibida.map((user, index) => {
          const posicao = index + 1
          const { nomeExibicao, fotoExibicao } = getDisplayUser({
            nomeCompleto: user?.nome_snapshot,
            fotoPerfil: user?.foto_snapshot,
          })
          return (
            <div
              key={String(user?.cliente_id || `${posicao}-${nomeExibicao}`)}
              className={`flex items-center justify-between rounded-xl px-3 py-2 ${posicao <= 3 ? 'bg-white border border-amber-200' : 'bg-white/80 border border-stone-200'}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{medalha(posicao)}</span>
                <img
                  src={fotoExibicao}
                  alt={nomeExibicao}
                  className="w-8 h-8 rounded-full object-cover bg-stone-200"
                  loading="lazy"
                />
                <p className="text-sm font-semibold text-stone-800 truncate">{nomeExibicao}</p>
              </div>
              <span className="text-xs font-bold text-stone-600">
                {Number(user?.pedidos_mes || 0)} pedido{Number(user?.pedidos_mes || 0) === 1 ? '' : 's'}
              </span>
            </div>
          )
        })}
      </div>

      {ranking.top10.length > 3 && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-3 text-xs font-semibold text-red-700 hover:text-red-800"
        >
          {expandido ? 'Ver menos' : 'Ver Top 10'}
        </button>
      )}

      {!ranking.isLoading && (
        <p className="mt-2 text-[11px] text-stone-500">
          {ranking.totalParticipantes} participante{ranking.totalParticipantes === 1 ? '' : 's'} no ranking mensal.
        </p>
      )}
    </section>
  )
}

