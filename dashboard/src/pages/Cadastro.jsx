import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiShoppingBag, FiTool } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

export default function Cadastro() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [accountType, setAccountType] = useState('store')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const { cadastrar, registrarTipoConta } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await cadastrar(email, senha)
      await registrarTipoConta({ accountType })
      if (accountType === 'service') {
        navigate('/dashboard-service', { replace: true })
      } else {
        navigate('/cadastro-loja', { replace: true })
      }
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
    <div className="min-h-screen bg-stone-100 px-4 py-6 sm:py-10 flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <section className="relative overflow-hidden rounded-3xl border border-stone-300 bg-linear-to-br from-stone-900 via-stone-800 to-amber-700 text-white p-5 shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200">UAIFOOD Dashboard</p>
            <h1 className="text-2xl font-semibold mt-1">Criar conta</h1>
            <p className="text-sm text-stone-200 mt-2">
              Cadastre-se em menos de 1 minuto e escolha se vai abrir painel de loja ou de servicos.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiMail size={13} /> E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-stone-600">Tipo de conta</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('store')}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium inline-flex items-center justify-center gap-1.5 ${
                    accountType === 'store'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-300 text-stone-600 bg-white'
                  }`}
                >
                  <FiShoppingBag size={14} /> Loja
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('service')}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium inline-flex items-center justify-center gap-1.5 ${
                    accountType === 'service'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-300 text-stone-600 bg-white'
                  }`}
                >
                  <FiTool size={14} /> Servico
                </button>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-600 inline-flex items-center gap-1.5">
                <FiLock size={13} /> Senha (min. 6 caracteres)
              </span>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Crie uma senha segura"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 pr-11 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center text-stone-500 hover:text-stone-700"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </label>

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 text-white py-2.5 text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
            >
              {carregando ? 'Cadastrando...' : 'Cadastrar'} {!carregando && <FiArrowRight size={14} />}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-stone-500">
            Ja tem conta?{' '}
            <Link to="/login" className="text-amber-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
