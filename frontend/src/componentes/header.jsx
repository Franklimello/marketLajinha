import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-white border-b border-stone-100 fixed top-0 left-0 right-0 z-50 h-14">
      <div className="max-w-lg mx-auto px-4 h-full flex items-center justify-center">
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
          aria-label="MarketLajinha - Ir para início"
        >
          <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h16v2H4zm0 4h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8zm6 4v4h4v-4h-4z"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-stone-900 tracking-tight">
            Market<span className="text-amber-600">Lajinha</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
