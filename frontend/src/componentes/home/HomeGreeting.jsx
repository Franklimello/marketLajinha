export default function HomeGreeting({
  saudacaoTexto,
  cliente,
  lojasAbertasCount,
  cidadeSelecionada,
  cidadeGeo,
  cidadePadrao,
}) {
  const cidadeAtual = cidadeSelecionada || cidadeGeo || cidadePadrao

  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-stone-900">
        {saudacaoTexto}
        {cliente?.nome ? <>, <span className="text-red-500">{cliente.nome.split(' ')[0]}</span></> : ''}!
      </h2>
      <p className="text-sm text-stone-400 mt-0.5">
        {lojasAbertasCount > 0
          ? `${lojasAbertasCount} loja${lojasAbertasCount !== 1 ? 's' : ''} aberta${lojasAbertasCount !== 1 ? 's' : ''} agora`
          : 'Nenhuma loja aberta no momento'}
      </p>
      {cidadeAtual && (
        <p className="text-xs text-stone-500 mt-1">
          Mostrando lojas em <span className="font-semibold text-stone-700">{cidadeAtual}</span>.{' '}
          Para ver outra cidade, pesquise o nome dela.
        </p>
      )}
    </div>
  )
}
