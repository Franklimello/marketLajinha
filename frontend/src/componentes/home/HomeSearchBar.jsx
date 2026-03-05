import { FiSearch, FiX } from 'react-icons/fi'

export default function HomeSearchBar({ busca, onChangeBusca, onClearBusca }) {
  return (
    <div className="relative">
      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={busca}
        onChange={(e) => onChangeBusca(e.target.value)}
        placeholder="Buscar lojas e restaurantes"
        className="w-full pl-12 pr-12 py-3.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
      />
      {busca && (
        <button
          type="button"
          onClick={onClearBusca}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700 inline-flex items-center justify-center transition-colors"
          aria-label="Limpar busca"
        >
          <FiX size={16} />
        </button>
      )}
    </div>
  )
}
