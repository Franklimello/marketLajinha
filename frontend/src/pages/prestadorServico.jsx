import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiClock } from 'react-icons/fi'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getItem as getLocalItem } from '../storage/localStorageService'
import ServiceCard from '../componentes/services/ServiceCard'
import SEO from '../componentes/SEO'

const SELECTED_CITY_KEY = 'selectedCity'

function cityFromCliente(cliente) {
  const enderecos = Array.isArray(cliente?.enderecos) ? cliente.enderecos : []
  const padrao = enderecos.find((item) => item?.padrao) || enderecos[0]
  return String(padrao?.cidade || '').trim()
}

export default function PrestadorServicoPage() {
  const { providerId } = useParams()
  const navigate = useNavigate()
  const { cliente, logado, perfilCompleto } = useAuth()

  const [profile, setProfile] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const city = useMemo(() => {
    const selected = String(getLocalItem(SELECTED_CITY_KEY, '') || '').trim()
    return selected || cityFromCliente(cliente)
  }, [cliente])

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      if (!city) {
        setLoading(false)
        setError('Defina sua cidade no perfil para acessar os prestadores.')
        return
      }

      setLoading(true)
      setError('')
      try {
        const res = await api.services.providerProfile(providerId, city)
        if (cancelled) return
        setProfile(res)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Não foi possível carregar este prestador.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [providerId, city])

  async function handleBook(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!selectedService) {
      setError('Selecione um serviço antes de agendar.')
      return
    }

    if (!date || !time) {
      setError('Informe data e horário para o agendamento.')
      return
    }

    if (!logado) {
      navigate(`/login?voltar=${encodeURIComponent(`/servicos/profissional/${providerId}`)}`)
      return
    }

    if (!perfilCompleto) {
      navigate('/perfil')
      return
    }

    setBooking(true)
    try {
      await api.appointments.criar({
        service_id: selectedService.id,
        date,
        time,
      })
      setMessage('Solicitação enviada com sucesso. Acompanhe em "Meus agendamentos".')
      setDate('')
      setTime('')
    } catch (err) {
      setError(err.message || 'Não foi possível solicitar este horário.')
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <SEO title="Perfil do prestador" description="Veja serviços disponíveis e solicite um horário." noIndex />

      <div className="flex items-center justify-between">
        <Link to="/servicos" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
          <FiArrowLeft /> Voltar
        </Link>
        <Link to="/meus-agendamentos" className="text-xs text-red-600 hover:underline">
          Meus agendamentos
        </Link>
      </div>

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando perfil...</div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : !profile ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Prestador não encontrado.</div>
      ) : (
        <>
          <section className="border border-stone-200 bg-white p-4">
            <h1 className="text-xl font-bold text-stone-900">{profile.name}</h1>
            <p className="text-sm text-stone-500 mt-1">{profile.city}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-stone-900">Serviços</h2>
            {Array.isArray(profile.services) && profile.services.length > 0 ? (
              profile.services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selecting={selectedService?.id === service.id}
                  onSelect={() => setSelectedService(service)}
                />
              ))
            ) : (
              <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Sem serviços disponíveis.</div>
            )}
          </section>

          <form onSubmit={handleBook} className="border border-stone-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-stone-900">Solicitar agendamento</h3>
            <p className="text-xs text-stone-500">
              Serviço selecionado: {selectedService?.name || 'nenhum serviço'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-stone-600 space-y-1">
                <span className="inline-flex items-center gap-1"><FiCalendar /> Data</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-stone-300 px-2 py-2 text-sm"
                  required
                />
              </label>

              <label className="text-xs text-stone-600 space-y-1">
                <span className="inline-flex items-center gap-1"><FiClock /> Horário</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full border border-stone-300 px-2 py-2 text-sm"
                  required
                />
              </label>
            </div>

            {message && <p className="text-sm text-green-700">{message}</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={booking || !selectedService}
              className="border border-red-600 text-red-700 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {booking ? 'Enviando...' : 'Solicitar horário'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
