import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiDownload } from 'react-icons/fi'
import { usePWA } from '../hooks/usePWA'

export default function Header() {
  // usePWA centraliza toda a lógica de instalação do PWA
  const { canInstall, isIOS, installed, isStandalone, promptInstall } = usePWA()

  // Estado local para feedback visual enquanto o prompt está aberto
  const [installing, setInstalling] = useState(false)

  // Mostra o botão se:
  // - há um prompt nativo disponível (Android/Chrome) → canInstall === true
  // - OU é iOS (sem prompt nativo, mas podemos mostrar o guia manual)
  //   e o app ainda não está instalado
  const showInstall = canInstall || (isIOS && !installed)

  // Chama o prompt e gerencia o estado de loading
  async function handleInstall() {
    setInstalling(true)
    try {
      await promptInstall() // retorna 'accepted', 'dismissed', 'ios' ou 'unavailable'
    } finally {
      // Garante que o botão volte ao normal mesmo em caso de erro
      setInstalling(false)
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-stone-950 border-b border-stone-800/80 ${isStandalone ? 'h-[calc(5rem+env(safe-area-inset-top))]' : 'h-20'
        }`}
    >
      <div
        className={`max-w-lg mx-auto px-4 h-full flex items-center justify-between ${isStandalone ? 'pt-[env(safe-area-inset-top)]' : ''
          }`}
      >
        {/* Logo / link para home */}
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
          aria-label="UaiFood - Ir para início"
        >
          <img
            src="/icons/novalogo.png"
            alt=""
            className="h-20 w-20"
            width="80"
            height="80"
            fetchPriority="high"
            decoding="sync"
          />
          <div className="flex items-baseline gap-0">
            <span className="text-[22px] font-extrabold tracking-tight text-red-500">Uai</span>
            <span className="text-[22px] font-extrabold tracking-tight text-yellow-400">food</span>
            <span className="text-[10px] font-medium text-stone-500 ml-1.5 tracking-wider">delivery</span>
          </div>
        </Link>

        {/* Botão de instalação — só aparece quando o app é instalável */}
        {showInstall && (
          <button
            onClick={handleInstall}
            disabled={installing}
            aria-label="Instalar aplicativo UaiFood"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiDownload size={14} />
            {installing ? 'Aguarde...' : 'Instalar App'}
          </button>
        )}
      </div>
    </header>
  )
}
