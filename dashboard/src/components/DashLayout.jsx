import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiGrid, FiShoppingBag, FiPackage, FiClipboard, FiSettings, FiLogOut, FiMenu, FiX, FiMapPin, FiShield, FiPrinter, FiTag, FiTruck, FiGift, FiDownload, FiShare, FiInstagram, FiTrendingUp, FiBell, FiCamera, FiMessageCircle } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { io } from 'socket.io-client'
import { api } from '../api/client'

const SUPORTE_WHATSAPP = '5533999394706'
const SUPORTE_INSTAGRAM = 'https://www.instagram.com/franklimello30/'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePWA } from '../hooks/usePWA'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const NAV = [
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/pedidos', icon: FiClipboard, label: 'Pedidos' },
  { to: '/produtos', icon: FiPackage, label: 'Cardápio' },
  { to: '/bairros', icon: FiMapPin, label: 'Bairros e Taxas' },
  { to: '/cupons', icon: FiTag, label: 'Cupons' },
  { to: '/promocoes', icon: FiTrendingUp, label: 'Promoções do dia' },
  { to: '/posts', icon: FiMessageCircle, label: 'Post' },
  { to: '/stories', icon: FiCamera, label: 'Stories' },
  { to: '/impressoras', icon: FiPrinter, label: 'Impressoras' },
  { to: '/combos', icon: FiGift, label: 'Combos' },
  { to: '/motoboys', icon: FiTruck, label: 'Motoboys' },
  { to: '/minha-loja', icon: FiShoppingBag, label: 'Minha Loja' },
  { to: '/configuracoes', icon: FiSettings, label: 'Configurações' },
]

export default function DashLayout() {
  const { user, loja, logout, loading, isSuperAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [alertaPedidosIds, setAlertaPedidosIds] = useState([])
  const [modalNovoPedidoAberto, setModalNovoPedidoAberto] = useState(false)
  const [wsPedidosConectado, setWsPedidosConectado] = useState(false)
  const socketPedidosRef = useRef(null)
  const statusPedidoRef = useRef(new Map())
  const pollingRef = useRef(null)
  const primeiraCargaPedidosRef = useRef(true)
  const abriuPainelEmRef = useRef(Date.now())
  const audioRef = useRef(null)
  const { canInstall, isIOS, installed, showIOSGuide, promptInstall, dismissIOSGuide } = usePWA()
  const showInstallBtn = canInstall || (isIOS && !installed)

  const registrarNovoPedido = useCallback((pedido) => {
    const id = String(pedido?.id || '')
    if (!id) return
    setAlertaPedidosIds((prev) => {
      if (prev.includes(id)) return prev
      audioRef.current?.play()?.catch(() => {})
      setModalNovoPedidoAberto(true)
      return [...prev, id]
    })
  }, [])

  const carregarPedidosEmBackground = useCallback(async () => {
    try {
      const res = await api.pedidos.listar()
      const lista = Array.isArray(res) ? res : (Array.isArray(res?.dados) ? res.dados : [])
      if (!Array.isArray(lista) || lista.length === 0) return

      for (const pedido of lista) {
        const id = String(pedido?.id || '')
        if (!id) continue
        const statusAnterior = statusPedidoRef.current.get(id)
        statusPedidoRef.current.set(id, pedido.status)

        const pedidoEhNovo = statusAnterior === undefined
        const criadoEmMs = new Date(pedido?.created_at || 0).getTime()
        const pedidoMuitoRecenteAoAbrir =
          pedidoEhNovo &&
          Number.isFinite(criadoEmMs) &&
          criadoEmMs >= (abriuPainelEmRef.current - 3000)

        if (pedidoEhNovo && (!primeiraCargaPedidosRef.current || pedidoMuitoRecenteAoAbrir)) {
          registrarNovoPedido(pedido)
        }
      }

      if (primeiraCargaPedidosRef.current) primeiraCargaPedidosRef.current = false
    } catch {
      // noop
    }
  }, [registrarNovoPedido])

  useEffect(() => {
    if (!loja?.id) return undefined

    abriuPainelEmRef.current = Date.now()
    primeiraCargaPedidosRef.current = true
    carregarPedidosEmBackground()
    pollingRef.current = setInterval(() => carregarPedidosEmBackground(), 5000)

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] })
    socketPedidosRef.current = socket

    socket.on('connect', () => {
      setWsPedidosConectado(true)
      socket.emit('join:loja', loja.id)
    })
    socket.on('disconnect', () => setWsPedidosConectado(false))

    socket.on('pedido:novo', (pedido) => {
      const id = String(pedido?.id || '')
      if (!id) return
      statusPedidoRef.current.set(id, pedido.status)
      registrarNovoPedido(pedido)
    })

    socket.on('pedido:atualizado', (pedidoAtualizado) => {
      const id = String(pedidoAtualizado?.id || '')
      if (!id) return
      const statusAnterior = statusPedidoRef.current.get(id)
      statusPedidoRef.current.set(id, pedidoAtualizado.status)
      const pedidoEhNovo = statusAnterior === undefined
      if (pedidoEhNovo) {
        registrarNovoPedido(pedidoAtualizado)
      }
    })

    return () => {
      clearInterval(pollingRef.current)
      socket.disconnect()
      setWsPedidosConectado(false)
    }
  }, [loja?.id, registrarNovoPedido, carregarPedidosEmBackground])

  function irParaPedidos() {
    setAlertaPedidosIds([])
    setModalNovoPedidoAberto(false)
    setMenuAberto(false)
    navigate('/pedidos')
  }

  function dispensarModal() {
    setAlertaPedidosIds([])
    setModalNovoPedidoAberto(false)
  }

  function marcarComoVisto() {
    setAlertaPedidosIds([])
    setModalNovoPedidoAberto(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  const isAdminPage = location.pathname.startsWith('/admin')

  if (!loja && !isSuperAdmin) {
    navigate('/cadastro-loja')
    return null
  }

  if (!loja && isSuperAdmin && !isAdminPage) {
    navigate('/admin')
    return null
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function NavItem({ to, icon: Icon, label }) {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        onClick={() => setMenuAberto(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-amber-50 text-amber-700'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <Icon className="text-lg shrink-0" />
        {label}
      </Link>
    )
  }

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          {loja?.logo_url ? (
            <img src={loja.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : loja ? (
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center font-bold text-amber-700">
              {loja.nome?.charAt(0)}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <FiShield className="text-red-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 truncate text-sm">{loja?.nome || 'Super Admin'}</p>
            <p className="text-xs text-stone-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {loja && NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        {isSuperAdmin && (
          <>
            {loja && <div className="border-t border-stone-200 my-2" />}
            <NavItem to="/admin" icon={FiShield} label="Admin Sistema" />
          </>
        )}
      </div>

      <div className="p-3 border-t border-stone-200 space-y-1">
        <div className="flex items-center gap-1 px-4 py-1">
          <span className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">Suporte</span>
        </div>
        <div className="flex items-center gap-2 px-4">
          <a
            href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Preciso de suporte no painel MarketLajinha.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <FaWhatsapp /> WhatsApp
          </a>
          <a
            href={SUPORTE_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:bg-pink-50 hover:text-pink-600 transition-colors"
          >
            <FiInstagram /> Instagram
          </a>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <FiLogOut className="text-lg" />
          Sair
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-stone-200 hidden lg:flex flex-col z-30">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {menuAberto && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMenuAberto(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-60 bg-white border-r border-stone-200 z-50 transform transition-transform lg:hidden ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 h-14 flex items-center justify-between lg:justify-end">
          <button
            onClick={() => setMenuAberto(true)}
            className="lg:hidden text-stone-600 hover:text-stone-900"
          >
            <FiMenu className="text-xl" />
          </button>
          <div className="flex items-center gap-2">
            {showInstallBtn && (
              <button
                onClick={promptInstall}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
              >
                <FiDownload size={14} />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}
            {alertaPedidosIds.length > 0 && (
              <button
                onClick={() => setModalNovoPedidoAberto(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors animate-pulse"
                title="Novo pedido recebido"
              >
                <FiBell size={14} />
                <span>{alertaPedidosIds.length} novo(s)</span>
              </button>
            )}
            {loja ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  (loja.aberta_agora ?? loja.aberta) ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${(loja.aberta_agora ?? loja.aberta) ? 'bg-green-500' : 'bg-stone-400'}`} />
                {(loja.aberta_agora ?? loja.aberta) ? 'Aberta' : 'Fechada'}
                {loja.forcar_status && ' (manual)'}
              </span>
            ) : null}
            {loja && (
              <span className={`inline-flex items-center gap-1 text-[10px] ${wsPedidosConectado ? 'text-green-600' : 'text-stone-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsPedidosConectado ? 'bg-green-500' : 'bg-stone-300'}`} />
                {wsPedidosConectado ? 'Ao vivo' : 'Offline'}
              </span>
            )}
            {!loja && isSuperAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <FiShield className="text-xs" /> Admin
              </span>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-9999 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={dismissIOSGuide}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Instalar Painel</h3>
              <button onClick={dismissIOSGuide} className="p-1 text-stone-400 hover:text-stone-600"><FiX size={20} /></button>
            </div>
            <p className="text-sm text-stone-600 mb-5">Para instalar no seu iPhone/iPad:</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-amber-700">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">Toque no botão Compartilhar</p>
                  <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">O ícone <FiShare className="inline" size={14} /> na barra do Safari</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-amber-700">2</span>
                </div>
                <p className="text-sm font-medium text-stone-800">Adicionar à Tela de Início</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-amber-700">3</span>
                </div>
                <p className="text-sm font-medium text-stone-800">Confirme tocando "Adicionar"</p>
              </div>
            </div>
            <button onClick={dismissIOSGuide} className="mt-6 w-full py-3 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors">
              Entendi
            </button>
          </div>
        </div>
      )}

      {alertaPedidosIds.length > 0 && (
        <div className="fixed inset-0 z-45 pointer-events-none">
          <div className="absolute inset-0 border-12 border-red-500 animate-pulse" />
          <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
        </div>
      )}

      {modalNovoPedidoAberto && alertaPedidosIds.length > 0 && (
        <div className="fixed inset-0 z-90 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-red-100 overflow-hidden">
            <div className="px-5 py-4 bg-red-50 border-b border-red-100">
              <p className="text-sm font-semibold text-red-700">Novo pedido recebido</p>
              <h3 className="text-xl font-extrabold text-stone-900 mt-1">
                {alertaPedidosIds.length} pedido(s) aguardando atenção
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-stone-600">
                Chegaram novos pedidos. Deseja abrir a tela de pedidos agora?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={dispensarModal}
                  className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50"
                >
                  Fechar
                </button>
                <button
                  onClick={marcarComoVisto}
                  className="px-3 py-2 rounded-lg bg-amber-100 text-amber-800 text-sm font-semibold hover:bg-amber-200"
                >
                  Marcar como visto
                </button>
                <button
                  onClick={irParaPedidos}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                >
                  Ver pedidos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZWTjHxybG16iJSdnpiQg3VtcIGRnaalm5CDdG90gZGfo6Sgk4R2cXSCkZ+koZiMfnRyeYiXoaOemIyCdnN3hZSfoaCXi392c3eElp+joZiMfnZzeIWWoaOel4t+dXJ3"
        preload="auto"
      />
    </div>
  )
}
