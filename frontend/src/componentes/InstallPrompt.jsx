import { FiX, FiShare, FiPlusSquare } from 'react-icons/fi'
import { usePWA } from '../hooks/usePWA'

function IOSGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-900">Instalar UaiFood</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <FiX size={20} />
          </button>
        </div>

        <p className="text-sm text-stone-600 mb-5">
          Para instalar no seu iPhone/iPad, siga os passos:
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-red-700">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800">Toque no botão Compartilhar</p>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                O ícone <FiShare className="inline" size={14} /> na barra do Safari
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-red-700">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800">Adicionar à Tela de Início</p>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                Toque em <FiPlusSquare className="inline" size={14} /> "Tela de Início"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-red-700">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800">Confirme tocando "Adicionar"</p>
              <p className="text-xs text-stone-500 mt-0.5">O app vai aparecer na sua tela inicial</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

function UpdateBanner({ onUpdate }) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9998] sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-stone-900 text-white rounded-xl p-4 flex items-center gap-3 shadow-xl">
        <div className="flex-1">
          <p className="text-sm font-medium">Nova versão disponível</p>
          <p className="text-xs text-stone-400">Atualize para a versão mais recente</p>
        </div>
        <button
          onClick={onUpdate}
          className="px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex-shrink-0"
        >
          Atualizar
        </button>
      </div>
    </div>
  )
}

export default function InstallPrompt() {
  const { showIOSGuide, updateAvailable, dismissIOSGuide, applyUpdate } = usePWA()

  if (showIOSGuide) return <IOSGuideModal onClose={dismissIOSGuide} />
  if (updateAvailable) return <UpdateBanner onUpdate={applyUpdate} />
  return null
}
