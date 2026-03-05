import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiMapPin } from 'react-icons/fi'
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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <SEO title="Serviços locais" description="Encontre profissionais e agende serviços na sua cidade." />

      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
          <FiArrowLeft /> Voltar
        </Link>
        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
          <FiMapPin /> {city || 'Cidade não definida'}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-stone-900">Prestadores de serviços</h1>
        <p className="text-sm text-stone-500">Selecione um profissional para ver serviços e solicitar um horário.</p>
      </div>

      {!city && (
        <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Defina sua cidade no perfil para visualizar serviços locais.
        </div>
      )}

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando prestadores...</div>
      ) : providers.length === 0 ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">
          Nenhum prestador disponível para {city || 'sua cidade'}.
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <Link
              key={provider.id}
              to={`/servicos/profissional/${provider.id}`}
              className="border border-stone-200 bg-white p-4 block hover:border-red-300"
            >
              <p className="text-sm font-semibold text-stone-900">{provider.name}</p>
              <p className="text-xs text-stone-500 mt-1">{provider.city} • {provider.services_count} serviço(s)</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
