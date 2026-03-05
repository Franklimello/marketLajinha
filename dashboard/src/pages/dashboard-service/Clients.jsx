import { useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiClock, FiSearch, FiUser, FiUsers, FiXCircle } from 'react-icons/fi'
import { api } from '../../api/client'

function formatStatus(status) {
  const labels = {
    pending: 'Pendente',
    accepted: 'Aceito',
    counter_offer: 'Contraproposta',
    confirmed: 'Confirmado',
    completed: 'Concluido',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

function formatDate(value) {
  if (!value) return '-'
  const dt = new Date(value)
  if (!Number.isFinite(dt.getTime())) return String(value)
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ServiceClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.appointments.providerClients()
        if (!cancelled) setClients(Array.isArray(res) ? res : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Nao foi possivel carregar a lista de clientes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const text = String(query || '').trim().toLowerCase()
    if (!text) return clients

    return clients.filter((item) => {
      const nome = String(item?.nome || '').toLowerCase()
      const email = String(item?.email || '').toLowerCase()
      const telefone = String(item?.telefone || '').toLowerCase()
      return nome.includes(text) || email.includes(text) || telefone.includes(text)
    })
  }, [clients, query])

  const totals = useMemo(() => {
    return filtered.reduce((acc, client) => {
      acc.total += Number(client?.total_agendamentos || 0)
      acc.concluidos += Number(client?.concluidos || 0)
      acc.ativos += Number(client?.pendentes || 0)
      acc.cancelados += Number(client?.cancelados || 0)
      return acc
    }, {
      total: 0,
      concluidos: 0,
      ativos: 0,
      cancelados: 0,
    })
  }, [filtered])

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <section className="relative overflow-hidden rounded-3xl border border-stone-300 bg-linear-to-br from-stone-900 via-stone-800 to-amber-700 text-white p-4 sm:p-5 shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Relacionamento com clientes</p>
        <h2 className="text-2xl font-semibold mt-1">Clientes e historico</h2>
        <p className="text-sm text-stone-200 mt-2 max-w-2xl">
          Consulte frequencia de atendimento e historico para decidir melhor suas proximas ofertas.
        </p>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
        <article className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-stone-500 inline-flex items-center gap-1"><FiUsers size={12} /> Clientes</p>
          <p className="text-2xl font-semibold text-stone-900 mt-1 font-numeric">{filtered.length}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-3 shadow-sm text-blue-800">
          <p className="text-[11px] uppercase tracking-wide inline-flex items-center gap-1"><FiClock size={12} /> Ativos</p>
          <p className="text-2xl font-semibold mt-1 font-numeric">{totals.ativos}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm text-emerald-800">
          <p className="text-[11px] uppercase tracking-wide inline-flex items-center gap-1"><FiCheckCircle size={12} /> Concluidos</p>
          <p className="text-2xl font-semibold mt-1 font-numeric">{totals.concluidos}</p>
        </article>
        <article className="rounded-2xl border border-red-200 bg-red-50 p-3 shadow-sm text-red-800">
          <p className="text-[11px] uppercase tracking-wide inline-flex items-center gap-1"><FiXCircle size={12} /> Cancelados</p>
          <p className="text-2xl font-semibold mt-1 font-numeric">{totals.cancelados}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
        <p className="text-sm font-semibold text-stone-900">{filtered.length} cliente(s)</p>

        <label className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, email ou telefone"
            className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </label>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">Carregando clientes...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
          Nenhum cliente encontrado. Assim que houver atendimentos, os dados aparecem aqui.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <article key={client.client_id} className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
                    <FiUser size={13} /> {client.nome || 'Cliente'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">{client.email || '-'} - {client.telefone || '-'}</p>
                </div>

                <div className="text-xs text-stone-600">
                  Ultimo agendamento: <strong>{formatDate(client.ultimo_agendamento_em)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <p className="rounded-xl border border-stone-200 bg-stone-50 px-2 py-1.5">Total: <strong>{client.total_agendamentos}</strong></p>
                <p className="rounded-xl border border-green-200 bg-green-50 px-2 py-1.5 text-green-700">Concluidos: <strong>{client.concluidos}</strong></p>
                <p className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-1.5 text-blue-700">Ativos: <strong>{client.pendentes}</strong></p>
                <p className="rounded-xl border border-red-200 bg-red-50 px-2 py-1.5 text-red-700">Cancelados: <strong>{client.cancelados}</strong></p>
                <p className="rounded-xl border border-red-200 bg-red-50 px-2 py-1.5 text-red-700">Recusados: <strong>{client.recusados}</strong></p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Historico recente</p>
                <div className="space-y-1">
                  {(client.historico || []).slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-xl border border-stone-200 px-2 py-1.5 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2">
                      <span>{item.date} {item.time} - {item.service?.name || 'Servico'}</span>
                      <span className="font-semibold">{formatStatus(item.status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
