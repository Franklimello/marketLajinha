import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiMapPin, FiMessageCircle, FiPhone } from 'react-icons/fi'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getItem as getLocalItem } from '../storage/localStorageService'
import SEO from '../componentes/SEO'

const SELECTED_CITY_KEY = 'selectedCity'

function cityFromCliente(cliente) {
  const enderecos = Array.isArray(cliente?.enderecos) ? cliente.enderecos : []
  const padrao = enderecos.find((item) => item?.padrao) || enderecos[0]
  return String(padrao?.cidade || '').trim()
}

function excerpt(text, max = 120) {
  const value = String(text || '').trim()
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}...`
}

export default function ServicosPage() {
  const { cliente } = useAuth()
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const city = useMemo(() => {
    const selected = String(getLocalItem(SELECTED_CITY_KEY, '') || '').trim()
    return selected || cityFromCliente(cliente)
  }, [cliente])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!city) {
        setProviders([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const res = await api.services.providers(city)
        if (!cancelled) setProviders(Array.isArray(res) ? res : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Não foi possível carregar os prestadores.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [city])

  return (
    <div className="relative max-w-lg mx-auto px-4 pb-32 min-h-screen overflow-x-hidden">
      <SEO title="Serviços locais" description="Encontre profissionais e agende serviços na sua cidade." />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/65 to-transparent" />
      <div className="pointer-events-none absolute -top-14 right-[-4.2rem] -z-10 h-52 w-52 rounded-full bg-red-200/35 blur-3xl" />

      <div className="pt-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 font-medium">
          <FiArrowLeft /> Voltar
        </Link>
        <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-white/80 border border-stone-200 rounded-full px-2.5 py-1">
          <FiMapPin /> {city || 'Cidade não definida'}
        </span>
      </div>

      <section className="mt-3 mb-4 overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="relative px-4 pt-4 pb-5">
          <div className="pointer-events-none absolute -top-10 -right-12 h-32 w-32 rounded-full bg-red-100/70 blur-2xl" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Catálogo local</p>
            <h1 className="mt-1 text-[1.35rem] leading-tight font-black text-stone-900">Prestadores de serviços</h1>
            <p className="mt-1 text-xs text-stone-500">Escolha um profissional para ver os serviços e solicitar horário.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{providers.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">prestadores</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="text-sm font-black text-stone-900 truncate">{city || '-'}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">cidade ativa</p>
            </div>
          </div>
        </div>
      </section>

      {!city && (
        <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 rounded-xl mb-4">
          Defina sua cidade no perfil para visualizar serviços locais.
        </div>
      )}

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded-xl mb-4">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">Carregando prestadores...</div>
      ) : providers.length === 0 ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
          Nenhum prestador disponível para {city || 'sua cidade'}.
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <Link
              key={provider.id}
              to={`/servicos/profissional/${provider.id}`}
              className="border border-stone-200 bg-white p-4 block hover:border-red-300 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)] transition-colors"
            >
              <div className="flex items-start gap-3">
                {provider.profile_image_url ? (
                  <img src={provider.profile_image_url} alt={provider.name} className="w-14 h-14 object-cover rounded-xl border border-stone-300 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-stone-300 text-xs text-stone-400 flex items-center justify-center shrink-0">
                    Sem foto
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900">{provider.name}</p>
                  <p className="text-xs text-stone-500 mt-1">{provider.city} • {provider.services_count} serviço(s)</p>

                  {provider.about && (
                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">{excerpt(provider.about)}</p>
                  )}

                  {(provider.phone || provider.whatsapp) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-stone-500">
                      {provider.phone && <span className="inline-flex items-center gap-1"><FiPhone size={11} /> Telefone</span>}
                      {provider.whatsapp && <span className="inline-flex items-center gap-1"><FiMessageCircle size={11} /> WhatsApp</span>}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
