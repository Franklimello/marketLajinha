import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import SEO from '../componentes/SEO'
import BAIRROS_DISPONIVEIS from '../data/bairros'
import { FiLogOut, FiPlus, FiEdit2, FiTrash2, FiStar, FiMapPin, FiSave, FiX, FiBell, FiTag, FiMessageCircle, FiChevronRight, FiUser, FiSettings, FiHome } from 'react-icons/fi'
import { canUseWebPush } from '../utils/pwaEnvironment'
import { getItem as getLocalItem, setItem as setLocalItem } from '../storage/localStorageService'
import { uploadArquivoChat } from '../config/firebase'

const ESTADOS_SUPORTADOS = [
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'ES', nome: 'Espirito Santo' },
]
const SELECTED_CITY_KEY = 'selectedCity'
const SUPORTE_WHATSAPP = '5533999394706'

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
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  const [formCadastro, setFormCadastro] = useState({ nome: '', telefone: '' })
  const [cadastroInit, setCadastroInit] = useState(false)
  const [ativandoPush, setAtivandoPush] = useState(false)
  const [cidadesSugestoes, setCidadesSugestoes] = useState([])
  const [lojasHome, setLojasHome] = useState([])
  const [cuponsAtivos, setCuponsAtivos] = useState([])
  const [carregandoCupons, setCarregandoCupons] = useState(false)
  const [cidadesComLojas, setCidadesComLojas] = useState([])
  const [cidadeSelecionada, setCidadeSelecionada] = useState(() => String(getLocalItem(SELECTED_CITY_KEY, '') || ''))
  const [carregandoCidades, setCarregandoCidades] = useState(false)

  const [modalCupons, setModalCupons] = useState(false)
  const [modalAtendimento, setModalAtendimento] = useState(false)
  const [modalDados, setModalDados] = useState(false)
  const [modalEnderecos, setModalEnderecos] = useState(false)
  const [modalConfig, setModalConfig] = useState(false)
  const [modalCidade, setModalCidade] = useState(false)

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
    if (!perfilCompleto) return
    setCarregandoCidades(true)
    api.lojas.home()
      .then((lista) => {
        const lojas = Array.isArray(lista) ? lista : []
        setLojasHome(lojas)
        const cidades = Array.from(
          new Set(
            lojas.map((l) => String(l?.cidade || '').trim()).filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, 'pt-BR'))
        setCidadesComLojas(cidades)
        if (!cidadeSelecionada && cidades.length > 0) {
          setCidadeSelecionada(cidades[0])
        }
      })
      .finally(() => setCarregandoCidades(false))
  }, [perfilCompleto])

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

  useEffect(() => {
    if (!modalCupons) return
    let cancelado = false
    setCarregandoCupons(true)
    api.cupons.listarAtivos()
      .then((lista) => {
        if (cancelado) return
        setCuponsAtivos(Array.isArray(lista) ? lista : [])
      })
      .catch(() => {
        if (cancelado) return
        setCuponsAtivos([])
      })
      .finally(() => {
        if (!cancelado) setCarregandoCupons(false)
      })

    return () => {
      cancelado = true
    }
  }, [modalCupons])

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

  async function alterarFotoPerfil(event) {
    const arquivo = event.target.files?.[0]
    event.target.value = ''
    if (!arquivo || !cliente?.id) return

    const tipo = String(arquivo.type || '').toLowerCase()
    if (!tipo.startsWith('image/')) {
      setErro('Selecione uma imagem válida para foto de perfil.')
      return
    }

    const limite = 5 * 1024 * 1024
    if (arquivo.size > limite) {
      setErro('A foto deve ter no máximo 5MB.')
      return
    }

    setErro('')
    setSucesso('')
    setEnviandoFoto(true)
    try {
      const extensao = (arquivo.name.split('.').pop() || 'jpg').toLowerCase()
      // Usa o mesmo padrão de caminho já utilizado no chat para evitar bloqueio por regra.
      const path = `chat/pedidos/${cliente.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extensao}`
      const fotoUrl = await uploadArquivoChat(arquivo, path)
      await atualizarPerfil({ foto_url: fotoUrl })
      setSucesso('Foto de perfil atualizada!')
      setTimeout(() => setSucesso(''), 2200)
    } catch (err) {
      const msg = String(err?.message || '')
      if (msg.includes('storage/unauthorized') || msg.includes('403')) {
        setErro('Sem permissão para enviar a foto agora. Tente novamente em instantes.')
      } else {
        setErro(msg || 'Não foi possível enviar a foto de perfil.')
      }
    } finally {
      setEnviandoFoto(false)
    }
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
  const cuponsDisponiveis = cuponsAtivos
  const avatarInicial = (cliente?.nome || '?').trim().charAt(0).toUpperCase() || '?'
  const cidadeAtual = cidadeSelecionada || enderecoAtivo?.cidade || 'Selecione uma cidade'
  const totalEnderecos = enderecos.length
  const statusPush = pushPermission === 'granted'
    ? 'ativadas'
    : pushPermission === 'denied'
      ? 'bloqueadas'
      : 'pendentes'

  function abrirModalDados() {
    setEditandoPerfil(false)
    setModalDados(true)
  }

  function abrirModalEnderecos() {
    setEditEndereco(null)
    setModalEnderecos(true)
  }

  function salvarCidadeSelecionada() {
    if (!cidadeSelecionada) return
    setLocalItem(SELECTED_CITY_KEY, cidadeSelecionada)
    setModalCidade(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="relative max-w-lg mx-auto px-4 pb-32 min-h-screen">
      <SEO title="Minha conta" noIndex />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/65 to-transparent" />
      <div className="pointer-events-none absolute -top-14 right-[-4.2rem] -z-10 h-52 w-52 rounded-full bg-red-200/35 blur-3xl" />

      <section className="mb-4 overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="relative px-4 pt-4 pb-5">
          <div className="pointer-events-none absolute -top-10 -right-12 h-32 w-32 rounded-full bg-red-100/70 blur-2xl" />
          <div className="relative flex items-start gap-3">
            {cliente?.foto_url ? (
              <img
                src={cliente.foto_url}
                alt="Foto de perfil"
                className="w-16 h-16 rounded-2xl object-cover border border-stone-200 bg-white shadow-sm"
              />
            ) : (
              <span className="w-16 h-16 rounded-2xl bg-linear-to-br from-red-500 to-red-700 text-white inline-flex items-center justify-center text-xl font-bold shadow-[0_14px_32px_-20px_rgba(185,28,28,0.9)]">
                {avatarInicial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Minha conta</p>
              <h1 className="mt-1 text-[1.35rem] leading-tight font-black text-stone-900 truncate">{cliente?.nome || 'Cliente UaiFood'}</h1>
              <p className="text-xs text-stone-500 truncate">{cliente?.email || 'Sem e-mail cadastrado'}</p>
            </div>
            <button
              type="button"
              onClick={abrirModalDados}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Editar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{totalEnderecos}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">enderecos</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="text-sm font-black text-stone-900 truncate">{cidadeAtual || '-'}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">cidade ativa</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="text-sm font-black text-stone-900">{statusPush}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">push</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3.5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-red-50 text-red-700 inline-flex items-center justify-center border border-red-100">
              <FiMapPin />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Endereco atual</p>
              <p className="font-semibold text-stone-900 truncate">
                {enderecoAtivo
                  ? `${enderecoAtivo.rua}, ${enderecoAtivo.numero}`
                  : (cliente?.nome ? 'Defina seu endereco' : 'Minha conta')}
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
            onClick={abrirModalEnderecos}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Trocar
          </button>
        </div>
      </div>

      {sucesso && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3 mb-4">{sucesso}</p>}
      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">{erro}</p>}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => setModalCupons(true)}
          className="rounded-2xl border border-stone-200 bg-white p-3.5 text-left shadow-[0_16px_34px_-34px_rgba(15,23,42,0.95)] transition hover:border-red-200 hover:bg-red-50/35"
        >
          <span className="mb-2 inline-flex w-10 h-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <FiTag />
          </span>
          <p className="text-sm font-semibold text-stone-900">Cupons</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Veja descontos ativos para sua cidade.</p>
        </button>
        <button
          type="button"
          onClick={() => setModalAtendimento(true)}
          className="rounded-2xl border border-stone-200 bg-white p-3.5 text-left shadow-[0_16px_34px_-34px_rgba(15,23,42,0.95)] transition hover:border-red-200 hover:bg-red-50/35"
        >
          <span className="mb-2 inline-flex w-10 h-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <FiMessageCircle />
          </span>
          <p className="text-sm font-semibold text-stone-900">Atendimento</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Fale rapido com o suporte via WhatsApp.</p>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 mb-4 overflow-hidden shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
        <button type="button" onClick={abrirModalDados} className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-stone-50">
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-700 inline-flex items-center justify-center"><FiUser /></span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-stone-900">Meus dados</span>
              <span className="block text-[11px] text-stone-500 truncate">Nome, telefone e foto de perfil</span>
            </span>
          </span>
          <FiChevronRight className="text-stone-400 shrink-0" />
        </button>
        <button type="button" onClick={abrirModalEnderecos} className="w-full px-4 py-3.5 flex items-center justify-between gap-3 border-t border-stone-100 hover:bg-stone-50">
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-700 inline-flex items-center justify-center"><FiHome /></span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-stone-900">Meus enderecos</span>
              <span className="block text-[11px] text-stone-500 truncate">Gerencie casa, trabalho e endereco padrao</span>
            </span>
          </span>
          <FiChevronRight className="text-stone-400 shrink-0" />
        </button>
        <button type="button" onClick={() => setModalConfig(true)} className="w-full px-4 py-3.5 flex items-center justify-between gap-3 border-t border-stone-100 hover:bg-stone-50">
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-700 inline-flex items-center justify-center"><FiSettings /></span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-stone-900">Configuracoes</span>
              <span className="block text-[11px] text-stone-500 truncate">Notificacoes e preferencias da conta</span>
            </span>
          </span>
          <FiChevronRight className="text-stone-400 shrink-0" />
        </button>
      </div>

      <div className="bg-linear-to-r from-amber-50 via-white to-red-50 rounded-2xl border border-amber-200/60 p-4 mb-4 shadow-[0_20px_40px_-34px_rgba(146,64,14,0.45)]">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-semibold text-stone-900">Cidade ativa</p>
          <button type="button" onClick={() => setModalCidade(true)} className="text-xs font-semibold text-red-700 hover:text-red-800">Trocar</button>
        </div>
        <p className="text-stone-700 text-sm">{cidadeAtual}</p>
      </div>

      <button
        onClick={logout}
        className="flex items-center justify-center gap-2 w-full py-3 text-red-700 bg-white border border-red-200 rounded-2xl hover:bg-red-50 text-sm font-semibold shadow-[0_14px_30px_-28px_rgba(185,28,28,0.95)] transition-colors"
      >
        <FiLogOut /> Sair da conta
      </button>
      {(modalCupons || modalAtendimento || modalDados || modalEnderecos || modalConfig || modalCidade) && (
        <div className="fixed inset-0 z-120 bg-stone-950/55 backdrop-blur-[2px] p-3 sm:p-4 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => {
            setModalCupons(false); setModalAtendimento(false); setModalDados(false); setModalEnderecos(false); setModalConfig(false); setModalCidade(false)
          }} />
          <div className="relative z-10 bg-white/95 border border-stone-200 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 shadow-[0_42px_90px_-50px_rgba(15,23,42,0.7)] backdrop-blur">
            {modalCupons && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-stone-900">Cupons disponíveis</h3>
                  <button onClick={() => setModalCupons(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"><FiX /></button>
                </div>
                {carregandoCupons ? (
                  <p className="text-sm text-stone-500">Carregando cupons ativos...</p>
                ) : cuponsDisponiveis.length === 0 ? (
                  <p className="text-sm text-stone-500">Nenhum cupom ativo no momento.</p>
                ) : (
                  <div className="space-y-2">
                    {cuponsDisponiveis.map((cupom) => (
                      <div key={cupom.id} className="border border-stone-200 rounded-xl p-3">
                        <p className="text-sm font-semibold text-stone-900">{cupom?.loja?.nome || 'Loja'}</p>
                        <p className="text-xs text-stone-500">{cupom?.loja?.cidade || '-'}</p>
                        <p className="mt-2 text-xs text-stone-600">Cupom</p>
                        <p className="font-bold text-red-700">{String(cupom.codigo || '').toUpperCase()}</p>
                        <p className="text-[11px] text-stone-500 mt-1">
                          {cupom.tipo_desconto === 'PERCENTAGE'
                            ? `${Number(cupom.valor_desconto || 0)}% de desconto`
                            : `R$ ${Number(cupom.valor_desconto || 0).toFixed(2).replace('.', ',')} de desconto`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {modalAtendimento && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-stone-900">Atendimento UaiFood</h3>
                  <button onClick={() => setModalAtendimento(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"><FiX /></button>
                </div>
                <p className="text-sm text-stone-600 mb-4">Fale com nosso atendimento no WhatsApp.</p>
                <a
                  href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Preciso de ajuda no UaiFood.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-red-700 text-white font-semibold hover:bg-red-800"
                >
                  <FiMessageCircle /> Abrir WhatsApp
                </a>
              </>
            )}

            {modalDados && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-stone-900">Meus dados</h3>
                  <button onClick={() => { setModalDados(false); setEditandoPerfil(false) }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"><FiX /></button>
                </div>
                {editandoPerfil ? (
                  <form onSubmit={salvarPerfil} className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 bg-stone-50">
                      {cliente?.foto_url ? (
                        <img
                          src={cliente.foto_url}
                          alt="Foto de perfil"
                          className="w-14 h-14 rounded-full object-cover border border-stone-200 bg-white"
                        />
                      ) : (
                        <span className="w-14 h-14 rounded-full bg-red-100 text-red-700 inline-flex items-center justify-center text-lg font-bold border border-red-200">
                          {(cliente?.nome || '?').trim().charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                      <div>
                        <label className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold cursor-pointer hover:bg-red-800 disabled:opacity-60">
                          {enviandoFoto ? 'Enviando foto...' : 'Trocar foto'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={enviandoFoto}
                            onChange={alterarFotoPerfil}
                          />
                        </label>
                        <p className="text-[11px] text-stone-500 mt-1">Formatos de imagem, até 5MB.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Nome</label>
                      <input value={formPerfil.nome} onChange={(e) => setFormPerfil((p) => ({ ...p, nome: e.target.value }))} required className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Telefone</label>
                      <input value={formPerfil.telefone} onChange={(e) => setFormPerfil((p) => ({ ...p, telefone: e.target.value }))} className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={salvando} className="flex items-center gap-1.5 px-4 py-2.5 bg-red-700 text-white text-sm rounded-xl hover:bg-red-800 disabled:opacity-50 shadow-[0_14px_30px_-24px_rgba(185,28,28,0.95)]"><FiSave /> Salvar</button>
                      <button type="button" onClick={() => setEditandoPerfil(false)} className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700">Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {cliente?.foto_url ? (
                        <img
                          src={cliente.foto_url}
                          alt="Foto de perfil"
                          className="w-14 h-14 rounded-full object-cover border border-stone-200 bg-white"
                        />
                      ) : (
                        <span className="w-14 h-14 rounded-full bg-red-100 text-red-700 inline-flex items-center justify-center text-lg font-bold border border-red-200">
                          {(cliente?.nome || '?').trim().charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                      <label className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-semibold cursor-pointer hover:bg-red-50 disabled:opacity-60">
                        {enviandoFoto ? 'Enviando foto...' : 'Adicionar foto'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={enviandoFoto}
                          onChange={alterarFotoPerfil}
                        />
                      </label>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">{cliente.nome}</p>
                      <p className="text-xs text-stone-400">{cliente.email}</p>
                      {cliente.telefone && <p className="text-xs text-stone-400">{cliente.telefone}</p>}
                    </div>
                    <button onClick={() => setEditandoPerfil(true)} className="text-red-700 text-sm font-medium">Editar</button>
                  </div>
                )}
              </>
            )}

            {modalEnderecos && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-stone-900">Meus endereços</h3>
                  <button onClick={() => { setModalEnderecos(false); setEditEndereco(null) }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"><FiX /></button>
                </div>
                {editEndereco !== null ? (
                  <form onSubmit={salvarEndereco} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Apelido (opcional)</label>
                      <input name="apelido" value={formEnd.apelido} onChange={handleEndChange} placeholder="ex: Casa, Trabalho" className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Estado *</label>
                      <select name="estado" value={formEnd.estado || ''} onChange={handleEndChange} required className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25">
                        <option value="">Selecione o estado</option>
                        {ESTADOS_SUPORTADOS.map((uf) => (
                          <option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Cidade *</label>
                      <select name="cidade" value={formEnd.cidade} onChange={handleEndChange} required disabled={!formEnd.estado} className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white disabled:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500/25">
                        <option value="">{formEnd.estado ? 'Selecione a cidade' : 'Selecione o estado primeiro'}</option>
                        {formEnd.cidade && !cidadesSugestoes.includes(formEnd.cidade) && <option value={formEnd.cidade}>{formEnd.cidade}</option>}
                        {cidadesSugestoes.map((nomeCidade) => (
                          <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Bairro *</label>
                      <select name="bairro" value={formEnd.bairro} onChange={handleEndChange} required className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25">
                        <option value="">Selecione o bairro</option>
                        {BAIRROS_DISPONIVEIS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Rua *</label>
                      <input name="rua" value={formEnd.rua} onChange={handleEndChange} required placeholder="Nome da rua" className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Número *</label>
                        <input name="numero" value={formEnd.numero} onChange={handleEndChange} required placeholder="Nº" className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Complemento</label>
                        <input name="complemento" value={formEnd.complemento} onChange={handleEndChange} placeholder="Apto, bloco..." className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Referência</label>
                      <input name="referencia" value={formEnd.referencia} onChange={handleEndChange} placeholder="Próximo ao..." className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={salvando} className="flex items-center gap-1.5 px-4 py-2.5 bg-red-700 text-white text-sm rounded-xl hover:bg-red-800 disabled:opacity-50 shadow-[0_14px_30px_-24px_rgba(185,28,28,0.95)]"><FiSave /> Salvar</button>
                      <button type="button" onClick={() => setEditEndereco(null)} className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700">Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <button onClick={abrirNovoEndereco} className="flex items-center gap-1 text-sm text-red-700 hover:text-red-800 font-medium">
                        <FiPlus /> Novo
                      </button>
                    </div>
                    {enderecos.length === 0 ? (
                      <div className="text-center py-6">
                        <FiMapPin className="mx-auto text-2xl text-stone-300 mb-2" />
                        <p className="text-sm text-stone-400">Nenhum endereço cadastrado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {enderecos.map((end) => (
                          <div key={end.id} className={`rounded-xl border p-3 ${end.padrao ? 'border-red-300 bg-red-50/40' : 'border-stone-200'}`}>
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
                                  <button onClick={() => definirPadrao(end.id)} title="Definir como padrão" className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-700 rounded-lg hover:bg-red-50">
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
                  </>
                )}
              </>
            )}

            {modalConfig && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-stone-900">Configurações</h3>
                  <button onClick={() => setModalConfig(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"><FiX /></button>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-stone-900 flex items-center gap-2">
                        <FiBell /> Notificações
                      </h4>
                      <p className="text-xs text-stone-500 mt-1">
                        Status: {pushPermission === 'granted' ? 'ativadas' : pushPermission === 'denied' ? 'bloqueadas' : 'não ativadas'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={ativarPush}
                      disabled={ativandoPush || pushPermission === 'granted'}
                      className="px-3.5 py-2.5 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_12px_24px_-20px_rgba(220,38,38,0.95)]"
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
              </>
            )}

            {modalCidade && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-stone-900">Mudar cidade</h3>
                  <button onClick={() => setModalCidade(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"><FiX /></button>
                </div>
                {carregandoCidades ? (
                  <p className="text-sm text-stone-500">Carregando cidades...</p>
                ) : (
                  <>
                    <select
                      value={cidadeSelecionada}
                      onChange={(e) => setCidadeSelecionada(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25"
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesComLojas.map((cidade) => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={salvarCidadeSelecionada}
                      disabled={!cidadeSelecionada}
                      className="w-full mt-3 px-4 py-2.5 rounded-xl bg-red-700 text-white font-semibold hover:bg-red-800 disabled:opacity-50"
                    >
                      Confirmar cidade
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
