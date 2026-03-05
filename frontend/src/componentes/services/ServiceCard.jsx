function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ServiceCard({ service, onSelect, selecting = false }) {
  if (!service) return null

  return (
    <article className="border border-stone-200 bg-white p-4 space-y-2 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
      <h3 className="text-sm font-semibold text-stone-900">{service.name}</h3>
      {service.category && (
        <p className="text-[11px] inline-flex border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5">
          {service.category}
        </p>
      )}
      <p className="text-sm text-stone-600">{service.description || 'Sem descrição.'}</p>
      {Array.isArray(service.images_urls) && service.images_urls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {service.images_urls.map((imageUrl) => (
            <img key={imageUrl} src={imageUrl} alt={service.name} className="w-20 h-20 object-cover rounded-xl border border-stone-300 shrink-0" />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span>{formatCurrency(service.price)}</span>
        <span>•</span>
        <span>{service.duration_minutes} minutos</span>
      </div>

      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          disabled={selecting}
          className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 ${
            selecting
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-red-600 text-red-700 hover:bg-red-50'
          }`}
        >
          {selecting ? 'Selecionado' : 'Agendar'}
        </button>
      )}
    </article>
  )
}
