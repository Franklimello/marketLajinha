function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ServiceCard({ service, onSelect, selecting = false }) {
  if (!service) return null

  return (
    <article className="border border-stone-200 bg-white p-4 space-y-2">
      <h3 className="text-sm font-semibold text-stone-900">{service.name}</h3>
      <p className="text-sm text-stone-600">{service.description || 'Sem descrição.'}</p>
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
          className="border border-red-600 text-red-700 px-3 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {selecting ? 'Selecionado' : 'Agendar'}
        </button>
      )}
    </article>
  )
}
