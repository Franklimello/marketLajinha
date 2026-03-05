import { useState } from 'react'

const initialForm = {
  name: '',
  description: '',
  price: '',
  duration_minutes: '30',
}

export default function ServiceForm({ onSubmit, loading = false }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const payload = {
      name: String(form.name || '').trim(),
      description: String(form.description || '').trim(),
      price: Number(form.price || 0),
      duration_minutes: Number(form.duration_minutes || 0),
    }

    if (!payload.name) {
      setError('Informe o nome do serviço.')
      return
    }

    if (payload.price < 0 || Number.isNaN(payload.price)) {
      setError('Preço inválido.')
      return
    }

    if (payload.duration_minutes < 5 || Number.isNaN(payload.duration_minutes)) {
      setError('Duração inválida. Use no mínimo 5 minutos.')
      return
    }

    try {
      await onSubmit(payload)
      setForm(initialForm)
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar o serviço.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-stone-200 bg-white p-4 space-y-3">
      <h3 className="text-base font-semibold text-stone-900">Novo serviço</h3>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Nome</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ex.: Corte masculino"
          className="w-full border border-stone-300 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Descrição</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Detalhes rápidos do serviço"
          className="w-full border border-stone-300 px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Preço (R$)</label>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={handleChange}
            className="w-full border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Duração (min)</label>
          <input
            name="duration_minutes"
            type="number"
            min="5"
            step="5"
            value={form.duration_minutes}
            onChange={handleChange}
            className="w-full border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-amber-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Salvar serviço'}
      </button>
    </form>
  )
}
