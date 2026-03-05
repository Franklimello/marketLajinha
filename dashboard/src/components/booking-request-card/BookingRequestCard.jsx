import { useState } from 'react'

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

export default function BookingRequestCard({ appointment, onAccept, onReject, onSuggestTime, busy = false }) {
  const [counterTime, setCounterTime] = useState('')

  if (!appointment) return null

  async function handleSuggest() {
    const time = String(counterTime || '').trim()
    if (!time) return
    await onSuggestTime(time)
    setCounterTime('')
  }

  return (
    <article className="border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-stone-900">{appointment.client?.nome || 'Cliente'}</p>
          <p className="text-xs text-stone-500">{appointment.service?.name || 'Serviço'}</p>
        </div>
        <span className="text-[11px] border border-stone-300 px-2 py-1 text-stone-600">
          {statusLabel(appointment.status)}
        </span>
      </div>

      <div className="text-sm text-stone-700 space-y-1">
        <p><span className="text-stone-500">Data:</span> {appointment.date}</p>
        <p><span className="text-stone-500">Horário solicitado:</span> {appointment.time}</p>
        {appointment.counter_proposed_time && (
          <p><span className="text-stone-500">Contraproposta:</span> {appointment.counter_proposed_time}</p>
        )}
      </div>

      {(appointment.status === 'pending' || appointment.status === 'counter_offer') && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="border border-green-600 text-green-700 text-xs py-2 font-medium disabled:opacity-50"
            >
              Aceitar
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="border border-red-600 text-red-700 text-xs py-2 font-medium disabled:opacity-50"
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
            className="border border-amber-600 text-amber-700 text-xs py-2 px-3 font-medium disabled:opacity-50"
          >
            Sugerir novo horário
          </button>
        </div>
      )}
    </article>
  )
}
