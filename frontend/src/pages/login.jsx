import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import SEO from '../componentes/SEO'
import { FiMail, FiLock, FiChevronLeft } from 'react-icons/fi'
import { Motorcycle } from '@phosphor-icons/react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const voltar = searchParams.get('voltar') || '/perfil'
  const { logado, perfilCompleto } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const destino = perfilCompleto ? voltar : '/perfil'

  if (logado) {
    navigate(destino, { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await signInWithEmailAndPassword(auth, email, senha)
      navigate(destino, { replace: true })
    } catch (err) {
      if (err.code === 'auth/invalid-credential') setErro('E-mail ou senha incorretos.')
      else if (err.code === 'auth/user-not-found') setErro('Conta não encontrada. Crie sua conta primeiro.')
      else setErro('Erro ao fazer login. Tente novamente.')
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
      <SEO title="Entrar" description="Faça login no UaiFood para acompanhar seus pedidos." noIndex />
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-1 text-stone-400 hover:text-stone-700 text-sm">
          <FiChevronLeft /> Voltar
        </Link>
        <a
          href="https://uaifooddelivery.vercel.app/motoboy/login"
          aria-label="Ir para login de motoboy"
          title="Sou motoboy"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-stone-200 text-stone-500 hover:text-red-600 hover:border-red-300 transition-colors"
        >
          <Motorcycle size={18} weight="duotone" />
        </a>
      </div>

      <h1 className="text-2xl font-bold text-stone-900 mb-1">Entrar</h1>
      <p className="text-stone-400 text-sm mb-6">Faça login para fazer pedidos</p>

      <button onClick={handleGoogle} disabled={carregando} className="w-full flex items-center justify-center gap-3 py-3 border-2 border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700 disabled:opacity-50 mb-4">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Entrar com Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400">ou</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">E-mail</label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Senha</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder="••••••" className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{erro}</p>}

        <button type="submit" disabled={carregando} className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-stone-400 mt-6">
        Não tem conta? <Link to={`/cadastro${voltar !== '/perfil' ? `?voltar=${encodeURIComponent(voltar)}` : ''}`} className="text-red-600 font-medium hover:underline">Criar conta</Link>
      </p>
    </div>
  )
}
