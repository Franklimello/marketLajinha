import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiSearch, FiFileText, FiUser, FiBriefcase } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: 'início', href: '/', icon: FiHome },
  { label: 'busca', href: '/busca', icon: FiSearch },
  { label: 'serviços', href: '/servicos', icon: FiBriefcase },
  { label: 'pedidos', href: '/pedidos', icon: FiFileText, badge: true },
  { label: 'conta', href: '/perfil', icon: FiUser },
]

export default function Footer() {
  const location = useLocation()
  const { pedidosAtivos } = useAuth()

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-lg mx-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)]">
        <div className="pointer-events-auto rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-xl shadow-[0_18px_36px_-28px_rgba(15,23,42,0.6)]">
      <nav
            className="px-2.5 h-16 flex items-center justify-between"
        aria-label="Navegação principal"
      >
        {NAV_ITEMS.map((item) => {
          const { label, href, badge } = item
          const IconComponent = item.icon
          const isActive = location.pathname === href || location.pathname.startsWith(`${href}/`)
          const count = badge ? pedidosAtivos : 0
          return (
            <Link
              key={href}
              to={href}
                  className={`relative flex flex-col items-center justify-center gap-0.5 w-[72px] h-[52px] rounded-xl transition-all duration-200 ${
                isActive
                      ? 'text-red-600'
                      : 'text-stone-400 hover:text-stone-600'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                    <>
                      <span className="absolute -top-1 w-9 h-1 rounded-full bg-red-500/80" />
                      <span className="absolute inset-0 rounded-xl bg-red-50 -z-10" />
                    </>
              )}
              <div className="relative">
                    <IconComponent className={`text-[21px] transition-transform ${isActive ? 'scale-110' : ''}`} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
                  <span className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
        </div>
      </div>
    </footer>
  )
}
