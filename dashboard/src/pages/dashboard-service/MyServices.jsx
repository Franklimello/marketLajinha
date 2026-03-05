import { useEffect, useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { api } from '../../api/client'
import { uploadImagem } from '../../config/firebase'
import ServiceForm from '../../components/service-form/ServiceForm'
import ServiceCard from '../../components/service-card/ServiceCard'
import { useAuth } from '../../context/AuthContext'

export default function ServiceMyServicesPage() {
  const { account } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingService, setEditingService] = useState(null)
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
        if (!cancelled) setError(err.message || 'Nao foi possivel carregar seus servicos.')
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

  async function handleUpdate(payload) {
    if (!editingService?.id) return
    setSaving(true)
    try {
      const updated = await api.services.atualizar(editingService.id, payload)
      setServices((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setEditingService(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(service) {
    if (!service?.id) return
    if (!window.confirm(`Excluir o servico "${service.name}"?`)) return

    setDeletingId(service.id)
    try {
      await api.services.excluir(service.id)
      setServices((prev) => prev.filter((item) => item.id !== service.id))
      if (editingService?.id === service.id) setEditingService(null)
    } finally {
      setDeletingId('')
    }
  }

  async function handleUploadImage(file) {
    const providerId = String(account?.id || '').trim()
    if (!providerId) {
      throw new Error('Conta de prestador nao identificada para upload.')
    }

    const safeName = String(file?.name || 'servico').replace(/[^\w.-]/g, '')
    const fileName = `servico-${Date.now()}-${safeName}`
    const path = `produtos/${providerId}/${fileName}`
    return uploadImagem(file, path)
  }

  const filteredServices = useMemo(() => {
    const text = String(query || '').trim().toLowerCase()
    if (!text) return services

    return services.filter((service) => {
      const name = String(service?.name || '').toLowerCase()
      const category = String(service?.category || '').toLowerCase()
      const description = String(service?.description || '').toLowerCase()
      return name.includes(text) || category.includes(text) || description.includes(text)
    })
  }, [services, query])

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <section className="relative overflow-hidden rounded-3xl border border-stone-300 bg-linear-to-br from-stone-900 via-stone-800 to-amber-700 text-white p-4 sm:p-5 shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Catalogo premium</p>
          <h2 className="text-2xl font-semibold mt-1">Meus servicos</h2>
          <p className="text-sm text-stone-200 mt-2 max-w-2xl">
            Cadastre servicos com nome claro, preco e duracao para facilitar a escolha do cliente.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-[11px] rounded-full border border-white/25 bg-white/10 px-2.5 py-1">
              Total: {services.length}
            </span>
            <span className="text-[11px] rounded-full border border-white/25 bg-white/10 px-2.5 py-1">
              Exibidos: {filteredServices.length}
            </span>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        Ordem recomendada: 1) Cadastre o servico, 2) confira como o card ficou, 3) repita para cada tipo de atendimento.
      </div>

      <div className="grid xl:grid-cols-[350px_1fr] gap-4 items-start">
        <div className="xl:sticky xl:top-4">
          <ServiceForm
            service={editingService}
            onSubmit={editingService ? handleUpdate : handleCreate}
            onUploadImage={handleUploadImage}
            onCancel={() => setEditingService(null)}
            loading={saving}
          />
        </div>

        <section className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
            <div>
              <p className="text-sm font-semibold text-stone-900">Servicos cadastrados</p>
              <p className="text-xs text-stone-500">{filteredServices.length} de {services.length} exibidos</p>
            </div>

            <label className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, categoria ou descricao"
                className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </label>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">Carregando servicos...</div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
              {services.length === 0
                ? 'Voce ainda nao cadastrou servicos. Preencha o formulario ao lado para comecar.'
                : 'Nenhum servico encontrado para este filtro.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={setEditingService}
                  onDelete={handleDelete}
                  deleting={deletingId === service.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
