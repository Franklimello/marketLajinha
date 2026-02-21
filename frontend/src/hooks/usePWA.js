import { useState, useEffect, useCallback } from 'react'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState(null)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    function onAppInstalled() {
      setInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return

      function onUpdate(reg) {
        if (reg.waiting) {
          setUpdateAvailable(true)
          setWaitingWorker(reg.waiting)
        }
      }

      if (reg.waiting) onUpdate(reg)

      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            onUpdate(reg)
          }
        })
      })
    })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  const promptInstall = useCallback(async () => {
    if (isIOS()) {
      setShowIOSGuide(true)
      return 'ios'
    }

    if (!deferredPrompt) return 'unavailable'

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setCanInstall(false)
    return outcome
  }, [deferredPrompt])

  const dismissIOSGuide = useCallback(() => {
    setShowIOSGuide(false)
  }, [])

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [waitingWorker])

  return {
    canInstall: canInstall && !installed,
    installed,
    isIOS: isIOS(),
    isStandalone: isStandalone(),
    showIOSGuide,
    updateAvailable,
    promptInstall,
    dismissIOSGuide,
    applyUpdate,
  }
}
