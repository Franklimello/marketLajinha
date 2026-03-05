import { useMemo, useState } from 'react'
import { FiCalendar, FiClock } from 'react-icons/fi'

function buildSlots(startHour = 8, endHour = 20, stepMinutes = 30) {
  const slots = []
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

function toMinutes(timeValue) {
  const [h, m] = String(timeValue || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function fromMinutes(total) {
  const safe = Math.max(0, Number(total || 0))
  const h = String(Math.floor(safe / 60)).padStart(2, '0')
  const m = String(safe % 60).padStart(2, '0')
  return `${h}:${m}`
}

function formatDate(dateValue) {
  if (!dateValue) return '-'
  const dt = new Date(`${dateValue}T00:00:00`)
  if (!Number.isFinite(dt.getTime())) return dateValue
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusColor(status) {
  if (status === 'confirmed' || status === 'accepted') return 'border-green-200 bg-green-50 text-green-700'
  if (status === 'counter_offer') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'pending') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-stone-200 bg-stone-50 text-stone-700'
}

export default function BookingCalendar({ appointments = [] }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.date === selectedDate)
      .sort((a, b) => String(a.effective_time || a.time || '').localeCompare(String(b.effective_time || b.time || '')))
  }, [appointments, selectedDate])

  const slots = useMemo(() => buildSlots(), [])

  const slotMeta = useMemo(() => {
    const map = new Map()

    for (const appointment of dayAppointments) {
      const startTime = appointment.effective_time || appointment.time || '00:00'
      const start = toMinutes(startTime)
      const duration = Number(appointment?.service?.duration_minutes || 0)
      const end = start + duration

      for (let cursor = start; cursor < end; cursor += 30) {
        const slot = fromMinutes(cursor)
        const isStart = cursor === start

        if (!map.has(slot)) {
          map.set(slot, {
            appointment,
            isStart,
          })
          continue
        }

        if (isStart) {
          map.set(slot, {
            appointment,
            isStart,
          })
        }
      }
    }

    return map
  }, [dayAppointments])

  const occupiedCount = useMemo(() => {
    return slots.filter((slot) => slotMeta.has(slot)).length
  }, [slots, slotMeta])

  const occupancyPct = slots.length === 0
    ? 0
    : Math.round((occupiedCount / slots.length) * 100)

  return (
    <section className="border border-stone-200 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
          <FiCalendar size={15} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-stone-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="min-w-44">
          <p className="text-xs text-stone-500">Ocupação em {formatDate(selectedDate)}</p>
          <div className="mt-1 h-2 border border-stone-300 bg-stone-100 overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${occupancyPct}%` }} />
          </div>
          <p className="text-xs text-stone-600 mt-1 font-numeric">{occupiedCount}/{slots.length} blocos ({occupancyPct}%)</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
            <FiClock size={14} /> Agenda do dia
          </h4>

          {dayAppointments.length === 0 ? (
            <p className="text-sm text-stone-500 border border-stone-200 bg-stone-50 p-3">Nenhum agendamento neste dia.</p>
          ) : (
            <div className="space-y-2">
              {dayAppointments.map((appointment) => (
                <article key={appointment.id} className={`border p-3 text-sm ${statusColor(appointment.status)}`}>
                  <p className="font-semibold">
                    {appointment.effective_time || appointment.time} - {appointment.end_time}
                  </p>
                  <p>{appointment.client?.nome || 'Cliente'} • {appointment.service?.name || 'Serviço'}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-stone-900">Mapa de horários</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map((slot) => {
              const meta = slotMeta.get(slot)
              const appointment = meta?.appointment

              const tone = !meta
                ? 'border-stone-300 bg-white text-stone-700'
                : meta.isStart
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : 'border-stone-300 bg-stone-100 text-stone-500'

              return (
                <div key={slot} className={`border p-2 min-h-16 ${tone}`}>
                  <p className="text-xs font-semibold font-numeric">{slot}</p>
                  <p className="text-[11px] mt-1 leading-tight">
                    {!meta
                      ? 'Livre'
                      : (meta.isStart
                        ? `${appointment?.client?.nome || 'Cliente'} • ${appointment?.service?.name || 'Serviço'}`
                        : 'Ocupado')}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
