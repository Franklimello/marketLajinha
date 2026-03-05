import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import ServiceForm from '../../components/service-form/ServiceForm'
import ServiceCard from '../../components/service-card/ServiceCard'

export default function ServiceMyServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadServices() {
    setLoading(true)
    setError('')
    try {
      const res = await api.services.mine()
      setServices(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err.message || 'Não foi possível carregar seus serviços.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">My Services</h2>
        <p className="text-sm text-stone-500">Cadastre e organize os serviços disponíveis para sua cidade.</p>
      </div>

      <ServiceForm onSubmit={handleCreate} loading={saving} />

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Carregando serviços...</div>
      ) : services.length === 0 ? (
        <div className="border border-stone-200 bg-white p-4 text-sm text-stone-500">Nenhum serviço cadastrado.</div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}
