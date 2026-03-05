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

function pedestalClasses(posicao) {
  if (posicao === 1) return 'h-11 bg-linear-to-b from-amber-200 via-amber-300 to-amber-400 border-amber-200'
  if (posicao === 2) return 'h-9 bg-linear-to-b from-slate-100 via-slate-200 to-slate-300 border-slate-200'
  return 'h-7 bg-linear-to-b from-orange-100 via-orange-200 to-orange-300 border-orange-200'
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

  const top3 = Array.isArray(ranking.top3) ? ranking.top3.slice(0, 3) : []
  const podiumSlots = [
    { posicao: 2, user: top3[1] || null },
    { posicao: 1, user: top3[0] || null },
    { posicao: 3, user: top3[2] || null },
  ]
  const listaExpandida = expandido ? (Array.isArray(ranking.top10) ? ranking.top10.slice(3, 10) : []) : []
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

      <div className="mt-3">
        {ranking.error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">Não foi possível carregar o ranking agora.</p>
        )}
        {ranking.isLoading && (
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2">Carregando ranking...</p>
        )}
        {!ranking.isLoading && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-1.5 pb-2 pt-2">
            <div className="grid grid-cols-3 items-end gap-2">
              {podiumSlots.map(({ posicao, user }) => {
                const { nomeExibicao, fotoExibicao } = getDisplayUser({
                  nomeCompleto: user?.nome_snapshot,
                  fotoPerfil: user?.foto_snapshot,
                })
                return (
                  <div key={`podium-${posicao}`} className="flex flex-col items-center">
                    <div className="relative mb-1.5">
                      {posicao === 1 && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[12px]" aria-label="Primeiro lugar">
                          👑
                        </span>
                      )}
                      {user && !isFotoPadrao(fotoExibicao) ? (
                        <img
                          src={fotoExibicao}
                          alt={nomeExibicao}
                          className={`w-9 h-9 rounded-full object-cover border-2 shadow-sm ${
                            posicao === 1 ? 'border-amber-300' : posicao === 2 ? 'border-slate-300' : 'border-orange-300'
                          } bg-stone-200`}
                          loading="eager"
                          fetchPriority={posicao === 1 ? 'high' : 'auto'}
                        />
                      ) : (
                        <span
                          className={`w-9 h-9 rounded-full border-2 inline-flex items-center justify-center ${
                            posicao === 1 ? 'border-amber-300 text-amber-700 bg-amber-50' : posicao === 2 ? 'border-slate-300 text-slate-600 bg-slate-50' : 'border-orange-300 text-orange-700 bg-orange-50'
                          }`}
                          aria-label="Sem foto"
                        >
                          <FiUser size={15} />
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-[11px] drop-shadow-sm">{medalha(posicao)}</span>
                    </div>
                    <p className="max-w-[82px] text-center text-[10px] font-semibold text-stone-700 truncate">
                      {user ? nomeExibicao : '-'}
                    </p>
                    <div className={`w-full rounded-t-xl border ${pedestalClasses(posicao)} flex items-center justify-center`}>
                      <span className="text-[10px] font-black text-stone-800">{posicao}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {expandido && listaExpandida.length > 0 && (
        <div className="mt-3 space-y-2">
          {listaExpandida.map((user, index) => {
            const posicao = index + 4
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

      {Array.isArray(ranking.top10) && ranking.top10.length > 3 && (
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

