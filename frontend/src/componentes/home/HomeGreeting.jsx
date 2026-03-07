import { FiClock, FiMapPin } from 'react-icons/fi'

export default function HomeGreeting({
  greeting,
  cliente,
  lojasAbertasCount,
  cidadeSelecionada,
  cidadeGeo,
  cidadePadrao,
}) {
  const cidadeAtual = cidadeSelecionada || cidadeGeo || cidadePadrao
  const primeiroNome = String(cliente?.nome || '').trim().split(' ')[0]
  const temLojaAberta = lojasAbertasCount > 0
  const title = String(greeting?.title || 'Olá')
  const subtitle = String(greeting?.subtitle || '')
  const suggestion = String(greeting?.suggestion || '')
  const titleWithName = primeiroNome ? `${title}, ${primeiroNome}` : title

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[1.95rem] leading-[1.12] font-black tracking-tight text-stone-900">
          {titleWithName}
        </h2>
        <div className={`home-open-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap ${
          temLojaAberta ? 'border-emerald-200 bg-emerald-50/80' : 'border-stone-200 bg-stone-100/80'
        }`}>
          <FiClock className={`home-open-badge-icon ${temLojaAberta ? 'text-emerald-600' : 'text-stone-500'}`} />
          <span className={`home-open-badge-text ${temLojaAberta ? 'text-emerald-700' : 'text-stone-600'}`}>
            {temLojaAberta
              ? `${lojasAbertasCount} aberta${lojasAbertasCount !== 1 ? 's' : ''}`
              : 'Nenhuma aberta'}
          </span>
        </div>
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-stone-600">
          {subtitle}
        </p>
      )}
      {suggestion && (
        <p className="mt-1 text-sm font-semibold text-red-700">
          {suggestion}
        </p>
      )}
      {cidadeAtual && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-stone-600 leading-relaxed">
          <FiMapPin className="mt-[2px] shrink-0 text-stone-500" />
          <span>
            Mostrando lojas em <span className="font-semibold text-stone-800">{cidadeAtual}</span>.
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
