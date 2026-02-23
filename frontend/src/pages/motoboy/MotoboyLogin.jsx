import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiTruck, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function MotoboyLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    if (!email.trim() || !senha) { setErro('Preencha email e senha.'); return }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/motoboys/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao fazer login')

      localStorage.setItem('motoboy_token', data.token)
      localStorage.setItem('motoboy_data', JSON.stringify(data.motoboy))
      navigate('/motoboy/pedidos')
    } catch (err) {
      setErro(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiTruck className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Área do Motoboy</h1>
          <p className="text-sm text-stone-500 mt-1">Faça login para acessar os pedidos</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500/40 focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Senha</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                type={verSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-10 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500/40 focus:border-red-500 outline-none"
              />
              <button type="button" onClick={() => setVerSenha(!verSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                {verSenha ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
