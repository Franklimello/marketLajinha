import { Link } from 'react-router-dom'
import { FiDownload } from 'react-icons/fi'
import { usePWA } from '../hooks/usePWA'

export default function Header() {
  const { canInstall, isIOS, installed, promptInstall } = usePWA()
  const showInstall = (canInstall || (isIOS && !installed))

  return (
    <header className="bg-stone-950 fixed top-0 left-0 right-0 z-50 h-14">
      <div className="max-w-lg mx-auto px-4 h-full flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="UaiFood - Ir para início"
        >
          <img
            src="/icons/logouaifood.png"
            alt="UaiFood"
            className="h-8 w-auto"
          />
        </Link>

        {showInstall && (
          <button
            onClick={promptInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiDownload size={14} />
            Instalar App
          </button>
        )}
      </div>
    </header>
  )
}
