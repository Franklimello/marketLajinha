import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import SEO from '../componentes/SEO'
import BAIRROS_DISPONIVEIS from '../data/bairros'
import { FiLogOut, FiPlus, FiEdit2, FiTrash2, FiStar, FiMapPin, FiSave, FiX, FiBell, FiTag, FiMessageCircle, FiChevronRight, FiUser, FiSettings, FiHome } from 'react-icons/fi'
import { canUseWebPush } from '../utils/pwaEnvironment'

const ESTADOS_SUPORTADOS = [
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'ES', nome: 'Espirito Santo' },
]

export default function PerfilPage() {
  const { logado, carregando: authCarregando, cliente, firebaseUser, logout, atualizarPerfil, perfilCompleto, cadastrarCliente, ativarPushPorClique, pushPermission } = useAuth()
  const navigate = useNavigate()
  const [enderecos, setEnderecos] = useState([])
  const [editEndereco, setEditEndereco] = useState(null)
  const [formEnd, setFormEnd] = useState({ apelido: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '', referencia: '', padrao: false })
  const [formPerfil, setFormPerfil] = useState({ nome: '', telefone: '' })
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [formCadastro, setFormCadastro] = useState({ nome: '', telefone: '' })
  const [cadastroInit, setCadastroInit] = useState(false)
  const [ativandoPush, setAtivandoPush] = useState(false)
  const [cidadesSugestoes, setCidadesSugestoes] = useState([])

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

  useEffect(() => {
    if (!formEnd.estado) {
      setCidadesSugestoes([])
      return
    }

    let cancelled = false
    api.cidades.listar(formEnd.estado)
      .then((lista) => {
        if (cancelled) return
        const nomes = Array.from(new Set((Array.isArray(lista) ? lista : []).map((c) => String(c?.nome || '').trim()).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        setCidadesSugestoes(nomes)
      })
      .catch(() => {
        if (!cancelled) setCidadesSugestoes([])
      })
    return () => {
      cancelled = true
    }
  }, [formEnd.estado])

  useEffect(() => {
    if (!editEndereco || !formEnd.cidade || formEnd.estado) return
    let cancelled = false

    Promise.allSettled([api.cidades.listar('MG'), api.cidades.listar('ES')]).then(([mg, es]) => {
      if (cancelled) return
      const nomeCidade = String(formEnd.cidade || '').trim()
      const emMg = (mg.status === 'fulfilled' ? mg.value : []).some((c) => c?.nome === nomeCidade)
      const emEs = (es.status === 'fulfilled' ? es.value : []).some((c) => c?.nome === nomeCidade)
      if (emMg) setFormEnd((prev) => ({ ...prev, estado: 'MG' }))
      else if (emEs) setFormEnd((prev) => ({ ...prev, estado: 'ES' }))
    }).catch(() => { })

    return () => {
      cancelled = true
    }
  }, [editEndereco, formEnd.cidade, formEnd.estado])

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
  function handleEndChange(e) {
    const { name, value } = e.target
    if (name === 'estado') {
      setFormEnd((p) => ({ ...p, estado: value, cidade: '' }))
      return
    }
    setFormEnd((p) => ({ ...p, [name]: value }))
  }

  function abrirNovoEndereco() {
    setFormEnd({ apelido: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '', referencia: '', padrao: enderecos.length === 0 })
    setEditEndereco('novo')
    setErro('')
  }

  function abrirEditarEndereco(end) {
    setFormEnd({ apelido: end.apelido, estado: '', cidade: end.cidade || '', bairro: end.bairro, rua: end.rua, numero: end.numero, complemento: end.complemento, referencia: end.referencia, padrao: end.padrao })
    setEditEndereco(end)
    setErro('')
  }

  async function salvarEndereco(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const payloadEndereco = { ...formEnd }
    delete payloadEndereco.estado
    try {
      if (editEndereco === 'novo') {
        await api.clientes.criarEndereco(payloadEndereco)
      } else {
        await api.clientes.atualizarEndereco(editEndereco.id, payloadEndereco)
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

  async function ativarPush() {
    setErro('')
    setSucesso('')
    setAtivandoPush(true)
    try {
      const result = await ativarPushPorClique()
      if (result.ok) {
        setSucesso('Notificações ativadas com sucesso!')
      } else if (result.reason === 'unsupported') {
        setErro('Para ativar notificações no iPhone, instale o app na Tela de Início e abra por lá.')
      } else {
        setErro('Não foi possível ativar as notificações agora.')
      }
    } finally {
      setAtivandoPush(false)
    }
  }

  const pushDisponivel = canUseWebPush({ requireStandalone: true })
  const enderecoAtivo = enderecos.find((e) => e.padrao) || enderecos[0] || null

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24 bg-stone-50 min-h-screen">
      <SEO title="Minha conta" noIndex />
      <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-violet-50 text-violet-700 inline-flex items-center justify-center">
            <FiMapPin />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-stone-400">Endereço atual</p>
            <p className="font-semibold text-stone-900 truncate">
              {enderecoAtivo
                ? `${enderecoAtivo.rua}, ${enderecoAtivo.numero}`
                : (cliente?.nome ? 'Defina seu endereço' : 'Minha conta')}
            </p>
            {(enderecoAtivo?.cidade || enderecoAtivo?.bairro) && (
              <p className="text-xs text-stone-500 truncate">
                {enderecoAtivo.cidade || ''}{enderecoAtivo.cidade && enderecoAtivo.bairro ? ' - ' : ''}{enderecoAtivo.bairro || ''}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={abrirNovoEndereco}
          className="text-sm font-semibold text-violet-700"
        >
          trocar
        </button>
      </div>

      {sucesso && <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3 mb-4">{sucesso}</p>}
      {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3 mb-4">{erro}</p>}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button type="button" className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <FiTag className="mx-auto text-violet-700 mb-1.5" />
          <p className="text-sm font-medium text-stone-800">cupons</p>
        </button>
        <button type="button" className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <FiMessageCircle className="mx-auto text-violet-700 mb-1.5" />
          <p className="text-sm font-medium text-stone-800">atendimento</p>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 mb-4 overflow-hidden">
        <button type="button" onClick={() => setEditandoPerfil(true)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50">
          <span className="flex items-center gap-2 text-stone-800"><FiUser className="text-violet-700" /> meus dados</span>
          <FiChevronRight className="text-stone-400" />
        </button>
        <button type="button" onClick={() => document.getElementById('sec-enderecos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="w-full px-4 py-3 flex items-center justify-between border-t border-stone-100 hover:bg-stone-50">
          <span className="flex items-center gap-2 text-stone-800"><FiHome className="text-violet-700" /> meus endereços</span>
          <FiChevronRight className="text-stone-400" />
        </button>
        <button type="button" onClick={() => document.getElementById('sec-config')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="w-full px-4 py-3 flex items-center justify-between border-t border-stone-100 hover:bg-stone-50">
          <span className="flex items-center gap-2 text-stone-800"><FiSettings className="text-violet-700" /> configurações</span>
          <FiChevronRight className="text-stone-400" />
        </button>
      </div>

      {/* Perfil */}
      <div id="sec-dados" className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
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
      <div id="sec-enderecos" className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-900">Meus endereços</h2>
          {editEndereco === null && (
            <button onClick={abrirNovoEndereco} className="flex items-center gap-1 text-sm text-violet-700 hover:text-violet-800 font-medium">
              <FiPlus /> Novo
            </button>
          )}
        </div>

        {editEndereco !== null ? (
          <form onSubmit={salvarEndereco} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">{editEndereco === 'novo' ? 'Novo endereço' : 'Editar endereço'}</h3>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Apelido (opcional)</label>
              <input name="apelido" value={formEnd.apelido} onChange={handleEndChange} placeholder="ex: Casa, Trabalho" className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Estado *</label>
              <select name="estado" value={formEnd.estado || ''} onChange={handleEndChange} required className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                <option value="">Selecione o estado</option>
                {ESTADOS_SUPORTADOS.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Cidade *</label>
              <select name="cidade" value={formEnd.cidade} onChange={handleEndChange} required disabled={!formEnd.estado} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white disabled:bg-stone-100">
                <option value="">{formEnd.estado ? 'Selecione a cidade' : 'Selecione o estado primeiro'}</option>
                {formEnd.cidade && !cidadesSugestoes.includes(formEnd.cidade) && (
                  <option value={formEnd.cidade}>{formEnd.cidade}</option>
                )}
                {cidadesSugestoes.map((nomeCidade) => (
                  <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>
                ))}
              </select>
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
            <div className="flex gap-2">
              <button type="submit" disabled={salvando} className="flex items-center gap-1 px-4 py-2 bg-violet-700 text-white text-sm rounded-lg hover:bg-violet-800 disabled:opacity-50"><FiSave /> Salvar</button>
              <button type="button" onClick={() => { setEditEndereco(null); setErro('') }} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancelar</button>
            </div>
          </form>
        ) : enderecos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
            <FiMapPin className="mx-auto text-2xl text-stone-300 mb-2" />
            <p className="text-sm text-stone-400">Nenhum endereço cadastrado</p>
            <button onClick={abrirNovoEndereco} className="mt-3 text-sm text-violet-700 font-medium hover:underline">Adicionar endereço</button>
          </div>
        ) : (
          <div className="space-y-2">
            {enderecos.map((end) => (
              <div key={end.id} className={`bg-white rounded-xl border p-3 ${end.padrao ? 'border-violet-300 bg-violet-50/40' : 'border-stone-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {end.padrao && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">Padrão</span>}
                      {end.apelido && <span className="text-xs font-semibold text-stone-700">{end.apelido}</span>}
                    </div>
                    <p className="text-sm text-stone-800 mt-1">{end.rua}, {end.numero}{end.complemento ? ` - ${end.complemento}` : ''}</p>
                    <p className="text-xs text-stone-400">
                      {end.cidade ? `${end.cidade} · ` : ''}{end.bairro}{end.referencia ? ` · ${end.referencia}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {!end.padrao && (
                      <button onClick={() => definirPadrao(end.id)} title="Definir como padrão" className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-violet-700 rounded-lg hover:bg-violet-50">
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

      {/* Notificações push */}
      <div id="sec-config" className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
              <FiBell /> Notificações
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Status: {pushPermission === 'granted' ? 'ativadas' : pushPermission === 'denied' ? 'bloqueadas' : 'não ativadas'}
            </p>
          </div>
          <button
            type="button"
            onClick={ativarPush}
            disabled={ativandoPush || pushPermission === 'granted'}
            className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {ativandoPush ? 'Ativando...' : pushPermission === 'granted' ? 'Ativo' : 'Ativar'}
          </button>
        </div>
        {!pushDisponivel && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2 mt-3">
            Abra o app instalado na Tela de Início (HTTPS) para habilitar push no iOS Safari.
          </p>
        )}
      </div>

      {/* Logout */}
      <button onClick={logout} className="flex items-center justify-center gap-2 w-full py-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 text-sm font-medium transition-colors">
        <FiLogOut /> Sair da conta
      </button>
    </div>
  )
}
