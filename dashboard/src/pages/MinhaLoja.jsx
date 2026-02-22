import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadImagem } from '../config/firebase'
import { FiSave, FiExternalLink, FiUpload, FiX, FiCamera, FiClock, FiPower } from 'react-icons/fi'

export default function MinhaLoja() {
  const { loja, atualizarLoja } = useAuth()
  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [toggling, setToggling] = useState(false)
  const fileInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  useEffect(() => {
    if (loja) {
      setForm({
        nome: loja.nome || '',
        slug: loja.slug || '',
        categoria_negocio: loja.categoria_negocio || '',
        cidade: loja.cidade || '',
        endereco: loja.endereco || '',
        telefone: loja.telefone || '',
        horario_funcionamento: loja.horario_funcionamento || '',
        horario_abertura: loja.horario_abertura || '',
        horario_fechamento: loja.horario_fechamento || '',
        logo_url: loja.logo_url || '',
        banner_url: loja.banner_url || '',
        cor_primaria: loja.cor_primaria || '#f59e0b',
        taxa_entrega: loja.taxa_entrega ?? 0,
        pedido_minimo: loja.pedido_minimo ?? 0,
        tempo_entrega: loja.tempo_entrega || '',
        pix_tipo: loja.pix_tipo || '',
        pix_chave: loja.pix_chave || '',
        pix_nome_titular: loja.pix_nome_titular || '',
        pix_cidade: loja.pix_cidade || '',
        formas_pagamento: loja.formas_pagamento || 'PIX,CREDIT,DEBIT,CASH',
        aberta: loja.aberta ?? true,
        ativa: loja.ativa ?? true,
      })
      setLogoPreview(null)
      setLogoFile(null)
      setBannerPreview(null)
      setBannerFile(null)
    }
  }, [loja])

  if (!form) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando...</div>
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'taxa_entrega' || name === 'pedido_minimo') ? parseFloat(value) || 0 : value,
    }))
    if (name === 'nome') {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      setForm((prev) => ({ ...prev, slug }))
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Selecione um arquivo de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('Imagem deve ter no máximo 5 MB.'); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setErro('')
  }

  function handleBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Selecione um arquivo de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('Imagem deve ter no máximo 5 MB.'); return }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setErro('')
  }

  function removerNovoBanner() {
    setBannerFile(null)
    setBannerPreview(null)
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  function removerNovaLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const imagemExibida = logoPreview || form.logo_url
  const abertaAgora = loja?.aberta_agora ?? loja?.aberta
  const forcadoManual = loja?.forcar_status

  async function handleToggle(abrir) {
    setToggling(true)
    try {
      const atualizada = await api.lojas.toggle(loja.id, abrir)
      atualizarLoja(atualizada)
    } catch (err) {
      alert(err.message)
    } finally {
      setToggling(false)
    }
  }

  async function handleVoltarAutomatico() {
    setToggling(true)
    try {
      const atualizada = await api.lojas.voltarAutomatico(loja.id)
      atualizarLoja(atualizada)
    } catch (err) {
      alert(err.message)
    } finally {
      setToggling(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)
    try {
      let logo_url = form.logo_url
      if (logoFile) {
        const p = `lojas/${loja.id}/logo_${Date.now()}.webp`
        logo_url = await uploadImagem(logoFile, p, { isLogo: true })
      }
      let banner_url = form.banner_url
      if (bannerFile) {
        const p = `lojas/${loja.id}/banner_${Date.now()}.webp`
        banner_url = await uploadImagem(bannerFile, p)
      }
      const atualizada = await api.lojas.atualizar(loja.id, { ...form, logo_url, banner_url })
      atualizarLoja(atualizada)
      setLogoFile(null)
      setLogoPreview(null)
      setBannerFile(null)
      setBannerPreview(null)
      setSucesso('Loja atualizada com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Minha Loja</h1>
          <p className="text-stone-500 text-sm mt-1">Edite as informações da sua loja</p>
        </div>
        {loja.slug && (
          <a href={`/${loja.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700">
            <FiExternalLink /> Ver loja
          </a>
        )}
      </div>

      {/* Controle abrir/fechar */}
      <div className={`rounded-xl border-2 p-5 transition-colors ${abertaAgora ? 'bg-green-50 border-green-200' : 'bg-stone-50 border-stone-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${abertaAgora ? 'bg-green-500 animate-pulse' : 'bg-stone-400'}`} />
            <div>
              <p className="font-semibold text-stone-900 text-lg">
                {abertaAgora ? 'Loja aberta' : 'Loja fechada'}
              </p>
              {forcadoManual && (
                <p className="text-xs text-stone-400">Modo manual ativo</p>
              )}
              {!forcadoManual && loja.horario_abertura && loja.horario_fechamento && (
                <p className="text-xs text-stone-400">
                  Horário automático: {loja.horario_abertura} - {loja.horario_fechamento}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {abertaAgora ? (
              <button
                onClick={() => handleToggle(false)}
                disabled={toggling}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
              >
                <FiPower /> Fechar agora
              </button>
            ) : (
              <button
                onClick={() => handleToggle(true)}
                disabled={toggling}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
              >
                <FiPower /> Abrir agora
              </button>
            )}
          </div>
        </div>

        {forcadoManual && loja.horario_abertura && loja.horario_fechamento && (
          <button
            onClick={handleVoltarAutomatico}
            disabled={toggling}
            className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 hover:underline disabled:opacity-50"
          >
            <FiClock className="text-xs" /> Voltar ao horário automático ({loja.horario_abertura} - {loja.horario_fechamento})
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
        {imagemExibida ? (
          <img src={imagemExibida} alt="" className="w-16 h-16 rounded-xl object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: form.cor_primaria }}>
            {form.nome?.charAt(0) || '?'}
          </div>
        )}
        <div>
          <p className="font-bold text-stone-900 text-lg">{form.nome || 'Nome da loja'}</p>
          <p className="text-sm text-stone-400">{form.categoria_negocio} &middot; {form.cidade}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        <h2 className="font-semibold text-stone-900 border-b border-stone-200 pb-3">Informações básicas</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nome da loja *</label>
            <input name="nome" value={form.nome} onChange={handleChange} required className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Slug (URL) *</label>
            <input name="slug" value={form.slug} onChange={handleChange} required pattern="[a-z0-9-]+" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Categoria *</label>
            <input name="categoria_negocio" value={form.categoria_negocio} onChange={handleChange} required placeholder="ex: Alimentação" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Cidade *</label>
            <input name="cidade" value={form.cidade} onChange={handleChange} required className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
        </div>

        <h2 className="font-semibold text-stone-900 border-b border-stone-200 pb-3 pt-2">Contato e localização</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">Endereço</label>
            <input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Rua, número, bairro" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Telefone</label>
            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Descrição do horário</label>
            <input name="horario_funcionamento" value={form.horario_funcionamento} onChange={handleChange} placeholder="Seg-Sex 8h-18h" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Tempo de entrega</label>
            <input name="tempo_entrega" value={form.tempo_entrega} onChange={handleChange} placeholder="ex: 40 - 60 min" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Pedido mínimo (R$)</label>
            <input name="pedido_minimo" type="number" min="0" step="0.01" value={form.pedido_minimo} onChange={handleChange} placeholder="0 = sem mínimo" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
            <p className="text-[10px] text-stone-400 mt-1">Deixe 0 se não quiser valor mínimo. O cliente verá o valor no cardápio.</p>
          </div>
        </div>

        <h2 className="font-semibold text-stone-900 border-b border-stone-200 pb-3 pt-2">Horário de funcionamento automático</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Horário de abertura</label>
            <input
              name="horario_abertura"
              type="time"
              value={form.horario_abertura}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Horário de fechamento</label>
            <input
              name="horario_fechamento"
              type="time"
              value={form.horario_fechamento}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-stone-400">
          Defina os horários para abrir e fechar a loja automaticamente. Você ainda pode abrir ou fechar manualmente a qualquer momento usando o botão acima.
        </p>

        <h2 className="font-semibold text-stone-900 border-b border-stone-200 pb-3 pt-2">Formas de pagamento aceitas</h2>
        <p className="text-xs text-stone-400 mb-2">Selecione quais formas de pagamento sua loja aceita. Apenas as selecionadas aparecerão para o cliente.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: 'PIX', label: 'PIX', emoji: '📱' },
            { value: 'CREDIT', label: 'Crédito', emoji: '💳' },
            { value: 'DEBIT', label: 'Débito', emoji: '💳' },
            { value: 'CASH', label: 'Dinheiro', emoji: '💵' },
          ].map((opt) => {
            const selecionadas = (form.formas_pagamento || '').split(',').filter(Boolean)
            const ativo = selecionadas.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  ativo ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={() => {
                    const novas = ativo
                      ? selecionadas.filter((s) => s !== opt.value)
                      : [...selecionadas, opt.value]
                    setForm((f) => ({ ...f, formas_pagamento: novas.join(',') }))
                  }}
                  className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                />
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-sm font-medium text-stone-800">{opt.label}</span>
              </label>
            )
          })}
        </div>

        <h2 className="font-semibold text-stone-900 border-b border-stone-200 pb-3 pt-2">PIX — Pagamento online</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Tipo da chave PIX</label>
            <select
              name="pix_tipo"
              value={form.pix_tipo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm bg-white"
            >
              <option value="">Não configurado</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
              <option value="ALEATORIA">Chave aleatória</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Chave PIX</label>
            <input name="pix_chave" value={form.pix_chave} onChange={handleChange} placeholder="Digite sua chave PIX" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nome do titular</label>
            <input name="pix_nome_titular" value={form.pix_nome_titular} onChange={handleChange} placeholder="Nome que aparece no PIX" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Cidade (PIX)</label>
            <input name="pix_cidade" value={form.pix_cidade} onChange={handleChange} placeholder="Cidade do titular" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
        </div>
        <p className="text-xs text-stone-400">
          Configure seus dados PIX para permitir que clientes paguem online via QR Code dinâmico com o valor exato da compra.
        </p>

        <h2 className="font-semibold text-stone-900 border-b border-stone-200 pb-3 pt-2">Logo e aparência</h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Logo da loja</label>
          <div className="flex items-start gap-4">
            {imagemExibida ? (
              <div className="relative">
                <img src={imagemExibida} alt="Logo" className="w-24 h-24 rounded-xl object-cover border-2 border-stone-200" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition-colors shadow">
                  <FiCamera className="text-xs" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-amber-400 hover:bg-amber-50/50 transition-colors cursor-pointer">
                <FiUpload className="text-lg text-stone-400" />
                <span className="text-xs text-stone-400">Enviar</span>
              </button>
            )}
            <div className="flex-1 text-sm text-stone-500 pt-1">
              <p>JPG, PNG ou WebP (máx. 5 MB)</p>
              {logoFile && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Nova imagem</span>
                  <button type="button" onClick={removerNovaLogo} className="text-xs text-red-500 hover:underline">Cancelar</button>
                </div>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Banner da loja (foto de capa)</label>
          <p className="text-xs text-stone-400 mb-3">Imagem horizontal que aparece no topo da página da sua loja. Ideal: 800x300px.</p>
          {(bannerPreview || form.banner_url) ? (
            <div className="relative">
              <img src={bannerPreview || form.banner_url} alt="Banner" className="w-full h-36 object-cover rounded-xl border-2 border-stone-200" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button type="button" onClick={() => bannerInputRef.current?.click()} className="px-3 py-1.5 bg-white/90 backdrop-blur text-stone-700 text-xs font-medium rounded-lg hover:bg-white shadow transition-colors flex items-center gap-1">
                  <FiCamera className="text-[10px]" /> Trocar
                </button>
                {bannerFile && (
                  <button type="button" onClick={removerNovoBanner} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded-lg hover:bg-red-600 shadow transition-colors">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => bannerInputRef.current?.click()} className="w-full h-36 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50/50 transition-colors cursor-pointer">
              <FiUpload className="text-xl text-stone-400" />
              <span className="text-sm text-stone-400">Enviar imagem de capa</span>
            </button>
          )}
          <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Cor primária</label>
            <div className="flex items-center gap-2">
              <input name="cor_primaria" type="color" value={form.cor_primaria} onChange={handleChange} className="w-10 h-10 rounded cursor-pointer border-0" />
              <input name="cor_primaria" value={form.cor_primaria} onChange={handleChange} className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-mono" />
            </div>
          </div>
        </div>

        {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{erro}</p>}
        {sucesso && <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3">{sucesso}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          <FiSave />
          {carregando ? 'Enviando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
