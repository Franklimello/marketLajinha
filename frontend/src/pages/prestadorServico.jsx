import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiAtSign, FiCalendar, FiClock, FiMapPin, FiMessageCircle, FiPhone } from 'react-icons/fi'
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

function normalizeText(value) {
  return String(value || '').trim()
}

function whatsappHref(value) {
  const digits = normalizeText(value).replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}`
}

function instagramHref(value) {
  const username = normalizeText(value).replace(/^@/, '')
  if (!username) return ''
  return `https://instagram.com/${username}`
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function PrestadorServicoPage() {
  const { providerId } = useParams()
  const navigate = useNavigate()
  const { cliente, logado, perfilCompleto } = useAuth()

  const [profile, setProfile] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [entered, setEntered] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    async function loadSlots() {
      if (!selectedService?.id || !date) {
        setAvailableSlots([])
        setSlotError('')
        return
      }

      setLoadingSlots(true)
      setSlotError('')

      try {
        const res = await api.appointments.availableSlots(selectedService.id, date)
        if (cancelled) return
        setAvailableSlots(Array.isArray(res?.slots) ? res.slots : [])
      } catch (err) {
        if (!cancelled) {
          setAvailableSlots([])
          setSlotError(err.message || 'Nao foi possivel carregar os horarios livres.')
        }
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }

    loadSlots()
    return () => { cancelled = true }
  }, [selectedService?.id, date])

  const freeSlots = useMemo(() => {
    return availableSlots
      .filter((item) => item?.available)
      .map((item) => String(item.time || '').trim())
      .filter(Boolean)
  }, [availableSlots])

  useEffect(() => {
    if (!time) return
    if (freeSlots.includes(time)) return
    setTime('')
  }, [freeSlots, time])

  useEffect(() => {
    setEntered(false)
    const frameId = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frameId)
  }, [loading, profile?.id, selectedService?.id])

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
    <div className="relative max-w-lg mx-auto px-4 pb-32 min-h-screen overflow-x-hidden">
      <SEO title="Perfil do prestador" description="Veja serviços disponíveis e solicite um horário." noIndex />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/65 to-transparent" />
      <div className="pointer-events-none absolute -top-14 right-[-4.2rem] -z-10 h-52 w-52 rounded-full bg-red-200/35 blur-3xl" />

      <div className="pt-4 flex items-center justify-between">
        <Link to="/servicos" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 font-medium">
          <FiArrowLeft /> Voltar
        </Link>
      </div>

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)] mt-4">Carregando perfil...</div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded-xl mt-4">{error}</div>
      ) : !profile ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl mt-4">Prestador não encontrado.</div>
      ) : (
        <>
          <section className={`mt-4 border border-stone-200 bg-white p-4 space-y-3 rounded-3xl shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] overflow-hidden transition-all duration-400 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="rounded-2xl border border-stone-200 bg-linear-to-br from-stone-900 via-stone-800 to-amber-700 text-white p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">Perfil profissional</p>
              <p className="text-xs text-stone-200 mt-1">Veja serviços e escolha um horário em segundos.</p>
            </div>
            <div className="flex items-start gap-3">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt={profile.name} className="w-20 h-20 object-cover border border-stone-300 rounded-2xl shrink-0" />
              ) : (
                <div className="w-20 h-20 border border-dashed border-stone-300 text-xs text-stone-400 flex items-center justify-center text-center p-2 rounded-2xl shrink-0">
                  Sem foto
                </div>
              )}

              <div>
                <h1 className="text-xl font-bold text-stone-900">{profile.name}</h1>
                <p className="text-sm text-stone-500 mt-1 inline-flex items-center gap-1">
                  <FiMapPin size={13} /> {profile.city}
                </p>
                {normalizeText(profile.business_hours) && (
                  <p className="text-xs text-stone-500 mt-2 inline-flex items-center gap-1">
                    <FiClock size={12} /> {profile.business_hours}
                  </p>
                )}
              </div>
            </div>

            {normalizeText(profile.about) && (
              <p className="text-sm text-stone-700 leading-relaxed">{profile.about}</p>
            )}

            {(normalizeText(profile.phone) || normalizeText(profile.whatsapp) || normalizeText(profile.instagram) || normalizeText(profile.address)) && (
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-stone-600">
                {normalizeText(profile.phone) && (
                  <p className="border border-stone-200 bg-stone-50 px-2 py-2 inline-flex items-center gap-1.5">
                    <FiPhone size={12} /> {profile.phone}
                  </p>
                )}
                {normalizeText(profile.whatsapp) && whatsappHref(profile.whatsapp) && (
                  <a
                    href={whatsappHref(profile.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-stone-200 bg-stone-50 px-2 py-2 inline-flex items-center gap-1.5 hover:border-green-300"
                  >
                    <FiMessageCircle size={12} /> WhatsApp
                  </a>
                )}
                {normalizeText(profile.instagram) && instagramHref(profile.instagram) && (
                  <a
                    href={instagramHref(profile.instagram)}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-stone-200 bg-stone-50 px-2 py-2 inline-flex items-center gap-1.5 hover:border-amber-300"
                  >
                    <FiAtSign size={12} /> {profile.instagram}
                  </a>
                )}
                {normalizeText(profile.address) && (
                  <p className="border border-stone-200 bg-stone-50 px-2 py-2 inline-flex items-center gap-1.5">
                    <FiMapPin size={12} /> {profile.address}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-black text-stone-900">Serviços</h2>
              <span className="text-[11px] rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600">
                {(profile.services || []).length} disponível(is)
              </span>
            </div>
            {Array.isArray(profile.services) && profile.services.length > 0 ? (
              profile.services.map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selecting={selectedService?.id === service.id}
                  onSelect={() => setSelectedService(service)}
                  entered={entered}
                  delayMs={Math.min(index * 50 + 60, 320)}
                />
              ))
            ) : (
              <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl">Sem serviços disponíveis.</div>
            )}
          </section>

          <form onSubmit={handleBook} className={`border border-stone-200 bg-white p-4 space-y-3 rounded-3xl shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] transition-all duration-400 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transitionDelay: '120ms' }}>
            <div className="rounded-2xl border border-red-200 bg-linear-to-r from-red-50 to-orange-50 px-3 py-2.5">
              <h3 className="text-sm font-black text-stone-900">Solicitar agendamento</h3>
              <p className="text-[11px] text-stone-600 mt-1">Selecione serviço, data e horário livre para enviar sua solicitação.</p>
            </div>
            <p className="text-xs text-stone-500">
              Serviço selecionado: {selectedService?.name || 'nenhum serviço'}
            </p>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Resumo do agendamento</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                <div className="rounded-xl border border-stone-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">Serviço</p>
                  <p className="font-semibold text-stone-800 mt-0.5 truncate">{selectedService?.name || '-'}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">Valor</p>
                  <p className="font-semibold text-stone-800 mt-0.5">{selectedService ? formatCurrency(selectedService.price) : '-'}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">Data</p>
                  <p className="font-semibold text-stone-800 mt-0.5">{date || '-'}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">Horário</p>
                  <p className="font-semibold text-stone-800 mt-0.5">{time || '-'}</p>
                </div>
              </div>
            </div>

            <label className="text-xs text-stone-600 space-y-1 block">
              <span className="inline-flex items-center gap-1"><FiCalendar /> Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-stone-300 bg-stone-50 rounded-xl px-2.5 py-2 text-sm transition-all focus:outline-none focus:border-red-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-red-200"
                required
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs text-stone-600 inline-flex items-center gap-1"><FiClock /> Horarios livres</p>

              {!selectedService ? (
                <p className="text-xs text-stone-500">Selecione um servico para ver os horarios disponiveis.</p>
              ) : !date ? (
                <p className="text-xs text-stone-500">Selecione uma data para carregar os horarios livres.</p>
              ) : loadingSlots ? (
                <p className="text-xs text-stone-500">Carregando horarios...</p>
              ) : freeSlots.length === 0 ? (
                <p className="text-xs text-red-600">Sem horarios livres para este dia.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {freeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`border px-1.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 ${
                        time === slot
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-green-300 bg-white text-green-700 hover:border-green-500'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}

              {time && (
                <p className="text-xs text-green-700">
                  Horario selecionado: <strong>{time}</strong>
                </p>
              )}
            </div>

            {message && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-2.5 space-y-1.5">
                <p className="text-sm text-green-700">{message}</p>
                <Link to="/meus-agendamentos" className="inline-flex text-xs font-semibold text-green-800 underline">
                  Ver meus agendamentos
                </Link>
              </div>
            )}
            {slotError && <p className="text-sm text-red-700">{slotError}</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={booking || !selectedService}
              className="w-full border border-red-600 text-red-700 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-150 hover:bg-red-50 active:scale-[0.995] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            >
              {booking ? 'Enviando...' : 'Solicitar horário'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
