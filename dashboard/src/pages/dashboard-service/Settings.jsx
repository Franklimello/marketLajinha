import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiAtSign,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiInfo,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiSave,
  FiUser,
} from 'react-icons/fi'
import { api } from '../../api/client'
import { uploadImagem } from '../../config/firebase'
import { useAuth } from '../../context/AuthContext'

const INITIAL_FORM = {
  name: '',
  city: '',
  profile_image_url: '',
  about: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  address: '',
  business_hours: '',
}

const BUSINESS_HOURS_SUGGESTIONS = [
  'Seg a Sex, 08:00 as 18:00',
  'Seg a Sab, 09:00 as 19:00',
  'Sabado, 08:00 as 14:00',
  'Atendimento com hora marcada',
]

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

function normalize(value) {
  return String(value || '').trim()
}

export default function ServiceSettingsPage() {
  const { account, atualizarConta } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [cities, setCities] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    setForm({
      name: String(account?.name || ''),
      city: String(account?.city || ''),
      profile_image_url: String(account?.profile_image_url || ''),
      about: String(account?.about || ''),
      phone: String(account?.phone || ''),
      whatsapp: String(account?.whatsapp || ''),
      instagram: String(account?.instagram || ''),
      address: String(account?.address || ''),
      business_hours: String(account?.business_hours || ''),
    })
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

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const cityAvailable = useMemo(() => {
    if (!form.city) return true
    return cities.some((item) => item.toLowerCase() === form.city.toLowerCase())
  }, [cities, form.city])

  const hasChanges = useMemo(() => {
    const baseline = {
      name: normalize(account?.name),
      city: normalize(account?.city),
      profile_image_url: normalize(account?.profile_image_url),
      about: normalize(account?.about),
      phone: normalize(account?.phone),
      whatsapp: normalize(account?.whatsapp),
      instagram: normalize(account?.instagram),
      address: normalize(account?.address),
      business_hours: normalize(account?.business_hours),
    }

    const keys = Object.keys(baseline)
    const changedText = keys.some((key) => normalize(form[key]) !== baseline[key])
    return changedText || !!imageFile
  }, [form, account, imageFile])

  const suggestedCities = useMemo(() => cities.slice(0, 12), [cities])

  const profileImage = imagePreview || form.profile_image_url

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePickImage(file) {
    if (!file) return

    if (!String(file.type || '').startsWith('image/')) {
      setError('Selecione um arquivo de imagem valido.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no maximo 5 MB.')
      return
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    handlePickImage(file)
    e.target.value = ''
  }

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview('')
    setImageFile(null)
    setForm((prev) => ({ ...prev, profile_image_url: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      let profileImageUrl = normalize(form.profile_image_url)

      if (imageFile) {
        const providerId = normalize(account?.id) || 'prestador'
        const fileName = `perfil-${providerId}-${Date.now()}.webp`
        const path = `produtos/${providerId}/${fileName}`
        profileImageUrl = await uploadImagem(imageFile, path, { isLogo: true })
      }

      await atualizarConta({
        name: normalize(form.name),
        city: normalize(form.city),
        profile_image_url: profileImageUrl,
        about: normalize(form.about),
        phone: normalize(form.phone),
        whatsapp: normalize(form.whatsapp),
        instagram: normalize(form.instagram),
        address: normalize(form.address),
        business_hours: normalize(form.business_hours),
      })

      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview('')
      setImageFile(null)
      setMessage('Perfil atualizado com sucesso.')
    } catch (err) {
      setError(err.message || 'Nao foi possivel salvar as configuracoes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="border border-stone-300 bg-linear-to-r from-stone-900 via-stone-800 to-amber-700 text-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Perfil publico</p>
        <h2 className="text-2xl font-semibold mt-1">Configuracoes do prestador</h2>
        <p className="text-sm text-stone-200 mt-2 max-w-2xl">
          Preencha os campos abaixo para que o cliente entenda quem voce atende, onde e como entrar em contato.
        </p>
      </section>

      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <form onSubmit={handleSubmit} className="border border-stone-200 bg-white p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Dados exibidos para clientes</h3>
              <p className="text-xs text-stone-500 mt-1">Mantenha estas informacoes atualizadas para aumentar a confianca e reduzir duvidas.</p>
            </div>

            {hasChanges ? (
              <span className="text-xs border border-amber-200 bg-amber-50 text-amber-700 px-2 py-1">Alteracoes pendentes</span>
            ) : (
              <span className="text-xs border border-green-200 bg-green-50 text-green-700 px-2 py-1">Tudo salvo</span>
            )}
          </div>

          <div className="border border-stone-200 bg-stone-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Foto ou logo</p>

            <div className="flex flex-wrap items-center gap-3">
              {profileImage ? (
                <img src={profileImage} alt="Preview" className="w-20 h-20 object-cover border border-stone-300" />
              ) : (
                <div className="w-20 h-20 border border-dashed border-stone-300 bg-white text-xs text-stone-400 flex items-center justify-center text-center p-2">
                  Sem imagem
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:border-stone-400"
                >
                  <FiCamera size={14} /> Enviar imagem
                </button>

                {profileImage && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:border-red-400"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-stone-500">Use JPG, PNG ou WebP. Tamanho maximo: 5 MB.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiUser size={13} /> Nome publico (obrigatorio)
              </span>
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                required
                placeholder="Ex.: Joao Silva - Eletricista"
                autoComplete="name"
                maxLength={80}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiMapPin size={13} /> Cidade (obrigatorio)
              </span>
              <input
                list="service-city-list"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Ex.: Vitoria"
                required
                autoComplete="address-level2"
              />
              <datalist id="service-city-list">
                {cities.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
          </div>

          {!cityAvailable && (
            <p className="text-xs text-amber-700 inline-flex items-center gap-1.5">
              <FiInfo size={12} /> Cidade fora da lista padrao. Confira se o nome esta correto.
            </p>
          )}

          <div className="space-y-1.5">
            <p className="text-xs text-stone-500">Sugestoes rapidas de cidade</p>
            <div className="flex flex-wrap gap-2">
              {suggestedCities.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateField('city', item)}
                  className={`border px-2.5 py-1 text-xs ${
                    item.toLowerCase() === String(form.city || '').toLowerCase()
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-300 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiPhone size={13} /> Telefone
              </span>
              <input
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Ex.: (28) 99999-9999"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiMessageCircle size={13} /> WhatsApp
              </span>
              <input
                value={form.whatsapp}
                onChange={(e) => updateField('whatsapp', e.target.value)}
                className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Ex.: 5528999999999"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
              />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiAtSign size={13} /> Instagram
              </span>
              <input
                value={form.instagram}
                onChange={(e) => updateField('instagram', e.target.value)}
                className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Ex.: @seuperfil"
                autoComplete="off"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiClock size={13} /> Horario de atendimento
              </span>
              <input
                list="business-hours-list"
                value={form.business_hours}
                onChange={(e) => updateField('business_hours', e.target.value)}
                className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Ex.: Seg a Sex, 08:00 as 18:00"
              />
              <datalist id="business-hours-list">
                {BUSINESS_HOURS_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
              <FiMapPin size={13} /> Endereco de atendimento
            </span>
            <input
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              placeholder="Ex.: Rua Exemplo, 123 - Centro"
              autoComplete="street-address"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
              <FiFileText size={13} /> Sobre voce
            </span>
            <textarea
              value={form.about}
              onChange={(e) => updateField('about', e.target.value)}
              rows={4}
              className="w-full border border-stone-300 px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-500"
              placeholder="Explique sua experiencia, especialidade, tempo de mercado e como funciona seu atendimento."
              maxLength={1200}
            />
          </label>

          {message && (
            <p className="text-sm text-green-700 inline-flex items-center gap-1.5">
              <FiCheckCircle size={14} /> {message}
            </p>
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            <FiSave size={14} />
            {saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </form>

        <aside className="border border-stone-200 bg-white p-4 space-y-3 xl:sticky xl:top-4">
          <h3 className="text-sm font-semibold text-stone-900">Preview publico</h3>

          <div className="border border-stone-200 bg-stone-50 p-3 space-y-2">
            <div className="flex items-start gap-3">
              {profileImage ? (
                <img src={profileImage} alt="Perfil" className="w-16 h-16 object-cover border border-stone-300" />
              ) : (
                <div className="w-16 h-16 border border-dashed border-stone-300 bg-white text-[11px] text-stone-400 flex items-center justify-center text-center px-1">
                  Sem foto
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-stone-900">{normalize(form.name) || 'Seu nome publico'}</p>
                <p className="text-xs text-stone-600 inline-flex items-center gap-1.5 mt-1">
                  <FiMapPin size={12} /> {normalize(form.city) || 'Cidade nao informada'}
                </p>
              </div>
            </div>

            {normalize(form.about) && (
              <p className="text-xs text-stone-600 leading-relaxed">{normalize(form.about)}</p>
            )}
          </div>

          <div className="border border-stone-200 p-3 space-y-2 text-xs text-stone-600">
            <p className="font-semibold text-stone-800">Contato exibido para clientes</p>
            <p>Telefone: {normalize(form.phone) || '-'}</p>
            <p>WhatsApp: {normalize(form.whatsapp) || '-'}</p>
            <p>Instagram: {normalize(form.instagram) || '-'}</p>
            <p>Endereco: {normalize(form.address) || '-'}</p>
            <p>Horario: {normalize(form.business_hours) || '-'}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
