import { useState } from 'react'
import { FiUser } from 'react-icons/fi'
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
  const [erroParticipacao, setErroParticipacao] = useState('')
  const ranking = useMonthlyCityRanking({ cidadeId, currentUserId })

  if (!cidadeId) return null

  async function atualizarParticipacaoPublica(publico) {
    setAtivandoPublico(true)
    setErroParticipacao('')
    try {
      await api.clientes.atualizarRankingPublico(publico)
      await ranking.refetch()
    } catch (err) {
      setErroParticipacao(err instanceof Error ? err.message : 'Não foi possível atualizar sua participação no ranking.')
    } finally {
      setAtivandoPublico(false)
    }
  }

  const lista = Array.isArray(ranking.top10) ? ranking.top10.slice(0, 10) : []
  const listaVisivel = expandido ? lista : lista.slice(0, 5)
  const isFotoPadrao = (foto) => !foto || String(foto).trim() === '/avatar-default.png'

  return (
    <section className="border-t border-stone-200 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black tracking-tight text-stone-900 truncate whitespace-nowrap">
            🏆 Ranking Lajinha
          </h3>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {cidadeNome ? `Competição mensal em ${cidadeNome}` : 'Competição mensal da cidade'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 whitespace-nowrap">
            ⏳ {ranking.diasRestantes} dia{ranking.diasRestantes === 1 ? '' : 's'}
          </span>
          {currentUserId ? (
            <button
              type="button"
              onClick={() => atualizarParticipacaoPublica(!ranking.userRankingPublico)}
              disabled={ativandoPublico || ranking.isLoading}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                ranking.userRankingPublico
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                  : 'border-orange-300 bg-orange-100 text-orange-700'
              } disabled:opacity-60`}
              title={ranking.userRankingPublico ? 'Você está no ranking público' : 'Você está fora do ranking público'}
            >
              {ativandoPublico
                ? 'Salvando...'
                : (ranking.userRankingPublico ? 'Participando' : 'Participar')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {ranking.error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">Não foi possível carregar o ranking agora.</p>
        )}
        {erroParticipacao && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">{erroParticipacao}</p>
        )}
        {ranking.isLoading && (
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2">Carregando ranking...</p>
        )}
        {!ranking.isLoading && listaVisivel.length > 0 && (
          <div className="space-y-2">
            {listaVisivel.map((user, index) => {
              const posicao = index + 1
              const { nomeExibicao, fotoExibicao } = getDisplayUser({
                nomeCompleto: user?.nome_snapshot,
                fotoPerfil: user?.foto_snapshot,
              })
              return (
                <div
                  key={String(user?.cliente_id || `${posicao}-${nomeExibicao}`)}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-stone-500 min-w-8">{medalha(posicao)}</span>
                    {!isFotoPadrao(fotoExibicao) ? (
                      <img
                        src={fotoExibicao}
                        alt={nomeExibicao}
                        className="w-8 h-8 rounded-full object-cover bg-stone-200 border border-stone-200"
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="w-8 h-8 rounded-full border border-stone-300 text-stone-500 bg-stone-50 inline-flex items-center justify-center"
                        aria-label="Sem foto"
                      >
                        <FiUser size={14} />
                      </span>
                    )}
                    <p className="text-sm font-semibold text-stone-800 truncate">{nomeExibicao}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {Array.isArray(ranking.top10) && ranking.top10.length > 5 && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-3 text-xs font-semibold text-red-700 hover:text-red-800 underline-offset-2 hover:underline"
        >
          {expandido ? 'Ver menos' : 'Ver Top 10'}
        </button>
      )}
    </section>
  )
}

