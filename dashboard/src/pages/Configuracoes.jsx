import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiUser, FiLock, FiLogOut, FiAlertTriangle } from 'react-icons/fi'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'

export default function Configuracoes() {
  const { user, loja, logout } = useAuth()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleAlterarSenha(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmaSenha) {
      setErro('As senhas não conferem.')
      return
    }

    setCarregando(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, senhaAtual)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, novaSenha)
      setSucesso('Senha alterada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmaSenha('')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErro('Senha atual incorreta.')
      } else {
        setErro(err.message)
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Configurações</h1>
        <p className="text-stone-500 text-sm mt-1">Gerencie sua conta</p>
      </div>

      {/* Info da conta */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <FiUser className="text-2xl text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-stone-900">{user?.displayName || user?.email}</p>
            <p className="text-sm text-stone-400">{user?.email}</p>
            {loja && <p className="text-xs text-stone-400 mt-0.5">Loja: {loja.nome}</p>}
          </div>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiLock className="text-stone-400" />
          <h2 className="font-semibold text-stone-900">Alterar senha</h2>
        </div>
        <form onSubmit={handleAlterarSenha} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{erro}</p>}
          {sucesso && <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3">{sucesso}</p>}
          <button
            type="submit"
            disabled={carregando}
            className="px-6 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm"
          >
            {carregando ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>

      {/* Sair */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-stone-900">Sair da conta</h2>
            <p className="text-sm text-stone-400">Encerrar sua sessão neste dispositivo</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium text-sm transition-colors"
          >
            <FiLogOut /> Sair
          </button>
        </div>
      </div>
    </div>
  )
}
