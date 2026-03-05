import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiCheck, FiClock, FiSlash, FiX } from 'react-icons/fi'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SEO from '../componentes/SEO'

function statusLabel(status) {
  const labels = {
    pending: 'Pendente',
    accepted: 'Aceito pelo prestador',
    counter_offer: 'Contraproposta',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

function statusTone(status) {
  if (status === 'confirmed' || status === 'accepted' || status === 'completed') return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  if (status === 'counter_offer') return 'bg-amber-50 border-amber-200 text-amber-700'
  if (status === 'pending') return 'bg-sky-50 border-sky-200 text-sky-700'
  if (status === 'rejected' || status === 'cancelled') return 'bg-red-50 border-red-200 text-red-700'
  return 'bg-stone-50 border-stone-200 text-stone-700'
}

export default function MeusAgendamentosPage() {
  const navigate = useNavigate()
  const { logado, perfilCompleto } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!logado) {
      navigate('/login?voltar=/meus-agendamentos', { replace: true })
      return
    }
    if (!perfilCompleto) {
      navigate('/perfil', { replace: true })
    }
  }, [logado, perfilCompleto, navigate])

  useEffect(() => {
    if (!logado || !perfilCompleto) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.appointments.minhas()
        if (!cancelled) setAppointments(Array.isArray(res) ? res : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Não foi possível carregar seus agendamentos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [logado, perfilCompleto])

  async function respond(id, action) {
    setBusyId(id)
    setError('')
    try {
      const updated = await api.appointments.clientResponse(id, { action })
      setAppointments((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err.message || 'Não foi possível responder a contraproposta.')
    } finally {
      setBusyId('')
    }
  }

  async function cancelarAgendamento(id) {
    setBusyId(id)
    setError('')
    try {
      const updated = await api.appointments.clientCancel(id, {})
      setAppointments((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err.message || 'Não foi possível cancelar o agendamento.')
    } finally {
      setBusyId('')
    }
  }

  const ordered = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (a.date !== b.date) return String(b.date).localeCompare(String(a.date))
      return String(a.time || '').localeCompare(String(b.time || ''))
    })
  }, [appointments])

  const filtered = useMemo(() => {
    const text = String(query || '').trim().toLowerCase()
    return ordered.filter((appointment) => {
      const byStatus = selectedStatus === 'all' || appointment.status === selectedStatus
      if (!byStatus) return false
      if (!text) return true
      const providerName = String(appointment?.provider?.name || '').toLowerCase()
      const serviceName = String(appointment?.service?.name || '').toLowerCase()
      return providerName.includes(text) || serviceName.includes(text)
    })
  }, [ordered, selectedStatus, query])

  useEffect(() => {
    setEntered(false)
    const frameId = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frameId)
  }, [loading, selectedStatus, query])

  if (!logado || !perfilCompleto) return null

  return (
    <div className="relative max-w-lg mx-auto px-4 pb-32 min-h-screen overflow-x-hidden">
      <SEO title="Meus agendamentos" description="Acompanhe solicitações e responda contrapropostas." noIndex />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/65 to-transparent" />
      <div className="pointer-events-none absolute -top-14 right-[-4.2rem] -z-10 h-52 w-52 rounded-full bg-red-200/35 blur-3xl" />

      <div className="pt-4 flex items-center justify-between">
        <Link to="/servicos" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 font-medium">
          <FiArrowLeft /> Voltar
        </Link>
      </div>

      <section className="mt-3 mb-4 overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="relative px-4 pt-4 pb-5">
          <div className="pointer-events-none absolute -top-10 -right-12 h-32 w-32 rounded-full bg-red-100/70 blur-2xl" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Agenda</p>
            <h1 className="mt-1 text-[1.35rem] leading-tight font-black text-stone-900">Meus agendamentos</h1>
            <p className="mt-1 text-xs text-stone-500">Acompanhe solicitações e responda contrapropostas.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{ordered.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">total</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{ordered.filter((a) => a.status === 'pending').length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">pendentes</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{ordered.filter((a) => ['pending', 'counter_offer', 'accepted', 'confirmed'].includes(a.status)).length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">ativos</p>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded-xl mb-4">{error}</div>}

      <section className="mb-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)] space-y-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por serviço ou prestador"
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 transition-all focus:outline-none focus:border-red-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-red-200"
        />
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'counter_offer', label: 'Contraproposta' },
            { id: 'accepted', label: 'Aceitos' },
            { id: 'confirmed', label: 'Confirmados' },
            { id: 'completed', label: 'Concluídos' },
            { id: 'cancelled', label: 'Cancelados' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedStatus(item.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
                selectedStatus === item.id
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-stone-300 bg-white text-stone-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="border border-stone-200 bg-white p-6 text-sm text-stone-500 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
          Nenhum agendamento encontrado para o filtro atual.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appointment, index) => (
            <article
              key={appointment.id}
              className={`border border-stone-200 bg-white p-4 space-y-3 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)] transition-all duration-400 ${
                entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
              style={{ transitionDelay: `${Math.min(index * 45, 260)}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{appointment.service?.name || 'Serviço'}</p>
                  <p className="text-xs text-stone-500">{appointment.provider?.name || 'Prestador'}</p>
                </div>
                <span className={`text-[11px] border px-2 py-1 rounded-full ${statusTone(appointment.status)}`}>
                  {statusLabel(appointment.status)}
                </span>
              </div>

              <p className="text-sm text-stone-600 inline-flex items-center gap-1.5">
                <FiCalendar size={13} /> {appointment.date} • <FiClock size={13} /> {appointment.time}
              </p>

              {appointment.client_notice && (
                <div className="border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800 rounded-xl">
                  {appointment.client_notice}
                </div>
              )}

              {appointment.status === 'counter_offer' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => respond(appointment.id, 'accept')}
                    disabled={busyId === appointment.id}
                    className="inline-flex items-center gap-1 border border-green-600 text-green-700 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 hover:bg-green-50 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
                  >
                    <FiCheck size={12} /> Aceitar
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(appointment.id, 'reject')}
                    disabled={busyId === appointment.id}
                    className="inline-flex items-center gap-1 border border-red-600 text-red-700 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 hover:bg-red-50 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                  >
                    <FiX size={12} /> Recusar
                  </button>
                </div>
              )}

              {['pending', 'counter_offer', 'accepted', 'confirmed'].includes(appointment.status) && (
                <button
                  type="button"
                  onClick={() => cancelarAgendamento(appointment.id)}
                  disabled={busyId === appointment.id}
                  className="inline-flex items-center gap-1 border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 hover:bg-red-100 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                >
                  <FiSlash size={12} /> Cancelar agendamento
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
