import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import BookingCalendar from '../../components/booking-calendar/BookingCalendar'

function monthBounds(monthValue) {
  const raw = String(monthValue || '')
  const [year, month] = raw.split('-').map(Number)
  if (!year || !month) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    return {
      from: `${y}-${String(m).padStart(2, '0')}-01`,
      to: `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`,
    }
  }

  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export default function ServiceSchedulePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => monthBounds(month), [month])

  useEffect(() => {
    let cancelled = false

    async function loadSchedule() {
      setLoading(true)
      setError('')
      try {
        const res = await api.appointments.providerSchedule(range.from, range.to)
        if (!cancelled) setAppointments(Array.isArray(res) ? res : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Não foi possível carregar a agenda.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSchedule()
    return () => { cancelled = true }
  }, [range.from, range.to])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Schedule</h2>
          <p className="text-sm text-stone-500">Visualize agendamentos confirmados e horários disponíveis.</p>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Mês</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando agenda...</div>
      ) : (
        <BookingCalendar appointments={appointments} />
      )}
    </div>
  )
}
