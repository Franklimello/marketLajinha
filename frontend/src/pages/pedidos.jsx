import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadArquivoChat } from '../config/firebase'
import SEO from '../componentes/SEO'
import { FiClock, FiCheck, FiTruck, FiX, FiPackage, FiStar, FiMessageCircle, FiSend, FiPaperclip, FiFileText } from 'react-icons/fi'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_STEPS = [
  { key: 'APPROVED', label: 'Confirmado', icon: FiPackage },
  { key: 'IN_ROUTE', label: 'Saiu p/ entrega', icon: FiTruck },
  { key: 'DELIVERED', label: 'Entregue', icon: FiCheck },
]

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  APPROVED: { label: 'Confirmado', cor: 'bg-blue-100 text-blue-700', icon: FiPackage },
  IN_ROUTE: { label: 'Saiu p/ entrega', cor: 'bg-purple-100 text-purple-700', icon: FiTruck },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700', icon: FiCheck },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700', icon: FiX },
}

function StatusTracker({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
        <FiX className="text-red-500" />
        <span className="text-sm font-medium text-red-700">Pedido cancelado</span>
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status)

  return (
    <div className="flex items-center gap-1 w-full">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const Icon = step.icon
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              done ? 'bg-red-500 text-white scale-105' : 'bg-stone-100 text-stone-400'
            } ${i === currentIdx ? 'ring-2 ring-red-300 ring-offset-1' : ''}`}>
              <Icon size={14} />
            </div>
            <span className={`text-[10px] text-center leading-tight ${done ? 'text-red-700 font-semibold' : 'text-stone-400'}`}>
              {step.label}
            </span>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`hidden`} />
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
    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mt-2">
      <FiCheck /> Avaliação enviada!
    </div>
  )

  return (
    <div className="mt-2 pt-2 border-t border-stone-100">
      <p className="text-xs text-stone-500 mb-1.5">Avalie este pedido:</p>
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setNota(n)} className="p-0.5">
              <FiStar className={`text-lg ${n <= nota ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'}`} />
            </button>
          ))}
        </div>
        {nota > 0 && (
          <button onClick={enviar} disabled={enviando} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
            {enviando ? '...' : 'Enviar'}
          </button>
        )}
      </div>
      {nota > 0 && (
        <input
          type="text"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentário (opcional)"
          className="w-full mt-1.5 px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500"
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
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!permitidos.includes(file.type)) {
      alert('Formato inválido. Envie JPG, PNG, WEBP ou PDF.')
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
    } catch {}
    finally { setEnviando(false) }
  }

  return (
    <div className="mt-2 pt-2 border-t border-stone-100">
      <button
        onClick={() => { setAberto(!aberto); if (!aberto) setNaoLidas(0) }}
        className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-red-600 transition-colors"
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
        <div className="mt-2 border border-stone-200 rounded-xl overflow-hidden">
          <div ref={scrollRef} className="max-h-48 overflow-y-auto p-3 space-y-2 bg-stone-50">
            {mensagens.length === 0 && (
              <p className="text-[11px] text-stone-400 text-center py-3">Nenhuma mensagem ainda. Envie uma dúvida!</p>
            )}
            {mensagens.map((m) => (
              <div key={m.id} className={`flex ${m.remetente === 'CLIENTE' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs ${
                  m.remetente === 'CLIENTE'
                    ? 'bg-red-500 text-white rounded-br-sm'
                    : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm'
                }`}>
                  {!!m.conteudo && <p>{m.conteudo}</p>}
                  {!!m.arquivo_url && (
                    <div className={m.conteudo ? 'mt-1.5' : ''}>
                      {(m.arquivo_mime || '').startsWith('image/') ? (
                        <a href={m.arquivo_url} target="_blank" rel="noopener noreferrer">
                          <img src={m.arquivo_url} alt={m.arquivo_nome || 'Comprovante'} className="w-40 rounded-lg border border-white/30" />
                        </a>
                      ) : (
                        <a
                          href={m.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                            m.remetente === 'CLIENTE'
                              ? 'bg-white/20 text-white hover:bg-white/30'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          <FiFileText size={12} />
                          <span className="truncate max-w-[130px]">{m.arquivo_nome || 'Arquivo'}</span>
                        </a>
                      )}
                    </div>
                  )}
                  <p className={`text-[9px] mt-0.5 ${m.remetente === 'CLIENTE' ? 'text-red-100' : 'text-stone-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {arquivo && (
            <div className="px-3 py-1.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <p className="text-[11px] text-stone-500 truncate max-w-[75%]">Anexo: {arquivo.name}</p>
              <button type="button" onClick={limparArquivo} className="text-[11px] text-red-500 hover:text-red-600">Remover</button>
            </div>
          )}
          <form onSubmit={enviar} className="flex border-t border-stone-200 bg-white">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleSelecionarArquivo}
              className="hidden"
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 text-stone-400 hover:text-red-600">
              <FiPaperclip size={14} />
            </button>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-3 py-2 text-xs border-0 focus:ring-0 outline-none"
              maxLength={500}
            />
            <button type="submit" disabled={enviando || (!texto.trim() && !arquivo)} className="px-3 text-red-600 hover:text-red-700 disabled:text-stone-300">
              <FiSend size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function PedidosPage() {
  const { logado, carregando: authCarregando, cliente, setPedidosAtivos } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const socketRef = useRef(null)

  function atualizarBadge(lista) {
    const ativos = (lista || []).filter(
      (p) => p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'IN_ROUTE'
    )
    setPedidosAtivos(ativos.length)
  }

  const carregar = useCallback(async () => {
    if (authCarregando) return
    if (!logado) { setCarregando(false); return }
    try {
      const lista = await api.pedidos.meus()
      setPedidos(lista)
      atualizarBadge(lista)
    } catch { /* ignore */ }
    finally { setCarregando(false) }
  }, [logado, authCarregando])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!cliente?.id) return

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join:cliente', cliente.id)
    })

    socket.on('pedido:atualizado', (pedidoAtualizado) => {
      setPedidos((prev) => {
        const nova = prev.map((p) => p.id === pedidoAtualizado.id ? { ...pedidoAtualizado, loja: p.loja } : p)
        atualizarBadge(nova)
        return nova
      })
    })

    return () => { socket.disconnect() }
  }, [cliente?.id])

  if (authCarregando || carregando) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-center gap-2 text-stone-600">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-stone-300 border-t-red-500 animate-spin" />
          <p className="text-sm font-medium">Buscando seus pedidos...</p>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex justify-between">
              <div className="skeleton h-5 rounded w-1/3" />
              <div className="skeleton h-5 rounded-full w-20" />
            </div>
            <div className="skeleton h-3 rounded w-2/3" />
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="flex justify-between">
              <div className="skeleton h-4 rounded w-1/4" />
              <div className="skeleton h-4 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!logado) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-lg font-bold text-stone-900 mb-1">Seus pedidos ficam aqui</h2>
        <p className="text-stone-400 text-sm mb-5">Entre na sua conta para acompanhar pedidos em tempo real</p>
        <Link to="/login" className="inline-block px-6 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm transition-colors">Entrar na conta</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <SEO title="Meus pedidos" noIndex />
      <h1 className="text-xl font-bold text-stone-900 mb-4">Meus pedidos</h1>

      {pedidos.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-base font-bold text-stone-900 mb-1">Nenhum pedido ainda</h2>
          <p className="text-stone-400 text-sm mb-5">Que tal explorar os restaurantes e fazer seu primeiro pedido?</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 text-sm transition-colors">Explorar lojas</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING
            const Icon = st.icon
            return (
              <div key={p.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {p.loja?.logo_url && <img src={p.loja.logo_url} alt="" loading="lazy" className="w-8 h-8 rounded-lg object-cover" />}
                    <div>
                      <span className="text-sm font-semibold text-stone-900">{p.loja?.nome || 'Loja'}</span>
                      <p className="text-[10px] text-stone-400">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')} às {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-700">R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                </div>

                {/* Tracker visual */}
                <div className="mb-3">
                  <StatusTracker status={p.status} />
                </div>

                <div className="space-y-0.5">
                  {p.itens?.map((i) => (
                    <p key={i.id} className="text-xs text-stone-600">
                      {i.quantidade}x {i.produto?.nome || 'Produto'}
                      {i.variacao_nome && ` (${i.variacao_nome})`}
                    </p>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{p.forma_pagamento}</span>
                    {p.tipo_entrega === 'RETIRADA' && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">Retirada</span>}
                    {p.agendado_para && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Agendado</span>}
                  </div>
                </div>
                {p.status === 'DELIVERED' && <AvaliacaoInline pedidoId={p.id} />}
                {p.status !== 'CANCELLED' && <ChatPedido pedidoId={p.id} socketRef={socketRef} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
