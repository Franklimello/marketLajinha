import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiGrid, FiShoppingBag, FiPackage, FiClipboard, FiSettings, FiLogOut, FiMenu, FiX, FiMapPin, FiShield, FiPrinter, FiTag, FiTruck, FiGift } from 'react-icons/fi'
import { useState } from 'react'

const NAV = [
  { to: '/', icon: FiGrid, label: 'Dashboard' },
  { to: '/pedidos', icon: FiClipboard, label: 'Pedidos' },
  { to: '/produtos', icon: FiPackage, label: 'Cardápio' },
  { to: '/bairros', icon: FiMapPin, label: 'Bairros e Taxas' },
  { to: '/cupons', icon: FiTag, label: 'Cupons' },
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
        <Icon className="text-lg flex-shrink-0" />
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

      <div className="p-3 border-t border-stone-200">
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
    </div>
  )
}
