import { useMemo, useState } from 'react'

function buildSlots(startHour = 8, endHour = 18, stepMinutes = 30) {
  const slots = []
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

function statusColor(status) {
  if (status === 'confirmed' || status === 'accepted') return 'text-green-700 border-green-600'
  if (status === 'counter_offer') return 'text-amber-700 border-amber-600'
  return 'text-stone-700 border-stone-400'
}

export default function BookingCalendar({ appointments = [] }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))

  const appointmentsOfDay = useMemo(() => {
    return appointments
      .filter((item) => item.date === selectedDate)
      .sort((a, b) => String(a.effective_time || '').localeCompare(String(b.effective_time || '')))
  }, [appointments, selectedDate])

  const takenSlots = useMemo(() => {
    const set = new Set()
    for (const appt of appointmentsOfDay) {
      set.add(String(appt.effective_time || appt.time || '').trim())
    }
    return set
  }, [appointmentsOfDay])

  const allSlots = useMemo(() => buildSlots(), [])
  const availableSlots = useMemo(() => allSlots.filter((slot) => !takenSlots.has(slot)), [allSlots, takenSlots])

  return (
    <section className="border border-stone-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-stone-700">Dia</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-stone-900">Agendamentos</h4>
        {appointmentsOfDay.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum agendamento neste dia.</p>
        ) : (
          <div className="space-y-2">
            {appointmentsOfDay.map((appt) => (
              <div key={appt.id} className={`border px-3 py-2 text-sm ${statusColor(appt.status)}`}>
                <div className="font-medium">{appt.effective_time} - {appt.end_time}</div>
                <div>{appt.client?.nome || 'Cliente'} • {appt.service?.name || 'Serviço'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-stone-900">Horários disponíveis</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-stone-500">Sem horários livres.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableSlots.map((slot) => (
              <span key={slot} className="border border-stone-300 px-2 py-1 text-xs text-stone-600">
                {slot}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
