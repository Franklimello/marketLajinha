import { FiClock, FiMapPin } from 'react-icons/fi'

export default function HomeGreeting({
  saudacaoTexto,
  cliente,
  lojasAbertasCount,
  cidadeSelecionada,
  cidadeGeo,
  cidadePadrao,
}) {
  const cidadeAtual = cidadeSelecionada || cidadeGeo || cidadePadrao
  const primeiroNome = String(cliente?.nome || '').trim().split(' ')[0]
  const saudacaoFinal = String(saudacaoTexto || '').replace('__NOME__', primeiroNome ? `${primeiroNome} ` : '')
  const temLojaAberta = lojasAbertasCount > 0

  return (
    <div>
      <h2 className="text-[1.95rem] leading-[1.12] font-black tracking-tight text-stone-900">
        {saudacaoFinal}
      </h2>
      <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-xs backdrop-blur-sm ${
        temLojaAberta ? 'border-emerald-200 bg-emerald-50/80' : 'border-stone-200 bg-stone-100/80'
      }`}>
        <FiClock className={temLojaAberta ? 'text-emerald-600' : 'text-stone-500'} />
        <span className={temLojaAberta ? 'text-emerald-700' : 'text-stone-600'}>
          {temLojaAberta
            ? `${lojasAbertasCount} loja${lojasAbertasCount !== 1 ? 's' : ''} aberta${lojasAbertasCount !== 1 ? 's' : ''} agora`
            : 'Nenhuma loja aberta no momento'}
        </span>
      </div>
      {cidadeAtual && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-stone-600 leading-relaxed">
          <FiMapPin className="mt-[2px] shrink-0 text-stone-500" />
          <span>
            Mostrando lojas em <span className="font-semibold text-stone-800">{cidadeAtual}</span>.{' '}
            Para ver outra cidade, pesquise o nome dela.
          </span>
        </p>
      )}
      {!cidadeAtual && (
        <p className="mt-2 text-xs text-stone-500 leading-relaxed">
          Use a busca para selecionar outra cidade e descobrir mais opções próximas de você.
        </p>
      )}
    </div>
  )
}
