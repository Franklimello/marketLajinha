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

  return {
    canInstall: canInstall && !installed,
    installed,
    isIOS: isIOS(),
    isStandalone: isStandalone(),
    showIOSGuide,
    promptInstall,
    dismissIOSGuide,
  }
}
