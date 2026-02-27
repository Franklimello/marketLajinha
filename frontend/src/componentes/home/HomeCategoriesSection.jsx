import { FiX } from 'react-icons/fi'

export default function HomeCategoriesSection({
  catRef,
  categoriasDinamicas,
  categoriaSel,
  onToggleCategoria,
  onClearCategoria,
  CategoriaCardComponent,
}) {
  return (
    <>
      <div ref={catRef} className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {categoriasDinamicas.map((cat) => {
          const ativo = categoriaSel === cat.nome
          return (
            <CategoriaCardComponent
              key={cat.nome}
              categoria={cat}
              isActive={ativo}
              onToggle={() => onToggleCategoria(ativo ? null : cat.nome)}
            />
          )
        })}
      </div>

      {categoriaSel && (
        <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
          <span className="text-sm text-stone-600">Filtrando por:</span>
          <button
            onClick={onClearCategoria}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <span>{categoriaSel}</span>
            <span className="inline-flex transition-transform duration-150 hover:scale-105 active:scale-95">
              <FiX size={14} />
            </span>
          </button>
        </div>
      )}
    </>
  )
}
