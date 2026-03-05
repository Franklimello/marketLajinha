import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiMapPin, FiMessageCircle, FiPhone } from 'react-icons/fi'
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
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [entered, setEntered] = useState(false)

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

  const categories = useMemo(() => {
    const all = providers.flatMap((provider) => (Array.isArray(provider.categories) ? provider.categories : []))
    return Array.from(new Set(all.filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [providers])

  const filteredProviders = useMemo(() => {
    const text = String(query || '').trim().toLowerCase()
    return providers.filter((provider) => {
      const byCategory = selectedCategory === 'all' || (provider.categories || []).includes(selectedCategory)
      if (!byCategory) return false
      if (!text) return true
      const name = String(provider?.name || '').toLowerCase()
      const about = String(provider?.about || '').toLowerCase()
      const categoriesText = String((provider?.categories || []).join(' ') || '').toLowerCase()
      return name.includes(text) || about.includes(text) || categoriesText.includes(text)
    })
  }, [providers, selectedCategory, query])

  useEffect(() => {
    setEntered(false)
    const frameId = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frameId)
  }, [loading, selectedCategory, query, city])

  return (
    <div className="relative max-w-lg mx-auto px-4 pb-32 min-h-screen overflow-x-hidden">
      <SEO title="Serviços locais" description="Encontre profissionais e agende serviços na sua cidade." />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/65 to-transparent" />
      <div className="pointer-events-none absolute -top-14 right-[-4.2rem] -z-10 h-52 w-52 rounded-full bg-red-200/35 blur-3xl" />

      <div className="pt-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 font-medium">
          <FiArrowLeft /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/meus-agendamentos"
            className="text-xs font-semibold text-red-700 border border-red-200 bg-red-50 rounded-full px-2.5 py-1 hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Meus agendamentos
          </Link>
          <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-white/80 border border-stone-200 rounded-full px-2.5 py-1">
            <FiMapPin /> {city || 'Cidade não definida'}
          </span>
        </div>
      </div>

      <section className="mt-3 mb-4 overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="relative px-4 pt-4 pb-5">
          <div className="pointer-events-none absolute -top-10 -right-12 h-32 w-32 rounded-full bg-red-100/70 blur-2xl" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Catálogo local</p>
            <h1 className="mt-1 text-[1.35rem] leading-tight font-black text-stone-900">Prestadores de serviços</h1>
            <p className="mt-1 text-xs text-stone-500">Escolha um profissional, compare categorias e agende em poucos toques.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{filteredProviders.length}</p>
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

      <section className="mb-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)] space-y-2.5">
        <label className="block">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar prestador ou categoria"
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 transition-all focus:outline-none focus:border-red-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-red-200"
          />
        </label>

        {categories.length > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Filtrar por categoria</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
                  selectedCategory === 'all'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-stone-300 bg-white text-stone-600'
                }`}
              >
                Todas
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
                    selectedCategory === category
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-stone-300 bg-white text-stone-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">Carregando prestadores...</div>
      ) : filteredProviders.length === 0 ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500 rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
          Nenhum prestador disponível para esse filtro em {city || 'sua cidade'}.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProviders.map((provider, index) => (
            <Link
              key={provider.id}
              to={`/servicos/profissional/${provider.id}`}
              className={`group border border-stone-200 bg-white p-4 block rounded-2xl shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)] transition-all duration-400 hover:border-red-300 hover:-translate-y-0.5 hover:shadow-[0_24px_52px_-34px_rgba(15,23,42,0.75)] active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
                entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
              style={{ transitionDelay: `${Math.min(index * 45, 260)}ms` }}
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-900">{provider.name}</p>
                    <span className="text-[11px] text-red-700 inline-flex items-center gap-1 font-semibold shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
                      Ver perfil <FiArrowRight size={12} />
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">{provider.city} • {provider.services_count} serviço(s)</p>
                  {Array.isArray(provider.categories) && provider.categories.length > 0 && (
                    <p className="text-[11px] text-stone-500 mt-1 truncate">
                      Categorias: {provider.categories.join(', ')}
                    </p>
                  )}

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
