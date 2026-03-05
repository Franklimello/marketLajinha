import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MENU = [
  { to: '/dashboard-service', label: 'Dashboard' },
  { to: '/dashboard-service/services', label: 'My Services' },
  { to: '/dashboard-service/bookings', label: 'Bookings' },
  { to: '/dashboard-service/schedule', label: 'Schedule' },
  { to: '/dashboard-service/settings', label: 'Settings' },
]

function itemClass(isActive) {
  return `px-3 py-2 text-sm border ${isActive ? 'border-amber-600 text-amber-700 bg-amber-50' : 'border-stone-200 text-stone-600 bg-white'}`
}

export default function ServiceDashboardLayout() {
  const { user, loading, logout, accountType, loja, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

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

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">UAIFOOD • Serviços</h1>
            <p className="text-xs text-stone-500">Painel do prestador</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="border border-stone-300 px-3 py-1.5 text-sm text-stone-700"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 grid lg:grid-cols-[220px_1fr] gap-4">
        <aside className="space-y-2">
          {MENU.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard-service'} className={({ isActive }) => itemClass(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
