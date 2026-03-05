import { FiCompass, FiX } from 'react-icons/fi'

export default function HomeCategoriesSection({
  catRef,
  categoriasDinamicas,
  categoriaSel,
  onToggleCategoria,
  onClearCategoria,
  categoriaCardComponent,
}) {
  const CategoriaCard = categoriaCardComponent

  return (
    <section className="mb-5 border-t border-stone-200 pt-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-black tracking-tight text-stone-900">
          <FiCompass className="text-amber-600" />
          Categorias
        </h3>
        <span className="text-[11px] text-stone-500">{categoriasDinamicas.length} opções</span>
      </div>

      <div ref={catRef} className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {categoriasDinamicas.map((cat) => {
          const ativo = categoriaSel === cat.nome
          return (
            <CategoriaCard
              key={cat.nome}
              categoria={cat}
              isActive={ativo}
              onToggle={() => onToggleCategoria(ativo ? null : cat.nome)}
            />
          )
        })}
      </div>

      {categoriaSel && (
        <div className="flex items-center gap-2 mt-3 animate-fade-in-up">
          <span className="text-xs text-stone-600">Filtrando por:</span>
          <button
            onClick={onClearCategoria}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            <span>{categoriaSel}</span>
            <span className="inline-flex transition-transform duration-150 hover:scale-105 active:scale-95">
              <FiX size={14} />
            </span>
          </button>
        </div>
      )}
    </section>
  )
}
