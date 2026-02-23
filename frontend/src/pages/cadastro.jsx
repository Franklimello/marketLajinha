import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import SEO from '../componentes/SEO'
import { FiMail, FiLock, FiUser, FiPhone, FiChevronLeft } from 'react-icons/fi'

export default function CadastroPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const voltar = searchParams.get('voltar') || '/perfil'
  const { logado, perfilCompleto, cadastrarCliente } = useAuth()
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', confirmar: '' })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const destino = perfilCompleto ? voltar : '/perfil'

  if (logado) {
    navigate(destino, { replace: true })
    return null
  }

  function handleChange(e) { setForm((p) => ({ ...p, [e.target.name]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem.'); return }
    if (form.senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }

    setCarregando(true)
    try {
      await createUserWithEmailAndPassword(auth, form.email, form.senha)
      await cadastrarCliente(form.nome, form.telefone)
      navigate(destino, { replace: true })
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          await signInWithEmailAndPassword(auth, form.email, form.senha)
          navigate(destino, { replace: true })
        } catch {
          setErro('Este e-mail já tem uma conta. Faça login com sua senha.')
        }
      } else if (err.code === 'auth/weak-password') {
        setErro('Senha muito fraca.')
      } else {
        setErro(err.message || 'Erro ao criar conta.')
      }
    } finally {
      setCarregando(false)
    }
  }

  async function handleGoogle() {
    setErro('')
    setCarregando(true)
    try {
      await signInWithPopup(auth, googleProvider)
      navigate(destino, { replace: true })
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErro('Erro ao entrar com Google. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <SEO title="Criar conta" description="Crie sua conta no UaiFood e peça nos melhores estabelecimentos." noIndex />
      <Link to="/" className="flex items-center gap-1 text-stone-400 hover:text-stone-700 text-sm mb-6">
        <FiChevronLeft /> Voltar
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">Criar conta</h1>
      <p className="text-stone-400 text-sm mb-6">Cadastre-se para fazer pedidos e salvar seus endereços</p>

      <button onClick={handleGoogle} disabled={carregando} className="w-full flex items-center justify-center gap-3 py-3 border-2 border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700 disabled:opacity-50 mb-4">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400">ou crie com e-mail</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Nome completo *</label>
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Seu nome" className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">E-mail *</label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="seu@email.com" className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Telefone</label>
          <div className="relative">
            <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Senha *</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input name="senha" type="password" value={form.senha} onChange={handleChange} required placeholder="Mínimo 6 caracteres" className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Confirmar senha *</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input name="confirmar" type="password" value={form.confirmar} onChange={handleChange} required placeholder="Repita a senha" className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{erro}</p>}

        <button type="submit" disabled={carregando} className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm">
          {carregando ? 'Criando...' : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-stone-400 mt-6">
        Já tem conta? <Link to={`/login${voltar !== '/perfil' ? `?voltar=${encodeURIComponent(voltar)}` : ''}`} className="text-red-600 font-medium hover:underline">Entrar</Link>
      </p>
    </div>
  )
}
