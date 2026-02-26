import { useState, useEffect, useCallback } from 'react'
import { getItem as getLocalItem, setItem as setLocalItem } from '../storage/localStorageService'
import { isIOSSafari, isStandaloneMode } from '../utils/pwaEnvironment'

const IOS_GUIDE_DISMISSED_KEY = 'pwa:ios-install-guide:dismissed:v1'

// ── Captura global do prompt (resolve a race condition) ──────────────────────
//
// O evento `beforeinstallprompt` é disparado pelo navegador logo no
// carregamento da página — muitas vezes ANTES do React montar qualquer
// componente. Se ninguém estiver ouvindo nessa janela de tempo, o evento
// é perdido e o botão de instalação nunca aparece.
//
// A solução: registrar um listener assim que este módulo é importado
// (antes do React renderizar qualquer coisa) e guardar o evento em
// window.__pwaPrompt. O hook lê essa variável no useState lazy initializer.

if (typeof window !== 'undefined') {
  // Garante que a flag exista mesmo se o hook montar antes do evento
  window.__pwaPrompt = window.__pwaPrompt ?? null

  window.addEventListener(
    'beforeinstallprompt',
    (e) => {
      // Impede o mini-infobar nativo do Chrome Android de aparecer.
      // O app exibirá o botão personalizado no lugar.
      e.preventDefault()
      window.__pwaPrompt = e
      // Notifica hooks já montados (ex.: se o evento re-disparar)
      window.dispatchEvent(new Event('pwa:promptready'))
    },
    { once: false }
  )
}

// ── Hook principal ───────────────────────────────────────────────────────────

export function usePWA() {
  // Lazy initializers: leem o estado do mundo no momento da montagem,
  // sem precisar de setState síncrono dentro de useEffect (evita lint).
  const [deferredPrompt, setDeferredPrompt] = useState(
    () => (typeof window !== 'undefined' ? window.__pwaPrompt ?? null : null) // prompt já capturado globalmente
  )
  const [canInstall, setCanInstall] = useState(
    () => (typeof window !== 'undefined' ? Boolean(window.__pwaPrompt) : false) // true se há prompt disponível
  )
  const [installed, setInstalled] = useState(isStandaloneMode) // já é PWA?
  const [isIOS, setIsIOS] = useState(isIOSSafari) // iOS Safari?
  const [showIOSGuide, setShowIOSGuide] = useState(false)          // guia manual iOS
  const [updateAvailable, setUpdateAvailable] = useState(false)    // nova versão do SW
  const [waitingWorker, setWaitingWorker] = useState(null)         // SW esperando

  // ── Efeito 1: listeners de instalação ──────────────────────────────────────
  useEffect(() => {
    // Atualiza flag de ambiente iOS Safari na montagem
    setIsIOS(isIOSSafari())

    // Se já está instalado, não precisa ouvir eventos de instalação
    if (installed) return

    // Ouve novos eventos beforeinstallprompt (ex.: sessões futuras após rejeição)
    function onBeforeInstall(e) {
      e.preventDefault()
      window.__pwaPrompt = e
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    // Evento customizado: o listener global (topo do arquivo) avisa hooks montados
    function onPromptReady() {
      if (window.__pwaPrompt) {
        setDeferredPrompt(window.__pwaPrompt)
        setCanInstall(true)
      }
    }

    // O navegador dispara 'appinstalled' quando o usuário aceita instalar
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

  // ── Efeito 1.1: guia de instalação manual no Safari iOS ───────────────────
  useEffect(() => {
    if (!isIOS || installed) {
      setShowIOSGuide(false)
      return
    }

    // Exibe o modal somente no Safari iOS não instalado e se usuário ainda
    // não tiver dispensado o guia.
    const dismissed = getLocalItem(IOS_GUIDE_DISMISSED_KEY, false) === true
    if (!dismissed) setShowIOSGuide(true)
  }, [isIOS, installed])

  // ── Efeito 2: detecta atualização de Service Worker ───────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return

      // SW já estava esperando quando o hook montou
      if (reg.waiting) {
        setUpdateAvailable(true)
        setWaitingWorker(reg.waiting)
      }

      // Observa instalações futuras de novo SW
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          // "installed" + controller ativo = nova versão pronta, aguardando ativação
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
            setWaitingWorker(sw)
          }
        })
      })
    })

    // Quando o SW em waiting assume o controle, recarrega a página suavemente
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  // ── Aciona o prompt nativo de instalação ──────────────────────────────────
  const promptInstall = useCallback(async () => {
    // iOS não suporta o prompt nativo — exibe guia "Add to Home Screen"
    if (isIOS) {
      setShowIOSGuide(true)
      return 'ios'
    }

    if (!deferredPrompt) return 'unavailable'

    // Exibe o diálogo nativo do navegador
    deferredPrompt.prompt()

    // Aguarda a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice

    // Após o uso, o prompt não pode ser reutilizado — limpa o estado
    setDeferredPrompt(null)
    setCanInstall(false)
    window.__pwaPrompt = null

    return outcome // 'accepted' | 'dismissed'
  }, [deferredPrompt, isIOS])

  /** Fecha o guia de instalação iOS */
  const dismissIOSGuide = useCallback(() => {
    setShowIOSGuide(false)
    setLocalItem(IOS_GUIDE_DISMISSED_KEY, true)
  }, [])

  /** Envia SKIP_WAITING ao SW que está aguardando ativação */
  const applyUpdate = useCallback(() => {
    setUpdateAvailable(false)
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }, [waitingWorker])

  /** Fecha o banner de atualização sem recarregar */
  const dismissUpdate = useCallback(() => setUpdateAvailable(false), [])

  return {
    canInstall: canInstall && !installed,  // mostra botão só se instalável
    installed,
    isIOS,
    isStandalone: isStandaloneMode(),
    showIOSGuide,
    updateAvailable,
    promptInstall,
    dismissIOSGuide,
    applyUpdate,
    dismissUpdate,
  }
}
