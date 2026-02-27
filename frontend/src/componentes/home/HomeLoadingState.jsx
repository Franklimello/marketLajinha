export default function HomeLoadingState() {
  return (
    <div className="max-w-lg mx-auto px-4">
      <h2 className="text-xl font-bold text-stone-900 mb-1">Carregando lojas</h2>
      <p className="text-sm text-stone-400 mb-4">Buscando os melhores estabelecimentos da sua cidade...</p>
      <div className="skeleton h-6 rounded w-40 mb-1" />
      <div className="skeleton h-4 rounded w-56 mb-5" />
      <div className="h-12 skeleton rounded-xl mb-5" />
      <div className="flex gap-4 overflow-hidden mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-14 h-14 rounded-full skeleton" />
            <div className="w-10 h-2 skeleton rounded" />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2 py-3.5">
          <div className="w-16 h-16 rounded-xl skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
