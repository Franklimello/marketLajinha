import { createElement, useEffect, useMemo, useState } from 'react'
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCcw,
  FiRotateCw,
  FiSlash,
} from 'react-icons/fi'
import { api } from '../../api/client'
import BookingRequestCard from '../../components/booking-request-card/BookingRequestCard'

const FILTERS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'counter_offer', label: 'Contrapropostas' },
  { value: 'accepted', label: 'Aceitos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'completed', label: 'Concluidos' },
  { value: 'rejected', label: 'Recusados/cancelados' },
]

function statusCounts(bookings) {
  return {
    all: bookings.length,
    pending: bookings.filter((item) => item.status === 'pending').length,
    counter_offer: bookings.filter((item) => item.status === 'counter_offer').length,
    accepted: bookings.filter((item) => item.status === 'accepted').length,
    confirmed: bookings.filter((item) => item.status === 'confirmed').length,
    completed: bookings.filter((item) => item.status === 'completed').length,
    rejected: bookings.filter((item) => item.status === 'rejected' || item.status === 'cancelled').length,
  }
}

function StatCard({ icon, label, value, helper, tone }) {
  return (
    <article className={`border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide">{label}</p>
        {icon ? createElement(icon, { size: 14 }) : null}
      </div>
      <p className="text-2xl font-semibold mt-1 font-numeric">{value}</p>
      <p className="text-xs mt-1 opacity-80">{helper}</p>
    </article>
  )
}

export default function ServiceBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState('')

  async function loadBookings() {
    setLoading(true)
    setError('')

    try {
      const res = await api.appointments.provider()
      setBookings(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err.message || 'Nao foi possivel carregar os agendamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  async function runAction(id, payload) {
    setBusyId(id)
    setError('')

    try {
      const updated = await api.appointments.providerAction(id, payload)
      setBookings((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err.message || 'Nao foi possivel atualizar este agendamento.')
    } finally {
      setBusyId('')
    }
  }

  async function cancelBooking(id) {
    setBusyId(id)
    setError('')

    try {
      const updated = await api.appointments.providerCancel(id, {})
      setBookings((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err.message || 'Nao foi possivel cancelar este agendamento.')
    } finally {
      setBusyId('')
    }
  }

  async function completeBooking(id) {
    setBusyId(id)
    setError('')

    try {
      const updated = await api.appointments.providerComplete(id)
      setBookings((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err.message || 'Nao foi possivel concluir este agendamento.')
    } finally {
      setBusyId('')
    }
  }

  const counts = useMemo(() => statusCounts(bookings), [bookings])

  const metrics = useMemo(() => {
    return [
      {
        label: 'Pendentes',
        value: counts.pending,
        helper: 'Aguardando sua resposta',
        icon: FiClock,
        tone: 'border-blue-200 bg-blue-50 text-blue-800',
      },
      {
        label: 'Confirmados',
        value: counts.confirmed + counts.accepted,
        helper: 'Com horario definido',
        icon: FiCheckCircle,
        tone: 'border-green-200 bg-green-50 text-green-800',
      },
      {
        label: 'Concluidos',
        value: counts.completed,
        helper: 'Atendimentos finalizados',
        icon: FiCheckCircle,
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      },
      {
        label: 'Negociacao',
        value: counts.counter_offer,
        helper: 'Com contraproposta ativa',
        icon: FiRotateCw,
        tone: 'border-amber-200 bg-amber-50 text-amber-800',
      },
      {
        label: 'Recusados',
        value: counts.rejected,
        helper: 'Recusas e cancelamentos',
        icon: FiSlash,
        tone: 'border-red-200 bg-red-50 text-red-800',
      },
    ]
  }, [counts])

  const orderedBookings = useMemo(() => {
    return [...bookings]
      .filter((booking) => filter === 'all' || booking.status === filter || (filter === 'rejected' && ['rejected', 'cancelled'].includes(booking.status)))
      .sort((a, b) => {
        if (a.date !== b.date) return String(a.date).localeCompare(String(b.date))
        return String(a.effective_time || a.time || '').localeCompare(String(b.effective_time || b.time || ''))
      })
  }, [bookings, filter])

  return (
    <div className="space-y-4">
      <section className="border border-stone-300 bg-linear-to-r from-stone-900 via-stone-800 to-amber-700 text-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Solicitacoes recebidas</p>
            <h2 className="text-2xl font-semibold mt-1">Agendamentos</h2>
            <p className="text-sm text-stone-200 mt-2 max-w-2xl">
              Responda pedidos rapidamente para manter sua agenda organizada e com mais conversao.
            </p>
          </div>

          <button
            type="button"
            onClick={loadBookings}
            className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            <FiRefreshCcw size={14} /> Atualizar lista
          </button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {metrics.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="border border-stone-200 bg-white p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
            <FiCalendar size={14} /> Filtrar por status
          </p>

          <span className="text-xs text-stone-500">
            {orderedBookings.length} de {counts.all} exibidos
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`border px-3 py-1.5 text-xs font-semibold ${
                filter === item.value
                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400'
              }`}
            >
              {item.label} ({counts[item.value] || 0})
            </button>
          ))}
        </div>
      </section>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando agendamentos...</div>
      ) : orderedBookings.length === 0 ? (
        <div className="border border-stone-200 bg-white p-5 text-sm text-stone-500">
          Nenhuma solicitacao encontrada neste filtro.
        </div>
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
              onCancelAppointment={() => cancelBooking(booking.id)}
              onCompleteAppointment={() => completeBooking(booking.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
