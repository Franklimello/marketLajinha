import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadArquivoChat } from '../config/firebase'
import { FiClock, FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiPrinter, FiRefreshCw, FiMessageCircle, FiSend, FiPaperclip, FiFileText } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_MAP = {
  PENDING: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Pedido recebido', cor: 'bg-blue-100 text-blue-700' },
  IN_ROUTE: { label: 'Saiu p/ entrega', cor: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Entregue', cor: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelado', cor: 'bg-red-100 text-red-700' },
}

const PAGAMENTO_MAP = {
  PIX: 'PIX',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  CASH: 'Dinheiro',
}
const PIX_ONLINE_TAG = '[PIX ONLINE]'

function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function isPixOnline(pedido) {
  return pedido?.forma_pagamento === 'PIX' && String(pedido?.observacao || '').includes(PIX_ONLINE_TAG)
}

function isStatusFinalizado(status) {
  return status === 'DELIVERED' || status === 'CANCELLED'
}

export default function Pedidos() {
  const { loja } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('APPROVED')
  const [busca, setBusca] = useState('')
  const [pedidoAberto, setPedidoAberto] = useState(null)
  const [naoLidasMap, setNaoLidasMap] = useState({})
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [wsConectado, setWsConectado] = useState(false)
  const audioRef = useRef(null)
  const socketRef = useRef(null)
  const intervaloRef = useRef(null)
  const pedidosCountRef = useRef(0)
  const pedidoIdsRef = useRef(new Set())
  const primeiraCargaRef = useRef(true)
  const filtroStatusRef = useRef('APPROVED')
  const buscaRef = useRef('')

  useEffect(() => {
    filtroStatusRef.current = filtroStatus
  }, [filtroStatus])

  useEffect(() => {
    buscaRef.current = busca
  }, [busca])

  function montarParamsConsulta() {
    const filtro = filtroStatusRef.current
    const buscaAtual = String(buscaRef.current || '').trim()
    const includeFinalizados =
      filtro === 'TODOS' || isStatusFinalizado(filtro) || buscaAtual.length > 0
    const params = { include_finalizados: includeFinalizados }
    if (['PENDING', 'APPROVED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED'].includes(filtro)) {
      params.status = filtro
    }
    return params
  }

  const carregarPedidos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const res = await api.pedidos.listar(montarParamsConsulta())
      const lista = Array.isArray(res) ? res : (Array.isArray(res?.dados) ? res.dados : [])

      if (silencioso && lista.length > pedidosCountRef.current && pedidosCountRef.current > 0) {
        audioRef.current?.play()?.catch(() => {})
      }
      pedidosCountRef.current = lista.length
      const idsAtuais = new Set(lista.map((p) => p.id))
      pedidoIdsRef.current = idsAtuais
      if (primeiraCargaRef.current) primeiraCargaRef.current = false

      setPedidos(lista)
      setUltimaAtualizacao(new Date())
    } catch {
      if (!silencioso) setPedidos([])
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (!loja) return
    carregarPedidos()

    intervaloRef.current = setInterval(() => carregarPedidos(true), 15000)

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setWsConectado(true)
      socket.emit('join:loja', loja.id)
    })

    socket.on('disconnect', () => setWsConectado(false))

    socket.on('pedido:novo', (pedido) => {
      setPedidos((prev) => {
        if (prev.some((p) => p.id === pedido.id)) return prev
        pedidosCountRef.current = prev.length + 1
        pedidoIdsRef.current = new Set([pedido.id, ...prev.map((p) => p.id)])
        return [pedido, ...prev]
      })
      setUltimaAtualizacao(new Date())
      audioRef.current?.play()?.catch(() => {})
    })

    socket.on('pedido:atualizado', (pedidoAtualizado) => {
      setPedidos((prev) => {
        const ocultarFinalizados = filtroStatusRef.current === 'ATIVOS' && !String(buscaRef.current || '').trim()
        if (ocultarFinalizados && isStatusFinalizado(pedidoAtualizado.status)) {
          return prev.filter((p) => p.id !== pedidoAtualizado.id)
        }
        return prev.map((p) => p.id === pedidoAtualizado.id ? pedidoAtualizado : p)
      })
      setUltimaAtualizacao(new Date())
    })

    socket.on('chat:nova_mensagem', (msg) => {
      if (msg.remetente === 'CLIENTE') {
        setNaoLidasMap((prev) => ({ ...prev, [msg.pedido_id]: (prev[msg.pedido_id] || 0) + 1 }))
        audioRef.current?.play()?.catch(() => {})
      }
    })

    api.chat.naoLidas().then((res) => {
      const map = {}
      for (const item of res.porPedido || []) map[item.pedido_id] = item.count
      setNaoLidasMap(map)
    }).catch(() => {})

    return () => {
      clearInterval(intervaloRef.current)
      socket.disconnect()
    }
  }, [loja, carregarPedidos])

  useEffect(() => {
    if (!loja) return
    const t = setTimeout(() => {
      carregarPedidos(true)
    }, busca.trim() ? 280 : 0)
    return () => clearTimeout(t)
  }, [filtroStatus, busca, loja, carregarPedidos])

  async function mudarStatus(id, novoStatus) {
    try {
      await api.pedidos.atualizarStatus(id, novoStatus)
      setPedidos((prev) => {
        const atualizados = prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p))
        const ocultarFinalizados = filtroStatusRef.current === 'ATIVOS' && !String(buscaRef.current || '').trim()
        if (ocultarFinalizados && isStatusFinalizado(novoStatus)) {
          return atualizados.filter((p) => p.id !== id)
        }
        return atualizados
      })
      if (pedidoAberto?.id === id) {
        setPedidoAberto((prev) => ({ ...prev, status: novoStatus }))
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const filtrados = pedidos
    .filter((p) => {
      if (filtroStatus === 'ATIVOS') return !isStatusFinalizado(p.status)
      if (filtroStatus === 'TODOS') return true
      return p.status === filtroStatus
    })
    .filter((p) => {
      if (!busca) return true
      const q = busca.toLowerCase()
      return (
        p.nome_cliente?.toLowerCase().includes(q) ||
        p.telefone_cliente?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const contadores = {
    ATIVOS: pedidos.filter((p) => !isStatusFinalizado(p.status)).length,
    TODOS: pedidos.length,
    PENDING: pedidos.filter((p) => p.status === 'PENDING').length,
    APPROVED: pedidos.filter((p) => p.status === 'APPROVED').length,
    IN_ROUTE: pedidos.filter((p) => p.status === 'IN_ROUTE').length,
    DELIVERED: pedidos.filter((p) => p.status === 'DELIVERED').length,
    CANCELLED: pedidos.filter((p) => p.status === 'CANCELLED').length,
  }
  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando pedidos...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Pedidos</h1>
            <p className="text-stone-500 text-sm mt-1">
              {pedidos.length} pedido(s) no total
              {ultimaAtualizacao && (
                <span className="ml-2 text-xs text-stone-400">
                  · atualizado às {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <span className={`ml-2 inline-flex items-center gap-1 text-xs ${wsConectado ? 'text-green-500' : 'text-stone-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsConectado ? 'bg-green-500' : 'bg-stone-300'}`} />
                {wsConectado ? 'Ao vivo' : 'Offline'}
              </span>
            </p>
          </div>
          <button onClick={() => carregarPedidos(true)} title="Atualizar agora" className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition">
            <FiRefreshCw size={20} />
          </button>
        </div>
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZWTjHxybG16iJSdnpiQg3VtcIGRnaalm5CDdG90gZGfo6Sgk4R2cXSCkZ+koZiMfnRyeYiXoaOemIyCdnN3hZSfoaCXi392c3eElp+joZiMfnZzeIWWoaOel4t+dXJ3" preload="auto" />
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2">
        {Object.entries({ ATIVOS: 'Ativos', TODOS: 'Todos', ...Object.fromEntries(Object.entries(STATUS_MAP).map(([k, v]) => [k, v.label])) }).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltroStatus(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroStatus === key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {label} ({contadores[key] || 0})
            </button>
          )
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou ID..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <FiFilter className="text-3xl text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING
            const pixOnline = isPixOnline(p)
            const pedidoColapsado = p.status === 'DELIVERED' || p.status === 'CANCELLED'
            return (
              <div
                key={p.id}
                onClick={() => {
                  setPedidoAberto(p)
                  setNaoLidasMap((prev) => ({ ...prev, [p.id]: 0 }))
                }}
                className="bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900">{p.nome_cliente}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cor}`}>
                        {st.label}
                      </span>
                      {(naoLidasMap[p.id] || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <FiMessageCircle size={11} /> {naoLidasMap[p.id]}
                        </span>
                      )}
                      {pixOnline && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          PIX online - conferir comprovante
                        </span>
                      )}
                      {pedidoColapsado && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                          Recolhido
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-400 mt-1">{formatDate(p.created_at)}</p>
                    {!pedidoColapsado && (
                      <p className="text-sm text-stone-500 mt-1 truncate">
                        {p.tipo_entrega === 'RETIRADA'
                          ? <span className="text-purple-600 font-medium">Retirada no balcão</span>
                          : <>{p.endereco || '—'}{p.bairro ? ` · ${p.bairro}` : ''}</>}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-stone-900">{formatCurrency(p.total)}</p>
                    <p className="text-xs text-stone-400">{PAGAMENTO_MAP[p.forma_pagamento] || p.forma_pagamento}</p>
                  </div>
                </div>

                {!pedidoColapsado && p.itens && p.itens.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-xs text-stone-400 mb-1">{p.itens.length} item(ns)</p>
                    <div className="flex flex-wrap gap-1">
                      {p.itens.slice(0, 4).map((item, i) => (
                        <span key={i} className="text-xs bg-stone-50 text-stone-600 px-2 py-0.5 rounded">
                          {item.quantidade}x {item.produto?.nome || 'Produto'}
                        </span>
                      ))}
                      {p.itens.length > 4 && (
                        <span className="text-xs text-stone-400">+{p.itens.length - 4} mais</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal detalhes */}
      {pedidoAberto && (
        <ModalDetalhePedido
          pedido={pedidoAberto}
          onFechar={() => setPedidoAberto(null)}
          onMudarStatus={mudarStatus}
          socketRef={socketRef}
        />
      )}
    </div>
  )
}

function ChatLoja({ pedidoId, socketRef }) {
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    api.chat.mensagens(pedidoId).then((msgs) => {
      setMensagens(msgs)
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50)
    }).catch(() => {})
  }, [pedidoId])

  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return
    function onMsg(msg) {
      if (msg.pedido_id !== pedidoId) return
      setMensagens((prev) => [...prev, msg])
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50)
    }
    socket.on('chat:nova_mensagem', onMsg)
    return () => socket.off('chat:nova_mensagem', onMsg)
  }, [pedidoId, socketRef])

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
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <p className="text-xs text-amber-800 font-semibold uppercase tracking-wide mb-2">Chat com o cliente</p>
      <div className="border border-amber-200 rounded-xl overflow-hidden bg-white">
        <div ref={scrollRef} className="max-h-56 overflow-y-auto p-3 space-y-2 bg-amber-50/30">
          {mensagens.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-4">Nenhuma mensagem neste pedido.</p>
          )}
          {mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.remetente === 'LOJA' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                m.remetente === 'LOJA'
                  ? 'bg-amber-500 text-white rounded-br-sm'
                  : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm'
              }`}>
                {!!m.conteudo && <p>{m.conteudo}</p>}
                {!!m.arquivo_url && (
                  <div className={m.conteudo ? 'mt-1.5' : ''}>
                    {(m.arquivo_mime || '').startsWith('image/') ? (
                      <a href={m.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <img src={m.arquivo_url} alt={m.arquivo_nome || 'Anexo'} className="w-44 rounded-lg border border-white/30" />
                      </a>
                    ) : (
                      <a
                        href={m.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                          m.remetente === 'LOJA'
                            ? 'bg-white/20 text-white hover:bg-white/30'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <FiFileText size={13} />
                        <span className="truncate max-w-[180px]">{m.arquivo_nome || 'Arquivo'}</span>
                      </a>
                    )}
                  </div>
                )}
                <p className={`text-[10px] mt-0.5 ${m.remetente === 'LOJA' ? 'text-amber-100' : 'text-stone-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
        {arquivo && (
          <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
            <p className="text-[11px] text-stone-500 truncate max-w-[75%]">Anexo: {arquivo.name}</p>
            <button type="button" onClick={limparArquivo} className="text-[11px] text-red-500 hover:text-red-600">Remover</button>
          </div>
        )}
        <form onSubmit={enviar} className="flex border-t border-amber-200 bg-white">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleSelecionarArquivo}
            className="hidden"
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 text-amber-500 hover:text-amber-700">
            <FiPaperclip size={16} />
          </button>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Responder cliente..."
            className="flex-1 px-3 py-2.5 text-sm border-0 focus:ring-0 outline-none placeholder:text-stone-400"
            maxLength={500}
          />
          <button type="submit" disabled={enviando || (!texto.trim() && !arquivo)} className="px-4 text-amber-600 hover:text-amber-700 disabled:text-stone-300">
            <FiSend size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

function ModalDetalhePedido({ pedido, onFechar, onMudarStatus, socketRef }) {
  const st = STATUS_MAP[pedido.status] || STATUS_MAP.PENDING
  const pixOnline = isPixOnline(pedido)
  const [imprimindo, setImprimindo] = useState(false)
  const [statusModalAberto, setStatusModalAberto] = useState(false)
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [statusAviso, setStatusAviso] = useState('')

  useEffect(() => {
    if (!statusAviso) return undefined
    const t = setTimeout(() => setStatusAviso(''), 2200)
    return () => clearTimeout(t)
  }, [statusAviso])

  async function handleImprimir() {
    setImprimindo(true)
    try {
      const res = await api.impressoras.imprimir(pedido.id)
      const setores = res.setores || []
      const erros = setores.filter((s) => s.status === 'erro' || s.status === 'sem_impressora')
      if (erros.length === 0) {
        alert('Impressão enviada com sucesso!')
      } else {
        const msgs = erros.map((s) => `${s.setor}: ${s.erro || 'sem impressora cadastrada'}`).join('\n')
        alert(`Alguns setores não foram impressos:\n${msgs}`)
      }
    } catch (err) {
      alert(`Erro: ${err.message}`)
    } finally { setImprimindo(false) }
  }

  async function handleMudarStatusConfirmado(novoStatus) {
    if (pedido.status === novoStatus || alterandoStatus) return
    setAlterandoStatus(true)
    try {
      await onMudarStatus(pedido.id, novoStatus)
      setStatusModalAberto(false)
      const label = STATUS_MAP[novoStatus]?.label || novoStatus
      setStatusAviso(`Status alterado para ${label}.`)
    } finally {
      setAlterandoStatus(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Pedido</h2>
            <p className="text-xs text-stone-400 mt-0.5 font-mono">{pedido.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              disabled={imprimindo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
              title="Imprimir pedido"
            >
              <FiPrinter className={imprimindo ? 'animate-pulse' : ''} />
              {imprimindo ? 'Enviando...' : 'Imprimir'}
            </button>
            <button onClick={onFechar} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">
              &times;
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {pixOnline && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-sm font-semibold text-amber-800">
                Pagamento PIX online. Confira o comprovante antes de aprovar.
              </p>
            </div>
          )}
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-medium text-stone-900">{pedido.nome_cliente}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Telefone</p>
              <div className="flex items-center gap-2">
                <p className="font-medium text-stone-900">{pedido.telefone_cliente}</p>
                {pedido.telefone_cliente && (
                  <a
                    href={`https://wa.me/55${pedido.telefone_cliente.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${pedido.nome_cliente || ''}! Sobre seu pedido no MarketLajinha:`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition"
                  >
                    <FaWhatsapp /> WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Tipo de entrega</p>
              <p className="font-medium text-stone-900">
                {pedido.tipo_entrega === 'RETIRADA' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold">Retirada no balcão</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">Entrega</span>
                )}
              </p>
            </div>
            {pedido.tipo_entrega !== 'RETIRADA' && (
              <div className="col-span-2">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Endereço</p>
                <div className="bg-stone-50 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-stone-900">{pedido.endereco || '—'}</p>
                  {pedido.bairro && (
                    <p className="text-sm text-stone-600"><span className="text-stone-400">Bairro:</span> {pedido.bairro}</p>
                  )}
                  {pedido.complemento && (
                    <p className="text-sm text-stone-600"><span className="text-stone-400">Complemento:</span> {pedido.complemento}</p>
                  )}
                  {pedido.referencia && (
                    <p className="text-sm text-stone-600"><span className="text-stone-400">Referência:</span> {pedido.referencia}</p>
                  )}
                </div>
              </div>
            )}
            {pedido.agendado_para && (
              <div className="col-span-2">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Agendado para</p>
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 font-medium">
                  {new Date(pedido.agendado_para).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            {pedido.observacao && (
              <div className="col-span-2">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Observação</p>
                <p className="text-sm text-stone-700 bg-stone-50 rounded-lg p-3">{pedido.observacao}</p>
              </div>
            )}
          </div>

          {/* Itens */}
          {pedido.itens && pedido.itens.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Itens do pedido</p>
              <div className="bg-stone-50 rounded-lg divide-y divide-stone-200">
                {pedido.itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <span className="font-medium text-stone-900">
                        {item.quantidade}x {item.produto?.nome || 'Produto'}
                      </span>
                    </div>
                    <span className="text-stone-600">
                      {formatCurrency(Number(item.preco_unitario) * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="bg-stone-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Pagamento</span>
              <span className="font-medium text-stone-900">{PAGAMENTO_MAP[pedido.forma_pagamento] || pedido.forma_pagamento}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Data</span>
              <span className="font-medium text-stone-900">{formatDate(pedido.created_at)}</span>
            </div>
            {Number(pedido.subtotal) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Subtotal</span>
                <span className="font-medium text-stone-900">{formatCurrency(pedido.subtotal)}</span>
              </div>
            )}
            {Number(pedido.desconto) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Desconto (cupom)</span>
                <span className="font-medium text-green-600">- {formatCurrency(pedido.desconto)}</span>
              </div>
            )}
            {Number(pedido.taxa_entrega) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Taxa entrega</span>
                <span className="font-medium text-stone-900">{formatCurrency(pedido.taxa_entrega)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-stone-200 pt-2 mt-2">
              <span className="font-semibold text-stone-900">Total</span>
              <span className="font-bold text-stone-900 text-lg">{formatCurrency(pedido.total)}</span>
            </div>
          </div>

          {/* Chat */}
          <ChatLoja pedidoId={pedido.id} socketRef={socketRef} />

          {/* Alterar status */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <p className="text-xs text-amber-800 font-semibold uppercase tracking-wide mb-2">Alterar status</p>
            <button
              type="button"
              onClick={() => setStatusModalAberto(true)}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 border border-amber-600 transition-colors"
            >
              Mudar status do pedido do cliente
            </button>
          </div>
        </div>
      </div>

      {statusAviso && (
        <div className="fixed inset-0 z-70 pointer-events-none flex items-center justify-center p-4">
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 shadow-lg">
            {statusAviso}
          </p>
        </div>
      )}

      {statusModalAberto && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Mudar status do pedido</h3>
              <button
                type="button"
                onClick={() => !alterandoStatus && setStatusModalAberto(false)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
                disabled={alterandoStatus}
              >
                &times;
              </button>
            </div>
            <div className="p-4 space-y-2">
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleMudarStatusConfirmado(key)}
                  disabled={pedido.status === key || alterandoStatus}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pedido.status === key
                      ? `${val.cor} ring-2 ring-offset-1 ring-amber-400`
                      : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                  } disabled:opacity-65 disabled:cursor-not-allowed`}
                >
                  {alterandoStatus && pedido.status !== key ? (
                    <span className="inline-flex items-center gap-2">
                      <FiRefreshCw className="animate-spin" size={14} />
                      Alterando...
                    </span>
                  ) : (
                    val.label
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
