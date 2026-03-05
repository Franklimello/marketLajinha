export default function HomeLoadingState() {
  return (
    <div className="max-w-lg mx-auto px-4">
      <section className="mb-5 rounded-[30px] border border-stone-200 bg-white px-4 py-4 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.55)]">
        <h2 className="text-xl font-black tracking-tight text-stone-900 mb-1">Carregando lojas</h2>
        <p className="text-sm text-stone-500 mb-4">Buscando os melhores estabelecimentos da sua cidade...</p>
        <div className="skeleton h-6 rounded w-40 mb-1" />
        <div className="skeleton h-4 rounded w-56 mb-4" />
        <div className="h-12 skeleton rounded-2xl mb-4" />
      </section>

      <section className="mb-6 rounded-3xl border border-stone-200 bg-white/90 p-3.5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.45)]">
        <div className="skeleton h-4 rounded w-32 mb-3" />
        <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-14 h-14 rounded-full skeleton" />
            <div className="w-10 h-2 skeleton rounded" />
          </div>
        ))}
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-3.5 shadow-[0_14px_30px_-32px_rgba(15,23,42,0.5)]">
        <div className="skeleton h-4 rounded w-44 mb-3" />
        <div className="space-y-1">
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
      </section>
    </div>
  )
}
