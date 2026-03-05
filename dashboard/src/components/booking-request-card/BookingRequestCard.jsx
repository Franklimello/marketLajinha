import { useState } from 'react'
import { FiCalendar, FiClock, FiRefreshCw, FiScissors, FiUser } from 'react-icons/fi'

function statusLabel(status) {
  const labels = {
    pending: 'Pendente',
    accepted: 'Aceito',
    counter_offer: 'Contraproposta',
    confirmed: 'Confirmado',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

function statusClass(status) {
  if (status === 'confirmed' || status === 'accepted') return 'border-green-200 bg-green-50 text-green-700'
  if (status === 'counter_offer') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'pending') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'rejected' || status === 'cancelled') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-stone-200 bg-stone-50 text-stone-600'
}

export default function BookingRequestCard({ appointment, onAccept, onReject, onSuggestTime, busy = false }) {
  const [counterTime, setCounterTime] = useState('')

  if (!appointment) return null

  const canManage = appointment.status === 'pending' || appointment.status === 'counter_offer'

  async function handleSuggest() {
    const time = String(counterTime || '').trim()
    if (!time) return
    await onSuggestTime(time)
    setCounterTime('')
  }

  return (
    <article className="border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
            <FiUser size={13} /> {appointment.client?.nome || 'Cliente'}
          </p>
          <p className="text-xs text-stone-500 mt-1 inline-flex items-center gap-1.5">
            <FiScissors size={13} /> {appointment.service?.name || 'Serviço'}
          </p>
        </div>
        <span className={`text-[11px] border px-2 py-1 ${statusClass(appointment.status)}`}>
          {statusLabel(appointment.status)}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-sm text-stone-700">
        <p className="border border-stone-200 bg-stone-50 px-3 py-2 inline-flex items-center gap-1.5">
          <FiCalendar size={13} className="text-stone-500" /> Data: {appointment.date}
        </p>
        <p className="border border-stone-200 bg-stone-50 px-3 py-2 inline-flex items-center gap-1.5">
          <FiClock size={13} className="text-stone-500" /> Horário: {appointment.time}
        </p>
      </div>

      {appointment.counter_proposed_time && (
        <p className="text-xs border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 inline-flex items-center gap-1.5">
          <FiRefreshCw size={12} /> Contraproposta atual: {appointment.counter_proposed_time}
        </p>
      )}

      {canManage && (
        <div className="space-y-2">
          <div className="grid sm:grid-cols-[1fr_1fr_120px] gap-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="border border-green-600 text-green-700 text-xs py-2 font-semibold hover:bg-green-50 disabled:opacity-50"
            >
              Aceitar
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="border border-red-600 text-red-700 text-xs py-2 font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              Recusar
            </button>
            <input
              type="time"
              value={counterTime}
              onChange={(e) => setCounterTime(e.target.value)}
              className="border border-stone-300 px-2 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleSuggest}
            disabled={busy || !counterTime}
            className="border border-amber-600 text-amber-700 text-xs py-2 px-3 font-semibold hover:bg-amber-50 disabled:opacity-50"
          >
            Sugerir novo horário
          </button>
        </div>
      )}
    </article>
  )
}
