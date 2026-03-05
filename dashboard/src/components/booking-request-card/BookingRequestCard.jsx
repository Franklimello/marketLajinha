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
  const [showRejectOptions, setShowRejectOptions] = useState(false)

  if (!appointment) return null

  const canManage = appointment.status === 'pending' || appointment.status === 'counter_offer'

  async function handleSuggest() {
    const time = String(counterTime || '').trim()
    if (!time) return
    await onSuggestTime(time)
    setCounterTime('')
    setShowRejectOptions(false)
  }

  async function handleConfirmReject() {
    await onReject()
    setShowRejectOptions(false)
  }

  return (
    <article className="border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
            <FiUser size={13} /> {appointment.client?.nome || 'Cliente'}
          </p>
          <p className="text-xs text-stone-500 mt-1 inline-flex items-center gap-1.5">
            <FiScissors size={13} /> {appointment.service?.name || 'Servico'}
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
          <FiClock size={13} className="text-stone-500" /> Horario: {appointment.time}
        </p>
      </div>

      {appointment.counter_proposed_time && (
        <p className="text-xs border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 inline-flex items-center gap-1.5">
          <FiRefreshCw size={12} /> Contraproposta atual: {appointment.counter_proposed_time}
        </p>
      )}

      {canManage && !showRejectOptions && (
        <div className="grid sm:grid-cols-2 gap-2">
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
            onClick={() => setShowRejectOptions(true)}
            disabled={busy}
            className="border border-red-600 text-red-700 text-xs py-2 font-semibold hover:bg-red-50 disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
      )}

      {canManage && showRejectOptions && (
        <div className="space-y-2 border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">Deseja recusar direto ou enviar uma proposta de horario?</p>

          <div className="grid sm:grid-cols-[1fr_1fr] gap-2">
            <input
              type="time"
              value={counterTime}
              onChange={(e) => setCounterTime(e.target.value)}
              className="border border-stone-300 bg-white px-2 py-2 text-xs"
            />
            <button
              type="button"
              onClick={handleSuggest}
              disabled={busy || !counterTime}
              className="border border-amber-600 text-amber-700 text-xs py-2 px-3 font-semibold bg-white hover:bg-amber-50 disabled:opacity-50"
            >
              Enviar proposta
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={busy}
              className="border border-red-600 text-red-700 text-xs py-2 font-semibold bg-white hover:bg-red-100 disabled:opacity-50"
            >
              Confirmar recusa
            </button>
            <button
              type="button"
              onClick={() => setShowRejectOptions(false)}
              disabled={busy}
              className="border border-stone-300 text-stone-700 text-xs py-2 font-semibold bg-white hover:border-stone-400 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

