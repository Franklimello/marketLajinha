import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadArquivoChat } from '../config/firebase'
import SEO from '../componentes/SEO'
import { FiClock, FiCheck, FiTruck, FiX, FiPackage, FiStar, FiMessageCircle, FiSend, FiPaperclip, FiFileText, FiLock } from 'react-icons/fi'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_STEPS = [
  { key: 'APPROVED', label: 'Confirmado', icon: FiPackage },
  { key: 'IN_ROUTE', label: 'Saiu p/ entrega', icon: FiTruck },
  { key: 'DELIVERED', label: 'Entregue', icon: FiCheck },
]
const ACTIVE_STATUS = ['PENDING', 'APPROVED', 'IN_ROUTE']

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-amber-50 text-amber-700 border border-amber-200', icon: FiClock },
  APPROVED: { label: 'Confirmado', cor: 'bg-sky-50 text-sky-700 border border-sky-200', icon: FiPackage },
  IN_ROUTE: { label: 'Saiu p/ entrega', cor: 'bg-orange-50 text-orange-700 border border-orange-200', icon: FiTruck },
  DELIVERED: { label: 'Entregue', cor: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: FiCheck },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-50 text-red-700 border border-red-200', icon: FiX },
}

function formatCurrency(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function formatDateTime(value) {
  const data = new Date(value)
  return `${data.toLocaleDateString('pt-BR')} as ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function getPedidoCodigo(id) {
  const base = String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (!base) return '#PEDIDO'
  return `#${base.slice(-6)}`
}

function StatusTracker({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
        <FiX className="text-red-500" />
        <span className="text-sm font-semibold text-red-700">Pedido cancelado</span>
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status)

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 flex items-center">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const passed = i < currentIdx
        const Icon = step.icon
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center min-w-[68px]">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-red-500 text-white scale-105 shadow-[0_12px_22px_-16px_rgba(239,68,68,0.9)]' : 'bg-white text-stone-400 border border-stone-200'
              } ${i === currentIdx ? 'ring-2 ring-red-200 ring-offset-2 ring-offset-stone-50' : ''}`}>
                <Icon size={14} />
              </div>
              <span className={`mt-1 text-[10px] text-center leading-tight ${
                done ? 'text-stone-800 font-semibold' : 'text-stone-400'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-1 flex-1 rounded-full mx-1.5 ${passed ? 'bg-red-400' : 'bg-stone-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AvaliacaoInline({ pedidoId }) {
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar() {
    if (nota === 0) return
    setEnviando(true)
    setErro('')
    try {
      await api.avaliacoes.criar({ pedido_id: pedidoId, nota, comentario })
      setEnviado(true)
    } catch (e) {
      if (e.message.includes('já avaliou')) setEnviado(true)
      else setErro(e.message)
    } finally { setEnviando(false) }
  }

  if (enviado) return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-2">
      <FiCheck /> Avaliação enviada!
    </div>
  )

  return (
    <div className="mt-3 pt-3 border-t border-stone-100">
      <p className="text-xs font-semibold text-stone-600 mb-2">Avalie este pedido:</p>
      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-amber-50 border border-amber-100 px-2 py-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setNota(n)} className="p-0.5 transition-transform hover:scale-105">
              <FiStar className={`text-lg ${n <= nota ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`} />
            </button>
          ))}
        </div>
        {nota > 0 && (
          <button onClick={enviar} disabled={enviando} className="text-xs font-semibold text-red-700 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50">
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        )}
      </div>
      {nota > 0 && (
        <input
          type="text"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentário (opcional)"
          className="w-full mt-2 px-3 py-2 border border-stone-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/25"
        />
      )}
      {erro && <p className="text-[10px] text-red-500 mt-1">{erro}</p>}
    </div>
  )
}

function ChatPedido({ pedidoId, socketRef }) {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [naoLidas, setNaoLidas] = useState(0)
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!aberto) return
    api.chat.mensagens(pedidoId).then((msgs) => {
      setMensagens(msgs)
      setNaoLidas(0)
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50)
    }).catch(() => {})
  }, [aberto, pedidoId])

  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return
    function onMsg(msg) {
      if (msg.pedido_id !== pedidoId) return
      setMensagens((prev) => [...prev, msg])
      if (!aberto) setNaoLidas((n) => n + 1)
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50)
    }
    socket.on('chat:nova_mensagem', onMsg)
    return () => socket.off('chat:nova_mensagem', onMsg)
  }, [pedidoId, aberto, socketRef])

  function handleSelecionarArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const mime = String(file.type || '').toLowerCase()
    const isImagem = mime.startsWith('image/')
    const isPdf = mime === 'application/pdf'
    if (!isImagem && !isPdf) {
      alert('Formato inválido. Envie imagem ou PDF.')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo deve ter no máximo 5 MB.')
      e.target.value = ''
      return
    }
    setArquivo(file)
  }

  function limparArquivo() {
    setArquivo(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function enviar(e) {
    e.preventDefault()
    if ((!texto.trim() && !arquivo) || enviando) return
    setEnviando(true)
    try {
      let payload = { conteudo: texto.trim() }
      if (arquivo) {
        const ext = (arquivo.name.split('.').pop() || 'bin').toLowerCase()
        const path = `chat/pedidos/${pedidoId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const url = await uploadArquivoChat(arquivo, path)
        payload = {
          conteudo: texto.trim(),
          arquivo_url: url,
          arquivo_nome: arquivo.name,
          arquivo_mime: arquivo.type,
        }
      }

      const msg = await api.chat.enviar(pedidoId, payload)
      setMensagens((prev) => [...prev, msg])
      setTexto('')
      limparArquivo()
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50)
    } catch (err) {
      alert(err?.message || 'Não foi possível enviar o anexo agora.')
    }
    finally { setEnviando(false) }
  }

  return (
    <div className="mt-3 pt-3 border-t border-stone-100">
      <button
        onClick={() => { setAberto(!aberto); if (!aberto) setNaoLidas(0) }}
        className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors rounded-lg px-2.5 py-1.5 ${
          aberto ? 'text-red-700 bg-red-50 border border-red-100' : 'text-stone-600 hover:text-red-600'
        }`}
      >
        <FiMessageCircle size={13} />
        <span>Falar com a loja</span>
        {naoLidas > 0 && (
          <span className="min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="mt-2 border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.95)]">
          <div ref={scrollRef} className="max-h-52 overflow-y-auto p-3 space-y-2 bg-linear-to-b from-stone-50 to-white">
            {mensagens.length === 0 && (
              <p className="text-[11px] text-stone-400 text-center py-3">Nenhuma mensagem ainda. Envie uma duvida!</p>
            )}
            {mensagens.map((m) => (
              <div key={m.id} className={`flex ${m.remetente === 'CLIENTE' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs shadow-[0_10px_24px_-22px_rgba(15,23,42,0.9)] ${
                  m.remetente === 'CLIENTE'
                    ? 'bg-red-500 text-white rounded-br-md'
                    : 'bg-white text-stone-800 border border-stone-200 rounded-bl-md'
                }`}>
                  {!!m.conteudo && <p>{m.conteudo}</p>}
                  {!!m.arquivo_url && (
                    <div className={m.conteudo ? 'mt-1.5' : ''}>
                      {(m.arquivo_mime || '').startsWith('image/') ? (
                        <a href={m.arquivo_url} target="_blank" rel="noopener noreferrer">
                          <img src={m.arquivo_url} alt={m.arquivo_nome || 'Comprovante'} className="w-40 rounded-xl border border-white/30" />
                        </a>
                      ) : (
                        <a
                          href={m.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                            m.remetente === 'CLIENTE'
                              ? 'bg-white/20 border-white/25 text-white hover:bg-white/30'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <FiFileText size={12} />
                          <span className="truncate max-w-[130px]">{m.arquivo_nome || 'Arquivo'}</span>
                        </a>
                      )}
                    </div>
                  )}
                  <p className={`text-[9px] mt-1 ${m.remetente === 'CLIENTE' ? 'text-red-100' : 'text-stone-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {arquivo && (
            <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
              <p className="text-[11px] text-amber-800 truncate max-w-[75%]">Anexo: {arquivo.name}</p>
              <button type="button" onClick={limparArquivo} className="text-[11px] font-semibold text-red-600 hover:text-red-700">Remover</button>
            </div>
          )}
          <form onSubmit={enviar} className="flex items-center gap-1.5 px-2 py-1.5 border-t border-stone-200 bg-white">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleSelecionarArquivo}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              aria-label="Anexar arquivo"
            >
              <FiPaperclip size={14} />
            </button>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-w-0 flex-1 px-2 py-2 text-xs border-0 focus:ring-0 outline-none bg-transparent"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={enviando || (!texto.trim() && !arquivo)}
              className="w-9 h-9 shrink-0 rounded-xl bg-red-600 text-white inline-flex items-center justify-center hover:bg-red-700 disabled:bg-stone-300 disabled:text-white shadow-[0_12px_24px_-20px_rgba(220,38,38,0.95)]"
              aria-label="Enviar mensagem"
            >
              <FiSend size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function PedidosPage() {
  const { logado, carregando: authCarregando, cliente, firebaseUser, setPedidosAtivos } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const socketRef = useRef(null)

  const atualizarBadge = useCallback((lista) => {
    const ativos = (lista || []).filter((p) => ACTIVE_STATUS.includes(p.status))
    setPedidosAtivos(ativos.length)
  }, [setPedidosAtivos])

  const carregar = useCallback(async () => {
    if (authCarregando) return
    if (!logado) { setCarregando(false); return }
    try {
      const lista = await api.pedidos.meus()
      setPedidos(lista)
      atualizarBadge(lista)
    } catch { /* ignore */ }
    finally { setCarregando(false) }
  }, [logado, authCarregando, atualizarBadge])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (authCarregando || !logado) return undefined
    const timer = setInterval(() => { carregar() }, 15000)
    return () => clearInterval(timer)
  }, [authCarregando, logado, carregar])

  useEffect(() => {
    if (!cliente?.id) return

    let fechado = false
    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
    socketRef.current = socket

    async function conectarSocket() {
      const token = await firebaseUser?.getIdToken?.().catch(() => null)
      if (fechado) return
      socket.auth = token ? { token } : {}
      socket.connect()
    }
    conectarSocket()

    socket.io.on('reconnect_attempt', () => {
      firebaseUser?.getIdToken?.().then((token) => {
        socket.auth = token ? { token } : {}
      }).catch(() => {
        socket.auth = {}
      })
    })

    socket.on('connect', () => {
      socket.emit('join:cliente', { clienteId: cliente.id })
    })

    socket.on('pedido:atualizado', (pedidoAtualizado) => {
      setPedidos((prev) => {
        const nova = prev.map((p) => p.id === pedidoAtualizado.id ? { ...pedidoAtualizado, loja: p.loja } : p)
        atualizarBadge(nova)
        return nova
      })
    })

    return () => {
      fechado = true
      socket.disconnect()
    }
  }, [cliente?.id, firebaseUser, atualizarBadge])

  const ativosCount = pedidos.filter((p) => ACTIVE_STATUS.includes(p.status)).length
  const entreguesCount = pedidos.filter((p) => p.status === 'DELIVERED').length
  const canceladosCount = pedidos.filter((p) => p.status === 'CANCELLED').length

  if (authCarregando || carregando) {
    return (
      <div className="relative max-w-lg mx-auto px-4 pt-4 pb-32 min-h-screen overflow-x-hidden">
        <SEO title="Meus pedidos" noIndex />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/70 to-transparent" />
        <div className="pointer-events-none absolute -top-14 right-[-4.2rem] -z-10 h-52 w-52 rounded-full bg-red-200/35 blur-3xl" />
        <div className="rounded-3xl border border-stone-200 bg-white/92 backdrop-blur px-4 py-4 mb-4 shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)]">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-stone-400">Pedidos</p>
          <h1 className="mt-1 text-[1.35rem] leading-tight font-black text-stone-900">Acompanhando seus pedidos</h1>
          <div className="mt-3 flex items-center gap-2 text-stone-600">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-stone-300 border-t-red-500 animate-spin" />
            <p className="text-sm font-medium">Buscando atualizacoes...</p>
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
            <div className="flex justify-between">
              <div className="skeleton h-5 rounded w-1/3" />
              <div className="skeleton h-5 rounded-full w-20" />
            </div>
            <div className="skeleton h-3 rounded w-2/3" />
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="skeleton h-16 rounded-2xl w-full" />
            <div className="flex justify-between gap-2">
              <div className="skeleton h-4 rounded w-1/3" />
              <div className="skeleton h-4 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!logado) {
    return (
      <div className="relative max-w-lg mx-auto px-4 pt-10 pb-32 min-h-screen overflow-x-hidden">
        <SEO title="Meus pedidos" noIndex />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/70 to-transparent" />
        <div className="bg-white rounded-3xl border border-stone-200 px-5 py-8 text-center shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)]">
          <span className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-red-600 inline-flex items-center justify-center">
            <FiLock size={24} />
          </span>
          <h2 className="text-lg font-black text-stone-900 mb-1">Seus pedidos ficam aqui</h2>
          <p className="text-stone-500 text-sm mb-5">Entre na conta para acompanhar pedidos em tempo real.</p>
          <Link to="/login" className="inline-flex items-center justify-center px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 text-sm transition-colors shadow-[0_14px_30px_-24px_rgba(220,38,38,0.95)]">Entrar na conta</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative max-w-lg mx-auto px-4 pb-32 min-h-screen overflow-x-hidden">
      <SEO title="Meus pedidos" noIndex />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-red-100/75 via-orange-50/70 to-transparent" />
      <div className="pointer-events-none absolute -top-14 right-[-4.2rem] -z-10 h-52 w-52 rounded-full bg-red-200/35 blur-3xl" />

      <section className="mb-4 overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="relative px-4 pt-4 pb-5">
          <div className="pointer-events-none absolute -top-10 -right-12 h-32 w-32 rounded-full bg-red-100/70 blur-2xl" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Painel de pedidos</p>
            <h1 className="mt-1 text-[1.35rem] leading-tight font-black text-stone-900">Meus pedidos</h1>
            <p className="mt-1 text-xs text-stone-500">Acompanhe status, mensagens e entregas em tempo real.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{pedidos.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">total</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{ativosCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">em andamento</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 px-2.5 py-2.5 text-center">
              <p className="font-numeric text-base font-black text-stone-900">{entreguesCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">entregues</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-stone-500">Cancelados: <span className="font-semibold text-stone-700">{canceladosCount}</span></p>
        </div>
      </section>

      {pedidos.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 px-5 py-10 text-center shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)]">
          <span className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-red-600 inline-flex items-center justify-center">
            <FiPackage size={24} />
          </span>
          <h2 className="text-base font-black text-stone-900 mb-1">Nenhum pedido ainda</h2>
          <p className="text-stone-500 text-sm mb-5">Explore as lojas e faca seu primeiro pedido.</p>
          <Link to="/" className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 text-sm transition-colors shadow-[0_14px_30px_-24px_rgba(220,38,38,0.95)]">Explorar lojas</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING
            const Icon = st.icon
            return (
              <article key={p.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.65)]">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {p.loja?.logo_url ? (
                      <img src={p.loja.logo_url} alt="" loading="lazy" className="w-11 h-11 rounded-xl object-cover border border-stone-200" />
                    ) : (
                      <span className="w-11 h-11 rounded-xl border border-stone-200 bg-stone-50 text-stone-400 inline-flex items-center justify-center">
                        <FiPackage size={16} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{p.loja?.nome || 'Loja'}</p>
                      <p className="text-[11px] text-stone-500 truncate">{formatDateTime(p.created_at)}</p>
                      <p className="text-[10px] font-semibold tracking-wide uppercase text-stone-400 mt-1">Pedido {getPedidoCodigo(p.id)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cor}`}>
                      <Icon size={12} /> {st.label}
                    </span>
                    <p className="text-sm font-black text-red-700 mt-1">{formatCurrency(p.total)}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <StatusTracker status={p.status} />
                </div>

                <div className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2.5">
                  <div className="space-y-1">
                    {p.itens?.length ? p.itens.map((i) => (
                      <p key={i.id} className="text-xs text-stone-700">
                        <span className="font-semibold">{i.quantidade}x</span> {i.produto?.nome || 'Produto'}
                        {i.variacao_nome && ` (${i.variacao_nome})`}
                      </p>
                    )) : (
                      <p className="text-xs text-stone-500">Sem itens detalhados.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-stone-200/70">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white border border-stone-200 text-stone-600 font-medium">{p.forma_pagamento || 'Pagamento'}</span>
                    {p.tipo_entrega === 'RETIRADA' && <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-full font-semibold">Retirada</span>}
                    {p.agendado_para && <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-full font-semibold">Agendado</span>}
                  </div>
                </div>

                {p.status === 'DELIVERED' && <AvaliacaoInline pedidoId={p.id} />}
                {p.status !== 'CANCELLED' && <ChatPedido pedidoId={p.id} socketRef={socketRef} />}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
