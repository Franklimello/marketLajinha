import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

function uniqueCities(list) {
  const seen = new Set()
  const result = []
  for (const item of list || []) {
    const nome = String(item?.nome || '').trim()
    if (!nome) continue
    const key = nome.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(nome)
  }
  return result.sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export default function ServiceSettingsPage() {
  const { account, atualizarConta } = useAuth()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [cities, setCities] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setName(String(account?.name || ''))
    setCity(String(account?.city || ''))
  }, [account])

  useEffect(() => {
    let cancelled = false

    async function loadCities() {
      try {
        const [mg, es] = await Promise.all([
          api.cidades.listar('MG').catch(() => []),
          api.cidades.listar('ES').catch(() => []),
        ])
        if (cancelled) return
        setCities(uniqueCities([...(Array.isArray(mg) ? mg : []), ...(Array.isArray(es) ? es : [])]))
      } catch {
        if (!cancelled) setCities([])
      }
    }

    loadCities()
    return () => { cancelled = true }
  }, [])

  const cidadeDisponivel = useMemo(() => {
    if (!city) return true
    return cities.some((item) => item.toLowerCase() === city.toLowerCase())
  }, [cities, city])

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)
    try {
      await atualizarConta({ name, city })
      setMessage('Configurações atualizadas com sucesso.')
    } catch (err) {
      setError(err.message || 'Não foi possível salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Settings</h2>
        <p className="text-sm text-stone-500">Atualize o perfil público e a cidade usada para exibir seus serviços.</p>
      </div>

      <form onSubmit={handleSubmit} className="border border-stone-200 bg-white p-4 space-y-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Nome público</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">Cidade</label>
          <input
            list="service-city-list"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-stone-300 px-3 py-2 text-sm"
            placeholder="Selecione ou digite sua cidade"
            required
          />
          <datalist id="service-city-list">
            {cities.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {!cidadeDisponivel && (
            <p className="text-xs text-amber-700 mt-1">Cidade fora da lista padrão. Verifique se está correta.</p>
          )}
        </div>

        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="border border-amber-600 text-amber-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}
