import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiSearch, FiFileText, FiUser } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: 'início', href: '/', icon: FiHome },
  { label: 'busca', href: '/busca', icon: FiSearch },
  { label: 'pedidos', href: '/pedidos', icon: FiFileText, badge: true },
  { label: 'conta', href: '/perfil', icon: FiUser },
]

export default function Footer() {
  const location = useLocation()
  const { pedidosAtivos } = useAuth()

  return (
    <footer className="bg-white border-t border-stone-200 fixed bottom-0 left-0 right-0 z-50 h-16 safe-area-bottom">
      <nav
        className="max-w-lg mx-auto px-4 h-full flex items-center justify-around"
        aria-label="Navegação principal"
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon, badge }) => {
          const isActive = location.pathname === href
          const count = badge ? pedidosAtivos : 0
          return (
            <Link
              key={href}
              to={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-16 py-2 transition-all duration-200 ${
                isActive
                  ? 'text-amber-600'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute -top-2 w-10 h-10 bg-amber-50 rounded-full -z-10" />
              )}
              <div className="relative">
                <Icon className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wide">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </footer>
  )
}
