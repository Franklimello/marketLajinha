import { useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import {
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiGrid,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiSettings,
  FiX,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const MENU = [
  { to: '/dashboard-service', label: 'Painel', icon: FiGrid },
  { to: '/dashboard-service/services', label: 'Meus Servicos', icon: FiBriefcase },
  { to: '/dashboard-service/bookings', label: 'Agendamentos', icon: FiCalendar },
  { to: '/dashboard-service/schedule', label: 'Agenda', icon: FiClock },
  { to: '/dashboard-service/settings', label: 'Configuracoes', icon: FiSettings },
]

function navClass(isActive) {
  return `flex items-center gap-2.5 border px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'border-amber-500 bg-amber-50 text-amber-800'
      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
  }`
}

function SideNav({ onNavigate }) {
  return (
    <nav className="space-y-2" aria-label="Navegação do painel de serviços">
      {MENU.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard-service'}
            onClick={onNavigate}
            className={({ isActive }) => navClass(isActive)}
          >
            <Icon className="text-base" />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function ServiceDashboardLayout() {
  const { user, loading, logout, accountType, account, loja, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500">
        Carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (accountType !== 'service') {
    if (loja) return <Navigate to="/pedidos" replace />
    if (isSuperAdmin) return <Navigate to="/admin" replace />
    return <Navigate to="/cadastro-loja" replace />
  }

  const accountName = account?.name || user?.displayName || user?.email || 'Prestador'
  const accountCity = account?.city || 'Cidade não definida'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b border-stone-300 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden inline-flex items-center justify-center border border-white/25 bg-white/10 w-9 h-9"
              aria-label="Abrir menu"
            >
              <FiMenu size={18} />
            </button>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-300">UAIFOOD Servicos</p>
              <h1 className="text-lg font-semibold text-white">Painel Premium do Prestador</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{accountName}</p>
              <p className="text-xs text-stone-300 inline-flex items-center gap-1">
                <FiMapPin size={12} /> {accountCity}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
            >
              <FiLogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          aria-label="Fechar menu"
        />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-stone-100 border-r border-stone-300 px-4 py-4 transform transition-transform lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-stone-900">Menu</p>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center justify-center border border-stone-300 bg-white w-8 h-8"
            aria-label="Fechar menu"
          >
            <FiX size={16} />
          </button>
        </div>
        <SideNav onNavigate={() => setMobileMenuOpen(false)} />
      </aside>

      <div className="max-w-7xl mx-auto px-4 py-4 grid lg:grid-cols-[240px_1fr] gap-4">
        <aside className="hidden lg:block">
          <div className="sticky top-4 border border-stone-200 bg-white p-3 space-y-3">
            <div className="border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs text-stone-500">Conta ativa</p>
              <p className="text-sm font-semibold text-stone-900 mt-0.5">{accountName}</p>
              <p className="text-xs text-stone-500 mt-1 inline-flex items-center gap-1">
                <FiMapPin size={12} /> {accountCity}
              </p>
            </div>
            <SideNav />
          </div>
        </aside>

        <main className="space-y-4 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
