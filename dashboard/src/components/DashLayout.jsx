import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiGrid, FiShoppingBag, FiPackage, FiClipboard, FiSettings, FiLogOut, FiMenu, FiX, FiMapPin, FiShield, FiPrinter, FiTag, FiTruck, FiGift, FiDownload, FiShare, FiInstagram, FiTrendingUp } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

const SUPORTE_WHATSAPP = '5533999394706'
const SUPORTE_INSTAGRAM = 'https://www.instagram.com/franklimello30/'
import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'

const NAV = [
  { to: '/', icon: FiGrid, label: 'Dashboard' },
  { to: '/pedidos', icon: FiClipboard, label: 'Pedidos' },
  { to: '/produtos', icon: FiPackage, label: 'Cardápio' },
  { to: '/bairros', icon: FiMapPin, label: 'Bairros e Taxas' },
  { to: '/cupons', icon: FiTag, label: 'Cupons' },
  { to: '/promocoes', icon: FiTrendingUp, label: 'Promoções' },
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
  const { canInstall, isIOS, installed, showIOSGuide, promptInstall, dismissIOSGuide } = usePWA()
  const showInstallBtn = canInstall || (isIOS && !installed)

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
            ) : isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <FiShield className="text-xs" /> Admin
              </span>
            ) : null}
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
    </div>
  )
}
