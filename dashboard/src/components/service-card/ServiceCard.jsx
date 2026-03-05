import { FiClock, FiEdit2, FiImage, FiMapPin, FiTag, FiTrash2 } from 'react-icons/fi'

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

export default function ServiceCard({ service, onEdit, onDelete, deleting = false }) {
  if (!service) return null

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-stone-900">{service.name}</h4>
          <p className="text-xs text-stone-500 mt-1">Cadastrado em {formatCreatedAt(service.created_at)}</p>
        </div>

        <span className="text-xs rounded-full border border-stone-200 bg-stone-50 text-stone-600 px-2 py-1 inline-flex items-center gap-1">
          <FiMapPin size={11} /> {service.city || 'Cidade'}
        </span>
      </div>

      <p className="text-sm text-stone-600 whitespace-pre-wrap min-h-10">
        {service.description || 'Sem descricao informada.'}
      </p>

      {service.category && (
        <p className="text-xs inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-1">
          <FiTag size={11} /> {service.category}
        </p>
      )}

      {Array.isArray(service.images_urls) && service.images_urls.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 inline-flex items-center gap-1">
            <FiImage size={11} /> Imagens ({service.images_urls.length}/10)
          </p>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {service.images_urls.map((url) => (
              <img key={url} src={url} alt={service.name} className="w-16 h-16 object-cover rounded-xl border border-stone-200 shrink-0" />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-stone-200 bg-stone-50 p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 inline-flex items-center gap-1">
            <FiTag size={11} /> Valor
          </p>
          <p className="text-sm font-semibold text-stone-900 mt-1 font-numeric">{formatCurrency(service.price)}</p>
        </div>

        <div className="border border-stone-200 bg-stone-50 p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 inline-flex items-center gap-1">
            <FiClock size={11} /> Duracao
          </p>
          <p className="text-sm font-semibold text-stone-900 mt-1 font-numeric">{service.duration_minutes} min</p>
        </div>
      </div>

      <div className="pt-1 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onEdit?.(service)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
        >
          <FiEdit2 size={12} /> Editar
        </button>

        <button
          type="button"
          onClick={() => onDelete?.(service)}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          <FiTrash2 size={12} /> {deleting ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </article>
  )
}
