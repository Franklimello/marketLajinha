import { useEffect, useMemo, useState } from 'react'
import { FiClock, FiDollarSign, FiFileText, FiImage, FiScissors, FiTag, FiUpload } from 'react-icons/fi'

const INITIAL_FORM = {
  name: '',
  category: '',
  description: '',
  image_url_input: '',
  images_urls: [],
  price: '',
  duration_minutes: '30',
}

const PRESET_DURATIONS = [15, 30, 45, 60, 90]

const COMMON_CATEGORIES = [
  'Cabelo',
  'Barba',
  'Manicure',
  'Pedicure',
  'Sobrancelha',
  'Massagem',
  'Estetica facial',
  'Depilacao',
  'Eletrica',
  'Hidraulica',
  'Limpeza',
  'Montagem',
]

function mapServiceToForm(service) {
  if (!service) return { ...INITIAL_FORM }

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
  const [form, setForm] = useState(INITIAL_FORM)
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
      setError('Informe uma URL valida de imagem (http:// ou https://).')
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
      setError('Upload indisponivel no momento.')
      return
    }

    if (!canAddMoreImages) {
      setError('Limite de 10 imagens por servico.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const url = await onUploadImage(file)
      addImageUrl(url)
    } catch (err) {
      setError(err?.message || 'Falha ao enviar imagem do servico.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (typeof onSubmit !== 'function') {
      setError('Nao foi possivel enviar este formulario agora.')
      return
    }

    const payload = {
      name: String(form.name || '').trim(),
      category: String(form.category || '').trim(),
      description: String(form.description || '').trim(),
      images_urls: Array.isArray(form.images_urls) ? form.images_urls.slice(0, 10) : [],
      price: Number(form.price || 0),
      duration_minutes: Number(form.duration_minutes || 0),
    }

    if (!payload.name) {
      setError('Preencha o nome do servico.')
      return
    }

    if (!payload.category) {
      setError('Preencha a categoria do servico.')
      return
    }

    if (payload.price < 0 || Number.isNaN(payload.price)) {
      setError('Preco invalido. Use apenas numeros, por exemplo: 90.00')
      return
    }

    if (payload.duration_minutes < 5 || Number.isNaN(payload.duration_minutes)) {
      setError('Duracao invalida. Use no minimo 5 minutos.')
      return
    }

    try {
      await onSubmit(payload)
      if (!isEditing) setForm(INITIAL_FORM)
    } catch (err) {
      setError(err?.message || 'Nao foi possivel salvar o servico.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">{isEditing ? 'Editar servico' : 'Novo servico'}</h3>
          <p className="text-xs text-stone-500 mt-1">
            {isEditing
              ? 'Atualize nome, preco, duracao e descricao para manter o catalogo claro.'
              : 'Preencha os campos obrigatorios para publicar no seu catalogo.'}
          </p>
        </div>

        <span className="text-xs rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-1">
          {isEditing ? 'Edicao' : 'Novo'}
        </span>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-linear-to-br from-stone-50 to-amber-50 p-3 text-xs text-stone-600">
        Campos obrigatorios: Nome, Categoria, Preco e Duracao.
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiScissors size={13} /> Nome do servico
        </span>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ex.: Corte masculino completo"
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
          required
          maxLength={80}
        />
        <p className="text-[11px] text-stone-500">Use um nome objetivo. Evite abreviacoes confusas.</p>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiTag size={13} /> Categoria
        </span>
        <input
          name="category"
          list="service-category-list"
          value={form.category}
          onChange={handleChange}
          placeholder="Ex.: Cabelo"
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
          required
          maxLength={50}
        />
        <datalist id="service-category-list">
          {COMMON_CATEGORIES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <p className="text-[11px] text-stone-500">Escolha a categoria que o cliente usaria para buscar seu servico.</p>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiFileText size={13} /> Descricao
        </span>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Explique o que esta incluso no atendimento, para quem e em quanto tempo voce entrega."
          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-amber-500 focus:bg-white"
          maxLength={600}
        />
      </label>

      <div className="space-y-2">
        <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
          <FiImage size={13} /> Imagens do servico (maximo 10)
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <input
            name="image_url_input"
            type="url"
            value={form.image_url_input}
            onChange={handleChange}
            placeholder="https://site.com/imagem.jpg"
            className="flex-1 min-w-[220px] rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
            inputMode="url"
          />

          <button
            type="button"
            onClick={() => addImageUrl(form.image_url_input)}
            disabled={!canAddMoreImages}
            className="rounded-xl border border-stone-300 px-3 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Adicionar URL
          </button>

          <label className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer">
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

        <p className="text-[11px] text-stone-500">Mostre antes/depois, resultado final ou exemplo real do servico.</p>

        {form.images_urls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {form.images_urls.map((imageUrl) => (
              <div key={imageUrl} className="relative shrink-0">
                <img src={imageUrl} alt="Imagem do servico" className="w-20 h-20 object-cover border border-stone-300" />
                <button
                  type="button"
                  onClick={() => removeImageUrl(imageUrl)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold"
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
            <FiDollarSign size={13} /> Preco (R$)
          </span>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={handleChange}
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
            required
            placeholder="Ex.: 90.00"
            inputMode="decimal"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
            <FiClock size={13} /> Duracao (min)
          </span>
          <input
            name="duration_minutes"
            type="number"
            min="5"
            step="5"
            value={form.duration_minutes}
            onChange={handleChange}
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
            required
            placeholder="Ex.: 60"
            inputMode="numeric"
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
            className="w-full sm:w-auto rounded-xl bg-amber-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : (isEditing ? 'Salvar alteracoes' : 'Salvar servico')}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
