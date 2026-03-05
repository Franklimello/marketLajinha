import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SEO from '../componentes/SEO'

function statusLabel(status) {
  const labels = {
    pending: 'Pendente',
    accepted: 'Aceito pelo prestador',
    counter_offer: 'Contraproposta',
    confirmed: 'Confirmado',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

export default function MeusAgendamentosPage() {
  const navigate = useNavigate()
  const { logado, perfilCompleto } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

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

  const ordered = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (a.date !== b.date) return String(b.date).localeCompare(String(a.date))
      return String(a.time || '').localeCompare(String(b.time || ''))
    })
  }, [appointments])

  if (!logado || !perfilCompleto) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <SEO title="Meus agendamentos" description="Acompanhe solicitações e responda contrapropostas." noIndex />

      <div className="flex items-center justify-between">
        <Link to="/servicos" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
          <FiArrowLeft /> Voltar
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-stone-900">Meus agendamentos</h1>
        <p className="text-sm text-stone-500">Veja o status de cada solicitação de serviço.</p>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando...</div>
      ) : ordered.length === 0 ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Você ainda não possui agendamentos.</div>
      ) : (
        <div className="space-y-3">
          {ordered.map((appointment) => (
            <article key={appointment.id} className="border border-stone-200 bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{appointment.service?.name || 'Serviço'}</p>
                  <p className="text-xs text-stone-500">{appointment.provider?.name || 'Prestador'}</p>
                </div>
                <span className="text-[11px] border border-stone-300 px-2 py-1 text-stone-600">
                  {statusLabel(appointment.status)}
                </span>
              </div>

              <p className="text-sm text-stone-600">{appointment.date} • {appointment.time}</p>

              {appointment.client_notice && (
                <div className="border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                  {appointment.client_notice}
                </div>
              )}

              {appointment.status === 'counter_offer' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => respond(appointment.id, 'accept')}
                    disabled={busyId === appointment.id}
                    className="border border-green-600 text-green-700 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Aceitar
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(appointment.id, 'reject')}
                    disabled={busyId === appointment.id}
                    className="border border-red-600 text-red-700 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
