import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiDownload, FiLoader, FiMoon, FiSun } from 'react-icons/fi'
import { usePWA } from '../hooks/usePWA'

export default function Header({ theme = 'dark', onToggleTheme = null }) {
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
      className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl ${
        theme === 'dark'
          ? 'border-stone-800/70 bg-stone-950/92'
          : 'border-stone-200/80 bg-white/92'
      } ${isStandalone ? 'h-[calc(4.9rem+env(safe-area-inset-top))]' : 'h-[4.9rem]'
        }`}
    >
      <span
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent to-transparent ${
          theme === 'dark' ? 'via-red-500/60' : 'via-red-400/50'
        }`}
      />
      <div
        className={`max-w-lg mx-auto px-4 h-full flex items-center justify-between ${isStandalone ? 'pt-[env(safe-area-inset-top)]' : ''
          }`}
      >
        {/* Logo / link para home */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-95"
          aria-label="UaiFood - Ir para início"
        >
          <img
            src="/icons/novalogo.png"
            alt=""
            className="h-[62px] w-[62px] transition-transform duration-200 group-hover:scale-[1.03]"
            width="62"
            height="62"
            fetchPriority="high"
            decoding="sync"
          />
          <div className="leading-tight">
            <div className="flex items-baseline gap-0">
              <span className="text-[22px] font-extrabold tracking-tight text-red-500">Uai</span>
              <span className="text-[22px] font-extrabold tracking-tight text-yellow-400">food</span>
            </div>
            <p className={`text-[10px] font-semibold tracking-wide ${theme === 'dark' ? 'text-stone-400' : 'text-stone-500'}`}>
              delivery local
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleTheme?.()}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-all active:scale-95 ${
              theme === 'dark'
                ? 'border-stone-700 bg-stone-900 text-amber-300 hover:bg-stone-800'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            }`}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>

          {/* Botão de instalação — só aparece quando o app é instalável */}
          {showInstall && (
          <button
            onClick={handleInstall}
            disabled={installing}
            aria-label="Instalar aplicativo UaiFood"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-400/45 bg-linear-to-r from-red-600 to-red-500 text-white text-xs font-semibold hover:from-red-700 hover:to-red-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_10px_24px_-18px_rgba(239,68,68,0.9)]"
          >
            {installing ? <FiLoader size={14} className="animate-spin" /> : <FiDownload size={14} />}
            {installing ? 'Aguarde...' : 'Instalar App'}
          </button>
          )}
        </div>
      </div>
    </header>
  )
}
