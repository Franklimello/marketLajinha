import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FcGoogle } from 'react-icons/fc'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoGoogle, setCarregandoGoogle] = useState(false)
  const { login, loginGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate('/pedidos')
    } catch (err) {
      setErro(err.code === 'auth/invalid-credential' ? 'E-mail ou senha incorretos.' : err.message)
    } finally {
      setCarregando(false)
    }
  }

  async function handleGoogleLogin() {
    setErro('')
    setCarregandoGoogle(true)
    try {
      const resultado = await loginGoogle()
      if (resultado?.redirect) return
      navigate('/pedidos')
    } catch (err) {
      setErro(err?.message || 'Não foi possível entrar com Google.')
    } finally {
      setCarregandoGoogle(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-6">Entrar</h1>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={carregandoGoogle || carregando}
          className="w-full mb-4 py-2.5 border border-stone-300 text-stone-700 font-medium rounded-lg hover:bg-stone-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FcGoogle className="text-lg" />
          {carregandoGoogle ? 'Entrando com Google...' : 'Entrar com Google'}
        </button>

        <div className="relative mb-4">
          <div className="h-px bg-stone-200" />
          <span className="absolute inset-x-0 -top-2 mx-auto w-fit bg-white px-2 text-xs text-stone-400">ou</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-amber-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
