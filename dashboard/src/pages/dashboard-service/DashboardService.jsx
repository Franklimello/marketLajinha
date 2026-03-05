import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'

function Card({ label, value }) {
  return (
    <div className="border border-stone-200 bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-semibold text-stone-900 mt-1">{value}</p>
    </div>
  )
}

export default function DashboardServicePage() {
  const [services, setServices] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let canceled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [servicesRes, bookingsRes] = await Promise.all([
          api.services.mine(),
          api.appointments.provider(),
        ])

        if (canceled) return
        setServices(Array.isArray(servicesRes) ? servicesRes : [])
        setBookings(Array.isArray(bookingsRes) ? bookingsRes : [])
      } catch (err) {
        if (!canceled) setError(err.message || 'Não foi possível carregar o dashboard.')
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    load()
    return () => { canceled = true }
  }, [])

  const metrics = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length
    const active = bookings.filter((b) => b.status === 'accepted' || b.status === 'confirmed').length
    const counter = bookings.filter((b) => b.status === 'counter_offer').length
    return { pending, active, counter }
  }, [bookings])

  const nextBookings = useMemo(() => {
    return [...bookings]
      .filter((b) => ['pending', 'accepted', 'counter_offer', 'confirmed'].includes(b.status))
      .sort((a, b) => {
        if (a.date !== b.date) return String(a.date).localeCompare(String(b.date))
        return String(a.effective_time || '').localeCompare(String(b.effective_time || ''))
      })
      .slice(0, 5)
  }, [bookings])

  if (loading) {
    return <div className="border border-stone-200 bg-white p-6 text-sm text-stone-500">Carregando dashboard...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Dashboard</h2>
        <p className="text-sm text-stone-500">Resumo rápido dos serviços e agendamentos.</p>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Serviços cadastrados" value={services.length} />
        <Card label="Pedidos pendentes" value={metrics.pending} />
        <Card label="Agendamentos ativos" value={metrics.active} />
        <Card label="Com contraproposta" value={metrics.counter} />
      </div>

      <section className="border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-900 mb-3">Próximos atendimentos</h3>
        {nextBookings.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum atendimento no momento.</p>
        ) : (
          <div className="space-y-2">
            {nextBookings.map((booking) => (
              <div key={booking.id} className="border border-stone-200 p-3 text-sm">
                <p className="font-medium text-stone-900">{booking.client?.nome || 'Cliente'}</p>
                <p className="text-stone-600">{booking.service?.name || 'Serviço'}</p>
                <p className="text-stone-500">{booking.date} • {booking.effective_time || booking.time}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
