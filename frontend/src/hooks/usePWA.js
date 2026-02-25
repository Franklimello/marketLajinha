import { useState, useEffect, useCallback } from 'react'

// ── Detecção de iOS (Safari não dispara beforeinstallprompt) ──
const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream

// ── Verifica se já está instalado como PWA (modo standalone) ──
const isRunningStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

/**
 * SOLUÇÃO PARA O PROBLEMA DO BOTÃO SUMINDO:
 *
 * O evento `beforeinstallprompt` é disparado pelo navegador logo no
 * carregamento da página, muitas vezes ANTES do React montar qualquer
 * componente. Se ninguém estiver ouvindo nesse momento, o evento é perdido
 * e o botão nunca aparece.
 *
 * A correção é capturar o evento em uma variável global (`window.__pwaPrompt`)
 * o mais cedo possível. O hook então lê essa variável ao montar e continua
 * ouvindo novos eventos caso a página seja recarregada.
 */

// Captura o evento imediatamente, antes do React inicializar.
// Este listener é registrado na importação do módulo (tempo de execução do bundle).
if (typeof window !== 'undefined') {
  window.__pwaPrompt = window.__pwaPrompt || null

  window.addEventListener(
    'beforeinstallprompt',
    (e) => {
      // Impede que o mini-infobar nativo apareça no Chrome Android
      e.preventDefault()
      // Armazena o evento globalmente para o hook poder acessar depois
      window.__pwaPrompt = e
      // Dispara um evento customizado para que hooks já montados sejam notificados
      window.dispatchEvent(new Event('pwa:promptready'))
    },
    { once: false }
  )
}

export function usePWA() {
  // Estado que guarda o evento deferido (necessário para chamar .prompt())
  // Lazy initializer: lê window.__pwaPrompt na montagem, capturando eventos
  // que chegaram ANTES do React inicializar (resolve a race condition).
  const [deferredPrompt, setDeferredPrompt] = useState(
    () => window.__pwaPrompt ?? null
  )

  // true quando o app pode ser instalado.
  // Inicializado como lazy também: se já há prompt global, começa como true.
  const [canInstall, setCanInstall] = useState(
    () => Boolean(window.__pwaPrompt)
  )

  // true quando o app já está instalado (rodando em modo standalone)
  const [installed, setInstalled] = useState(isRunningStandalone)

  // true quando é iOS — exibe guia manual em vez do prompt nativo
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  // true quando há uma nova versão do SW esperando para ativar
  const [updateAvailable, setUpdateAvailable] = useState(false)

  // Referência ao SW em estado "waiting" para podermos ativá-lo
  const [waitingWorker, setWaitingWorker] = useState(null)

  // ── Efeito principal: registra listeners de eventos de instalação ──
  // Os estados deferredPrompt e canInstall já foram inicializados via lazy
  // initializer, então não precisamos de setState síncrono no body do effect.
  useEffect(() => {
    // Se já está instalado (standalone), não precisa registrar listeners
    if (installed) return

    // Ouve novos eventos (ex.: depois de uma rejeição, o navegador pode
    // disparar novamente em sessões futuras)
    function onBeforeInstall(e) {
      e.preventDefault()
      window.__pwaPrompt = e
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    // Evento customizado disparado pelo listener global acima
    function onPromptReady() {
      if (window.__pwaPrompt) {
        setDeferredPrompt(window.__pwaPrompt)
        setCanInstall(true)
      }
    }

    // Quando o usuário aceita instalar, o navegador dispara 'appinstalled'
    function onAppInstalled() {
      setInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
      window.__pwaPrompt = null
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('pwa:promptready', onPromptReady)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('pwa:promptready', onPromptReady)
      window.removeEventListener('appinstalled', onAppInstalled)
    }

  }, [installed])

  // ── Efeito secundário: detecta atualização de Service Worker ──
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return

      // Se já há um SW esperando ao montar, notifica imediatamente
      if (reg.waiting) {
        setUpdateAvailable(true)
        setWaitingWorker(reg.waiting)
      }

      // Observa quando um novo SW termina de instalar
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          // "installed" + controller ativo = nova versão pronta para uso
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
            setWaitingWorker(sw)
          }
        })
      })
    })

    // Quando o SW em waiting assume o controle, recarrega a página
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  // ── Aciona o prompt nativo de instalação ──
  const promptInstall = useCallback(async () => {
    // iOS não tem suporte ao prompt nativo — exibe o guia manual
    if (isIOSDevice()) {
      setShowIOSGuide(true)
      return 'ios'
    }

    if (!deferredPrompt) return 'unavailable'

    // Exibe o prompt nativo do navegador
    deferredPrompt.prompt()

    // Aguarda a escolha do usuário (accepted ou dismissed)
    const { outcome } = await deferredPrompt.userChoice

    // Após o uso, o prompt não pode mais ser reutilizado
    setDeferredPrompt(null)
    setCanInstall(false)
    window.__pwaPrompt = null

    return outcome // 'accepted' | 'dismissed'
  }, [deferredPrompt])

  // ── Fecha o guia iOS ──
  const dismissIOSGuide = useCallback(() => {
    setShowIOSGuide(false)
  }, [])

  // ── Aplica a atualização do SW: pede para ele pular a fase de espera ──
  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [waitingWorker])

  return {
    // true quando o botão de instalação deve aparecer
    canInstall: canInstall && !installed,
    installed,
    isIOS: isIOSDevice(),
    isStandalone: isRunningStandalone(),
    showIOSGuide,
    updateAvailable,
    promptInstall,
    dismissIOSGuide,
    applyUpdate,
  }
}
