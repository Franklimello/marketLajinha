function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ServiceCard({ service }) {
  if (!service) return null

  return (
    <article className="border border-stone-200 bg-white p-4 space-y-2">
      <h4 className="text-sm font-semibold text-stone-900">{service.name}</h4>
      <p className="text-sm text-stone-600 whitespace-pre-wrap">{service.description || 'Sem descrição.'}</p>
      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span>{formatCurrency(service.price)}</span>
        <span>•</span>
        <span>{service.duration_minutes} min</span>
      </div>
    </article>
  )
}
