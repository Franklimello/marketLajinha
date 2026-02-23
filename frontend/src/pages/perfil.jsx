import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import SEO from '../componentes/SEO'
import BAIRROS_DISPONIVEIS from '../data/bairros'
import { FiLogOut, FiPlus, FiEdit2, FiTrash2, FiStar, FiMapPin, FiChevronLeft, FiSave, FiX } from 'react-icons/fi'

export default function PerfilPage() {
  const { logado, carregando: authCarregando, cliente, firebaseUser, logout, atualizarPerfil, perfilCompleto, cadastrarCliente } = useAuth()
  const navigate = useNavigate()
  const [enderecos, setEnderecos] = useState([])
  const [editEndereco, setEditEndereco] = useState(null)
  const [formEnd, setFormEnd] = useState({ apelido: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '', referencia: '', padrao: false })
  const [formPerfil, setFormPerfil] = useState({ nome: '', telefone: '' })
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [formCadastro, setFormCadastro] = useState({ nome: '', telefone: '' })
  const [cadastroInit, setCadastroInit] = useState(false)

  useEffect(() => {
    if (!cadastroInit && firebaseUser && !cliente) {
      setFormCadastro({ nome: firebaseUser.displayName || '', telefone: firebaseUser.phoneNumber || '' })
      setCadastroInit(true)
    }
  }, [firebaseUser, cliente, cadastroInit])

  useEffect(() => {
    if (!authCarregando && !logado) navigate('/login', { replace: true })
  }, [authCarregando, logado])

  useEffect(() => {
    if (cliente) {
      setFormPerfil({ nome: cliente.nome || '', telefone: cliente.telefone || '' })
      setEnderecos(cliente.enderecos || [])
    }
  }, [cliente])

  async function carregarEnderecos() {
    try { setEnderecos(await api.clientes.enderecos()) } catch {}
  }

  if (authCarregando) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!logado) return null

  // Se logou mas não cadastrou perfil ainda
  if (!perfilCompleto) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-stone-900 mb-1">Complete seu cadastro</h1>
        <p className="text-stone-400 text-sm mb-6">Precisamos de algumas informações para continuar</p>
        <form onSubmit={async (e) => {
          e.preventDefault()
          try { await cadastrarCliente(formCadastro.nome, formCadastro.telefone) } catch (err) { setErro(err.message) }
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Nome *</label>
            <input value={formCadastro.nome} onChange={(e) => setFormCadastro((p) => ({ ...p, nome: e.target.value }))} required className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Telefone</label>
            <input value={formCadastro.telefone} onChange={(e) => setFormCadastro((p) => ({ ...p, telefone: e.target.value }))} placeholder="(XX) XXXXX-XXXX" className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
          </div>
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <button type="submit" className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 text-sm">Salvar</button>
        </form>
      </div>
    )
  }

  // Formulário de endereço
  function handleEndChange(e) { setFormEnd((p) => ({ ...p, [e.target.name]: e.target.value })) }

  function abrirNovoEndereco() {
    setFormEnd({ apelido: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '', referencia: '', padrao: enderecos.length === 0 })
    setEditEndereco('novo')
    setErro('')
  }

  function abrirEditarEndereco(end) {
    setFormEnd({ apelido: end.apelido, cidade: end.cidade || '', bairro: end.bairro, rua: end.rua, numero: end.numero, complemento: end.complemento, referencia: end.referencia, padrao: end.padrao })
    setEditEndereco(end)
    setErro('')
  }

  async function salvarEndereco(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      if (editEndereco === 'novo') {
        await api.clientes.criarEndereco(formEnd)
      } else {
        await api.clientes.atualizarEndereco(editEndereco.id, formEnd)
      }
      await carregarEnderecos()
      setEditEndereco(null)
      setSucesso('Endereço salvo!')
      setTimeout(() => setSucesso(''), 2000)
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  async function definirPadrao(id) {
    try { await api.clientes.definirPadrao(id); await carregarEnderecos() } catch {}
  }

  async function excluirEndereco(id) {
    if (!confirm('Excluir este endereço?')) return
    try { await api.clientes.excluirEndereco(id); await carregarEnderecos() } catch {}
  }

  async function salvarPerfil(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await atualizarPerfil(formPerfil)
      setEditandoPerfil(false)
      setSucesso('Perfil atualizado!')
      setTimeout(() => setSucesso(''), 2000)
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <SEO title="Minha conta" noIndex />
      <h1 className="text-xl font-bold text-stone-900 mb-4">Minha conta</h1>

      {sucesso && <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3 mb-4">{sucesso}</p>}

      {/* Perfil */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
        {editandoPerfil ? (
          <form onSubmit={salvarPerfil} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Nome</label>
              <input value={formPerfil.nome} onChange={(e) => setFormPerfil((p) => ({ ...p, nome: e.target.value }))} required className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Telefone</label>
              <input value={formPerfil.telefone} onChange={(e) => setFormPerfil((p) => ({ ...p, telefone: e.target.value }))} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={salvando} className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"><FiSave /> Salvar</button>
              <button type="button" onClick={() => setEditandoPerfil(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"><FiX /> Cancelar</button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-900">{cliente.nome}</p>
              <p className="text-xs text-stone-400">{cliente.email}</p>
              {cliente.telefone && <p className="text-xs text-stone-400">{cliente.telefone}</p>}
            </div>
            <button onClick={() => setEditandoPerfil(true)} className="text-red-600 hover:text-red-700 text-sm font-medium">Editar</button>
          </div>
        )}
      </div>

      {/* Endereços */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-900">Meus endereços</h2>
          {editEndereco === null && (
            <button onClick={abrirNovoEndereco} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium">
              <FiPlus /> Novo
            </button>
          )}
        </div>

        {editEndereco !== null ? (
          <form onSubmit={salvarEndereco} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">{editEndereco === 'novo' ? 'Novo endereço' : 'Editar endereço'}</h3>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Apelido (opcional)</label>
              <input name="apelido" value={formEnd.apelido} onChange={handleEndChange} placeholder="ex: Casa, Trabalho" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Cidade *</label>
              <input name="cidade" value={formEnd.cidade} onChange={handleEndChange} required placeholder="Ex: Ibatiba" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Bairro *</label>
              <select name="bairro" value={formEnd.bairro} onChange={handleEndChange} required className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                <option value="">Selecione o bairro</option>
                {BAIRROS_DISPONIVEIS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Rua *</label>
              <input name="rua" value={formEnd.rua} onChange={handleEndChange} required placeholder="Nome da rua" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Número *</label>
                <input name="numero" value={formEnd.numero} onChange={handleEndChange} required placeholder="Nº" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Complemento</label>
                <input name="complemento" value={formEnd.complemento} onChange={handleEndChange} placeholder="Apto, bloco..." className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Referência</label>
              <input name="referencia" value={formEnd.referencia} onChange={handleEndChange} placeholder="Próximo ao..." className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
            </div>
            {erro && <p className="text-sm text-red-500">{erro}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={salvando} className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"><FiSave /> Salvar</button>
              <button type="button" onClick={() => { setEditEndereco(null); setErro('') }} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancelar</button>
            </div>
          </form>
        ) : enderecos.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
            <FiMapPin className="mx-auto text-2xl text-stone-300 mb-2" />
            <p className="text-sm text-stone-400">Nenhum endereço cadastrado</p>
            <button onClick={abrirNovoEndereco} className="mt-3 text-sm text-red-600 font-medium hover:underline">Adicionar endereço</button>
          </div>
        ) : (
          <div className="space-y-2">
            {enderecos.map((end) => (
              <div key={end.id} className={`bg-white rounded-xl border p-3 ${end.padrao ? 'border-red-400 bg-red-50/30' : 'border-stone-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {end.padrao && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Padrão</span>}
                      {end.apelido && <span className="text-xs font-semibold text-stone-700">{end.apelido}</span>}
                    </div>
                    <p className="text-sm text-stone-800 mt-1">{end.rua}, {end.numero}{end.complemento ? ` - ${end.complemento}` : ''}</p>
                    <p className="text-xs text-stone-400">
                      {end.cidade ? `${end.cidade} · ` : ''}{end.bairro}{end.referencia ? ` · ${end.referencia}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {!end.padrao && (
                      <button onClick={() => definirPadrao(end.id)} title="Definir como padrão" className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <FiStar className="text-xs" />
                      </button>
                    )}
                    <button onClick={() => abrirEditarEndereco(end)} className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-50">
                      <FiEdit2 className="text-xs" />
                    </button>
                    <button onClick={() => excluirEndereco(end.id)} className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button onClick={logout} className="flex items-center justify-center gap-2 w-full py-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 text-sm font-medium transition-colors">
        <FiLogOut /> Sair da conta
      </button>
    </div>
  )
}
