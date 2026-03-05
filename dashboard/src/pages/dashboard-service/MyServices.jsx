import { useEffect, useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { api } from '../../api/client'
import ServiceForm from '../../components/service-form/ServiceForm'
import ServiceCard from '../../components/service-card/ServiceCard'

export default function ServiceMyServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadServices() {
      setLoading(true)
      setError('')
      try {
        const res = await api.services.mine()
        if (!cancelled) setServices(Array.isArray(res) ? res : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Não foi possível carregar seus serviços.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadServices()
    return () => { cancelled = true }
  }, [])

  async function handleCreate(payload) {
    setSaving(true)
    try {
      const created = await api.services.criar(payload)
      setServices((prev) => [created, ...prev])
    } finally {
      setSaving(false)
    }
  }

  const filteredServices = useMemo(() => {
    const text = String(query || '').trim().toLowerCase()
    if (!text) return services
    return services.filter((service) => {
      const name = String(service?.name || '').toLowerCase()
      const description = String(service?.description || '').toLowerCase()
      return name.includes(text) || description.includes(text)
    })
  }, [services, query])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Meus Servicos</h2>
        <p className="text-sm text-stone-500">Organize seu catálogo com visual premium e dados claros para conversão.</p>
      </div>

      <div className="grid xl:grid-cols-[350px_1fr] gap-4 items-start">
        <div className="xl:sticky xl:top-4">
          <ServiceForm onSubmit={handleCreate} loading={saving} />
        </div>

        <section className="space-y-3">
          <div className="border border-stone-200 bg-white p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-900">Serviços cadastrados</p>
              <p className="text-xs text-stone-500">{filteredServices.length} de {services.length} exibidos</p>
            </div>
            <label className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou descrição"
                className="w-full border border-stone-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
            </label>
          </div>

          {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando serviços...</div>
          ) : filteredServices.length === 0 ? (
            <div className="border border-stone-200 bg-white p-6 text-sm text-stone-500">
              {services.length === 0
                ? 'Você ainda não cadastrou serviços. Use o formulário para começar.'
                : 'Nenhum serviço encontrado para esse filtro.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
