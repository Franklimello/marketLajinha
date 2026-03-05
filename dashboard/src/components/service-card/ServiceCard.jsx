import { FiClock, FiMapPin, FiTag } from 'react-icons/fi'

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatCreatedAt(value) {
  if (!value) return '-'
  const dt = new Date(value)
  if (!Number.isFinite(dt.getTime())) return '-'
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ServiceCard({ service }) {
  if (!service) return null

  return (
    <article className="border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-stone-900">{service.name}</h4>
          <p className="text-xs text-stone-500 mt-1">Criado em {formatCreatedAt(service.created_at)}</p>
        </div>
        <span className="text-xs border border-stone-200 bg-stone-50 text-stone-600 px-2 py-1 inline-flex items-center gap-1">
          <FiMapPin size={11} /> {service.city || 'Cidade'}
        </span>
      </div>

      <p className="text-sm text-stone-600 whitespace-pre-wrap min-h-10">
        {service.description || 'Sem descrição informada.'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-stone-200 bg-stone-50 p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 inline-flex items-center gap-1">
            <FiTag size={11} /> Valor
          </p>
          <p className="text-sm font-semibold text-stone-900 mt-1 font-numeric">{formatCurrency(service.price)}</p>
        </div>
        <div className="border border-stone-200 bg-stone-50 p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 inline-flex items-center gap-1">
            <FiClock size={11} /> Duração
          </p>
          <p className="text-sm font-semibold text-stone-900 mt-1 font-numeric">{service.duration_minutes} min</p>
        </div>
      </div>
    </article>
  )
}
