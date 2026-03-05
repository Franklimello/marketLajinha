import { useEffect, useMemo, useState } from 'react'
import { FiClock, FiDollarSign, FiFileText, FiImage, FiScissors, FiTag, FiUpload } from 'react-icons/fi'

const initialForm = {
  name: '',
  category: '',
  description: '',
  image_url_input: '',
  images_urls: [],
  price: '',
  duration_minutes: '30',
}

const PRESET_DURATIONS = [15, 30, 45, 60, 90]

function mapServiceToForm(service) {
  if (!service) return { ...initialForm }
  return {
    name: String(service.name || ''),
    category: String(service.category || ''),
    description: String(service.description || ''),
    image_url_input: '',
    images_urls: Array.isArray(service.images_urls) ? service.images_urls : [],
    price: String(Number(service.price || 0)),
    duration_minutes: String(Number(service.duration_minutes || 30)),
  }
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

export default function ServiceForm({
  onSubmit,
  onUploadImage,
  loading = false,
  service = null,
  onCancel,
}) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const isEditing = !!service
  const canAddMoreImages = useMemo(() => form.images_urls.length < 10, [form.images_urls.length])

  useEffect(() => {
    setForm(mapServiceToForm(service))
    setError('')
  }, [service])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function addImageUrl(url) {
    const normalized = String(url || '').trim()
    if (!isHttpUrl(normalized)) {
      setError('Informe uma URL de imagem válida (http/https).')
      return
    }
    setForm((prev) => {
      if (prev.images_urls.includes(normalized)) return prev
      if (prev.images_urls.length >= 10) return prev
      return {
        ...prev,
        image_url_input: '',
        images_urls: [...prev.images_urls, normalized],
      }
    })
  }

  function removeImageUrl(url) {
    setForm((prev) => ({
      ...prev,
      images_urls: prev.images_urls.filter((item) => item !== url),
    }))
  }

  async function handleUploadImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!onUploadImage) {
      setError('Upload indisponível no momento.')
      return
    }
    if (!canAddMoreImages) {
      setError('Limite de 10 imagens por serviço.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const url = await onUploadImage(file)
      addImageUrl(url)
    } catch (err) {
      setError(err?.message || 'Falha ao enviar imagem do serviço.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const payload = {
      name: String(form.name || '').trim(),
      category: String(form.category || '').trim(),
      description: String(form.description || '').trim(),
      images_urls: Array.isArray(form.images_urls) ? form.images_urls.slice(0, 10) : [],
      price: Number(form.price || 0),
      duration_minutes: Number(form.duration_minutes || 0),
    }

    if (!payload.name) {
      setError('Informe o nome do serviço.')
      return
    }
    if (!payload.category) {
      setError('Informe a categoria do serviço.')
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
      if (!isEditing) setForm(initialForm)
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar o serviço.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-stone-200 bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">{isEditing ? 'Editar serviço' : 'Criar serviço'}</h3>
          <p className="text-xs text-stone-500 mt-1">
            {isEditing
              ? 'Atualize os dados do serviço selecionado.'
              : 'Preencha os dados para publicar no catálogo da sua cidade.'}
          </p>
        </div>
        <span className="text-xs border border-amber-200 bg-amber-50 text-amber-700 px-2 py-1">
          {isEditing ? 'Edição' : 'Novo'}
        </span>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiScissors size={13} /> Nome do serviço
        </span>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ex.: Corte masculino premium"
          className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiTag size={13} /> Categoria
        </span>
        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Ex.: Cabelo, Manicure, Massagem, Elétrica..."
          className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiFileText size={13} /> Descrição
        </span>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Detalhes, benefícios e observações do atendimento"
          className="w-full border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-500"
        />
      </label>

      <div className="space-y-2">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiImage size={13} /> Carrossel de imagens (até 10)
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="image_url_input"
            value={form.image_url_input}
            onChange={handleChange}
            placeholder="Cole uma URL de imagem"
            className="flex-1 min-w-[220px] border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => addImageUrl(form.image_url_input)}
            disabled={!canAddMoreImages}
            className="border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Adicionar URL
          </button>
          <label className="inline-flex items-center gap-1.5 border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer">
            <FiUpload size={12} /> {uploading ? 'Enviando...' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              disabled={uploading || !canAddMoreImages}
              className="hidden"
            />
          </label>
        </div>

        {form.images_urls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {form.images_urls.map((imageUrl) => (
              <div key={imageUrl} className="relative shrink-0">
                <img src={imageUrl} alt="Imagem do serviço" className="w-20 h-20 object-cover border border-stone-300" />
                <button
                  type="button"
                  onClick={() => removeImageUrl(imageUrl)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white text-[10px] font-bold"
                  aria-label="Remover imagem"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
            <FiDollarSign size={13} /> Preço (R$)
          </span>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={handleChange}
            className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            required
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
            <FiClock size={13} /> Duração (min)
          </span>
          <input
            name="duration_minutes"
            type="number"
            min="5"
            step="5"
            value={form.duration_minutes}
            onChange={handleChange}
            className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            required
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_DURATIONS.map((duration) => (
          <button
            key={duration}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, duration_minutes: String(duration) }))}
            className={`border px-2.5 py-1 text-xs ${
              String(form.duration_minutes) === String(duration)
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-stone-300 text-stone-600 hover:border-stone-400'
            }`}
          >
            {duration} min
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Salvar serviço')}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
