import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import BookingRequestCard from '../../components/booking-request-card/BookingRequestCard'

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'counter_offer', label: 'Contraproposta' },
  { value: 'accepted', label: 'Aceitos' },
  { value: 'confirmed', label: 'Confirmados' },
]

export default function ServiceBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [busyId, setBusyId] = useState('')

  async function loadBookings(nextFilter = filter) {
    setLoading(true)
    setError('')
    try {
      const res = await api.appointments.provider(nextFilter)
      setBookings(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os agendamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings(filter)
  }, [filter])

  async function runAction(id, payload) {
    setBusyId(id)
    setError('')
    try {
      const updated = await api.appointments.providerAction(id, payload)
      setBookings((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar este agendamento.')
    } finally {
      setBusyId('')
    }
  }

  const orderedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date))
      return String(a.effective_time || '').localeCompare(String(b.effective_time || ''))
    })
  }, [bookings])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Bookings</h2>
          <p className="text-sm text-stone-500">Gerencie solicitações com aceitar, recusar ou sugerir novo horário.</p>
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">Filtro</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-stone-300 px-3 py-2 text-sm"
          >
            {FILTERS.map((item) => (
              <option key={item.value || 'all'} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando agendamentos...</div>
      ) : orderedBookings.length === 0 ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Nenhuma solicitação encontrada.</div>
      ) : (
        <div className="space-y-3">
          {orderedBookings.map((booking) => (
            <BookingRequestCard
              key={booking.id}
              appointment={booking}
              busy={busyId === booking.id}
              onAccept={() => runAction(booking.id, { action: 'accept' })}
              onReject={() => runAction(booking.id, { action: 'reject' })}
              onSuggestTime={(time) => runAction(booking.id, { action: 'counter_offer', new_time: time })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
