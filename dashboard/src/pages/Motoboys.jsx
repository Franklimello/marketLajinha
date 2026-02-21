import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiUser, FiToggleLeft, FiToggleRight, FiEye, FiEyeOff } from 'react-icons/fi'

const EMPTY = { nome: '', email: '', senha: '' }

export default function Motoboys() {
  const [motoboys, setMotoboys] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [verSenha, setVerSenha] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const lista = await api.motoboys.listar()
      setMotoboys(lista)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirModal(m = null) {
    if (m) {
      setEditId(m.id)
      setForm({ nome: m.nome, email: m.email, senha: '' })
    } else {
      setEditId(null)
      setForm(EMPTY)
    }
    setErro('')
    setVerSenha(false)
    setModal(true)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome.trim() || !form.email.trim()) { setErro('Nome e email são obrigatórios.'); return }
    if (!editId && !form.senha) { setErro('Senha é obrigatória para novo motoboy.'); return }
    if (form.senha && form.senha.length < 4) { setErro('Senha mínima: 4 caracteres.'); return }

    setSalvando(true)
    try {
      const data = { nome: form.nome.trim(), email: form.email.trim() }
      if (form.senha) data.senha = form.senha
      if (editId) {
        await api.motoboys.atualizar(editId, data)
      } else {
        await api.motoboys.criar(data)
      }
      setModal(false)
      carregar()
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  async function handleExcluir(id, nome) {
    if (!confirm(`Excluir motoboy "${nome}"?`)) return
    try { await api.motoboys.excluir(id); carregar() } catch {}
  }

  async function toggleAtivo(m) {
    try {
      await api.motoboys.atualizar(m.id, { ativo: !m.ativo })
      carregar()
    } catch {}
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Motoboys</h1>
          <p className="text-sm text-stone-500 mt-0.5">{motoboys.length} cadastrado(s)</p>
        </div>
        <button onClick={() => abrirModal()} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
          <FiPlus size={16} /> Novo motoboy
        </button>
      </div>

      {motoboys.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <FiUser className="mx-auto text-stone-300 mb-3" size={48} />
          <p className="text-stone-500 text-sm">Nenhum motoboy cadastrado.</p>
          <p className="text-stone-400 text-xs mt-1">Crie um motoboy para ele acessar os pedidos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {motoboys.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${m.ativo ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>
                {m.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 text-sm truncate">{m.nome}</p>
                <p className="text-xs text-stone-500 truncate">{m.email}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {m.ativo ? 'Ativo' : 'Inativo'}
              </span>
              <div className="flex gap-1">
                <button onClick={() => toggleAtivo(m)} className="p-2 text-stone-400 hover:text-amber-600" title={m.ativo ? 'Desativar' : 'Ativar'}>
                  {m.ativo ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                </button>
                <button onClick={() => abrirModal(m)} className="p-2 text-stone-400 hover:text-blue-600"><FiEdit2 size={15} /></button>
                <button onClick={() => handleExcluir(m.id, m.nome)} className="p-2 text-stone-400 hover:text-red-600"><FiTrash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-900">{editId ? 'Editar motoboy' : 'Novo motoboy'}</h2>
              <button onClick={() => setModal(false)} className="p-1 text-stone-400 hover:text-stone-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none" placeholder="Nome do motoboy" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email (login)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {editId ? 'Nova senha (deixe vazio para manter)' : 'Senha'}
                </label>
                <div className="relative">
                  <input type={verSenha ? 'text' : 'password'} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className="w-full px-3 py-2.5 pr-10 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none" placeholder={editId ? '••••' : 'Mínimo 4 caracteres'} />
                  <button type="button" onClick={() => setVerSenha(!verSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                    {verSenha ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              <button type="submit" disabled={salvando} className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50">
                {salvando ? 'Salvando...' : editId ? 'Salvar alterações' : 'Criar motoboy'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
