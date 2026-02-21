import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Cadastro() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const { cadastrar } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await cadastrar(email, senha)
      navigate('/cadastro-loja')
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
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-6">Cadastrar</h1>
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
              Senha (mín. 6 caracteres)
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {carregando ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-amber-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
