import { createElement, useEffect, useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import { api } from '../../api/client'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const dt = new Date(`${dateStr}T00:00:00`)
  if (!Number.isFinite(dt.getTime())) return dateStr
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusLabel(status) {
  const map = {
    pending: 'Pendente',
    accepted: 'Aceito',
    counter_offer: 'Contraproposta',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
  }
  return map[status] || status
}

function statusChipClass(status) {
  if (status === 'confirmed' || status === 'accepted') return 'border-green-200 bg-green-50 text-green-700'
  if (status === 'counter_offer') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'pending') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-stone-200 bg-stone-50 text-stone-600'
}

function MetricCard({ label, value, icon, description }) {
  return (
    <div className="border border-stone-200 bg-white p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
        <p className="text-3xl font-semibold text-stone-900 leading-none mt-1 font-numeric">{value}</p>
        <p className="text-xs text-stone-500 mt-2">{description}</p>
      </div>
      <div className="w-9 h-9 border border-stone-200 bg-stone-50 text-stone-700 inline-flex items-center justify-center shrink-0">
        {icon ? createElement(icon, { size: 17 }) : null}
      </div>
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
        if (!canceled) {
          setError(err.message || 'Nao foi possivel carregar o painel de servicos.')
        }
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
    const rejected = bookings.filter((b) => b.status === 'rejected' || b.status === 'cancelled').length
    const completed = bookings.filter((b) => b.status === 'completed').length
    return { pending, active, counter, rejected, completed }
  }, [bookings])

  const nextBookings = useMemo(() => {
    return [...bookings]
      .filter((b) => ['pending', 'accepted', 'counter_offer', 'confirmed'].includes(b.status))
      .sort((a, b) => {
        if (a.date !== b.date) return String(a.date).localeCompare(String(b.date))
        return String(a.effective_time || a.time || '').localeCompare(String(b.effective_time || b.time || ''))
      })
      .slice(0, 6)
  }, [bookings])

  if (loading) {
    return (
      <div className="border border-stone-200 bg-white p-6 text-sm text-stone-500">
        Carregando visao geral premium...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="border border-stone-300 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-700 text-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Painel Executivo</p>
        <h2 className="text-2xl font-semibold mt-1">Painel de Servicos</h2>
        <p className="text-sm text-stone-200 mt-2 max-w-2xl">
          Monitore operação, entenda demanda da agenda e priorize os próximos atendimentos em poucos cliques.
        </p>
      </section>

      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 inline-flex items-center gap-2 w-full">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Serviços"
          value={services.length}
          icon={FiBriefcase}
          description="Catálogo ativo"
        />
        <MetricCard
          label="Pendentes"
          value={metrics.pending}
          icon={FiCalendar}
          description="Aguardando retorno"
        />
        <MetricCard
          label="Ativos"
          value={metrics.active}
          icon={FiClock}
          description="Aceitos e confirmados"
        />
        <MetricCard
          label="Concluídos"
          value={metrics.completed}
          icon={FiCheckCircle}
          description="Atendimentos finalizados"
        />
        <MetricCard
          label="Risco"
          value={metrics.counter + metrics.rejected}
          icon={FiTrendingUp}
          description="Contrapropostas e recusas"
        />
      </section>

      <section className="grid xl:grid-cols-[1.4fr_1fr] gap-4">
        <div className="border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-stone-900">Próximos atendimentos</h3>
            <span className="text-xs text-stone-500">{nextBookings.length} exibido(s)</span>
          </div>

          {nextBookings.length === 0 ? (
            <p className="text-sm text-stone-500">Sem agendamentos ativos no momento.</p>
          ) : (
            <div className="space-y-2">
              {nextBookings.map((booking) => (
                <article key={booking.id} className="border border-stone-200 p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{booking.client?.nome || 'Cliente'}</p>
                    <p className="text-sm text-stone-600">{booking.service?.name || 'Serviço'}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {formatDate(booking.date)} • {booking.effective_time || booking.time}
                    </p>
                  </div>
                  <span className={`text-[11px] border px-2 py-1 ${statusChipClass(booking.status)}`}>
                    {statusLabel(booking.status)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Pulso operacional</h3>
          <div className="space-y-2">
            <div className="border border-stone-200 p-3 flex items-center justify-between">
              <p className="text-sm text-stone-600 inline-flex items-center gap-1.5"><FiUsers size={14} /> Pendentes</p>
              <strong className="font-numeric text-stone-900">{metrics.pending}</strong>
            </div>
            <div className="border border-stone-200 p-3 flex items-center justify-between">
              <p className="text-sm text-stone-600 inline-flex items-center gap-1.5"><FiClock size={14} /> Em andamento</p>
              <strong className="font-numeric text-stone-900">{metrics.active}</strong>
            </div>
            <div className="border border-stone-200 p-3 flex items-center justify-between">
              <p className="text-sm text-stone-600 inline-flex items-center gap-1.5"><FiTrendingUp size={14} /> Contraproposta</p>
              <strong className="font-numeric text-stone-900">{metrics.counter}</strong>
            </div>
            <div className="border border-stone-200 p-3 flex items-center justify-between">
              <p className="text-sm text-stone-600 inline-flex items-center gap-1.5"><FiAlertCircle size={14} /> Recusados/cancelados</p>
              <strong className="font-numeric text-stone-900">{metrics.rejected}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

