const IOS_DEVICE_REGEX = /iPad|iPhone|iPod/
const SAFARI_BROWSER_REGEX = /^((?!chrome|android).)*safari/i

export function isIOSDevice() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  return IOS_DEVICE_REGEX.test(navigator.userAgent) && !window.MSStream
}

export function isSafariBrowser() {
  if (typeof navigator === 'undefined') return false
  return SAFARI_BROWSER_REGEX.test(navigator.userAgent)
}

export function isIOSSafari() {
  return isIOSDevice() && isSafariBrowser()
}

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator?.standalone === true
  )
}

export function isSecureOriginForPush() {
  if (typeof window === 'undefined') return false
  const { protocol, hostname } = window.location
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  return protocol === 'https:' || isLocalhost
}

export function canUseWebPush({ requireStandalone = true } = {}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const hasApis =
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window

  if (!hasApis) return false
  if (!isSecureOriginForPush() || !window.isSecureContext) return false
  if (requireStandalone && !isStandaloneMode()) return false

  return true
}
