import { AnimatePresence, motion } from 'framer-motion'
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

      <AnimatePresence mode="wait">
        {categoriaSel && (
          <motion.div
            key="filtro-ativo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-2 mb-3"
          >
            <span className="text-sm text-stone-600">Filtrando por:</span>
            <button
              onClick={onClearCategoria}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <span>{categoriaSel}</span>
              <motion.span
                initial={{ rotate: -45, opacity: 0.8 }}
                animate={{ rotate: 0, opacity: 1 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <FiX size={14} />
              </motion.span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
