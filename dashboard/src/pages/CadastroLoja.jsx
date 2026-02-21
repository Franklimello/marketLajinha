import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadImagem } from '../config/firebase'
import { FiUpload, FiX } from 'react-icons/fi'

export default function CadastroLoja() {
  const [etapa, setEtapa] = useState(1)
  const [form, setForm] = useState({
    email: '',
    senha: '',
    confirmarSenha: '',
    nome: '',
    slug: '',
    categoria_negocio: '',
    cidade: '',
    logo_url: '',
    taxa_entrega: 0,
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const { user, loja, cadastrar, atualizarLoja } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  if (user && loja) {
    navigate('/')
    return null
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'taxa_entrega' ? parseFloat(value) || 0 : value,
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
    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem (JPG, PNG, WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5 MB.')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setErro('')
  }

  function removerLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function avancar(e) {
    e.preventDefault()
    setErro('')

    if (!form.email || !form.senha) {
      setErro('Preencha e-mail e senha.')
      return
    }
    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (form.senha !== form.confirmarSenha) {
      setErro('As senhas não conferem.')
      return
    }
    setEtapa(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      if (!user) {
        await cadastrar(form.email, form.senha)
      }

      await new Promise((r) => setTimeout(r, 500))

      let logo_url = form.logo_url
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `lojas/${form.slug}/logo_${Date.now()}.${ext}`
        logo_url = await uploadImagem(logoFile, path)
      }

      const dadosLoja = {
        nome: form.nome,
        slug: form.slug,
        categoria_negocio: form.categoria_negocio,
        cidade: form.cidade,
        logo_url,
        taxa_entrega: form.taxa_entrega,
      }

      const lojaCriada = await api.lojas.criar(dadosLoja)
      atualizarLoja(lojaCriada)
      navigate('/')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está em uso. Faça login ou use outro.')
      } else {
        setErro(err.message)
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-2 ${etapa >= 1 ? 'text-amber-600' : 'text-stone-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etapa >= 1 ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-500'}`}>1</span>
            <span className="text-sm font-medium hidden sm:inline">Sua conta</span>
          </div>
          <div className={`w-12 h-0.5 ${etapa >= 2 ? 'bg-amber-600' : 'bg-stone-200'}`} />
          <div className={`flex items-center gap-2 ${etapa >= 2 ? 'text-amber-600' : 'text-stone-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etapa >= 2 ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-500'}`}>2</span>
            <span className="text-sm font-medium hidden sm:inline">Sua loja</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Etapa 1: Conta */}
          {etapa === 1 && (
            <>
              <h1 className="text-2xl font-bold text-stone-900 mb-2">Crie sua conta</h1>
              <p className="text-stone-500 text-sm mb-6">Primeiro, crie seu acesso ao painel</p>
              <form onSubmit={avancar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">E-mail *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Senha *</label>
                  <input
                    name="senha"
                    type="password"
                    value={form.senha}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Confirmar senha *</label>
                  <input
                    name="confirmarSenha"
                    type="password"
                    value={form.confirmarSenha}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {erro && <p className="text-sm text-red-500">{erro}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700"
                >
                  Continuar
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-stone-500">
                Já tem conta?{' '}
                <Link to="/login" className="text-amber-600 hover:underline">Entrar</Link>
              </p>
            </>
          )}

          {/* Etapa 2: Loja */}
          {etapa === 2 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-stone-900">Dados da loja</h1>
                <button onClick={() => setEtapa(1)} className="text-sm text-amber-600 hover:underline">
                  Voltar
                </button>
              </div>
              <p className="text-stone-500 text-sm mb-6">Preencha as informações da sua loja</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nome da loja *</label>
                  <input
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Slug (URL) *</label>
                  <input
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    required
                    pattern="[a-z0-9-]+"
                    placeholder="ex: minha-loja"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-stone-500 mt-1">Apenas letras minúsculas, números e hífens</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Categoria *</label>
                  <input
                    name="categoria_negocio"
                    value={form.categoria_negocio}
                    onChange={handleChange}
                    required
                    placeholder="ex: Alimentação"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Cidade *</label>
                  <input
                    name="cidade"
                    value={form.cidade}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Upload de logo */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Logo da loja</label>
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img src={logoPreview} alt="Preview" className="w-28 h-28 rounded-xl object-cover border-2 border-stone-200" />
                      <button
                        type="button"
                        onClick={removerLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <FiX className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-stone-300 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-amber-400 hover:bg-amber-50/50 transition-colors cursor-pointer"
                    >
                      <FiUpload className="text-2xl text-stone-400" />
                      <span className="text-sm text-stone-500">Clique para enviar a logo</span>
                      <span className="text-xs text-stone-400">JPG, PNG ou WebP (máx. 5 MB)</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Taxa de entrega (R$)</label>
                  <input
                    name="taxa_entrega"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.taxa_entrega}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {erro && <p className="text-sm text-red-500">{erro}</p>}
                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {carregando ? 'Criando sua loja...' : 'Criar loja'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
