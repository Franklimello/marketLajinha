import { FiSearch, FiX } from 'react-icons/fi'

export default function HomeSearchBar({ busca, onChangeBusca, onClearBusca }) {
  return (
    <div className="relative mb-5">
      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={busca}
        onChange={(e) => onChangeBusca(e.target.value)}
        placeholder="Buscar lojas e restaurantes"
        className="w-full pl-10 pr-10 py-3 bg-stone-100 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
      />
      {busca && (
        <button onClick={onClearBusca} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5">
          <FiX size={16} />
        </button>
      )}
    </div>
  )
}
