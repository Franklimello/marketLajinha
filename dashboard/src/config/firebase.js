import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import imageCompression from 'browser-image-compression'

const firebaseConfig = {
  apiKey: 'AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8',
  authDomain: 'marcketlainha.firebaseapp.com',
  projectId: 'marcketlainha',
  storageBucket: 'marcketlainha.firebasestorage.app',
  messagingSenderId: '910649841875',
  appId: '1:910649841875:web:3ea1a73381a6914f56dc26',
  measurementId: 'G-QJ6RRF830R',
}

const FIREBASE_APP_NAME = 'marcket-dashboard'

const app = getApps().some((existingApp) => existingApp.name === FIREBASE_APP_NAME)
  ? getApp(FIREBASE_APP_NAME)
  : initializeApp(firebaseConfig, FIREBASE_APP_NAME)
export const auth = getAuth(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
let analytics = null

async function getMessagingCompat() {
  try {
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging')
    const messaging = getMessaging(app)
    return { messaging, getToken, onMessage }
  } catch {
    return null
  }
}
export { getMessagingCompat }

export async function getAnalyticsCompat() {
  if (typeof window === 'undefined') return null
  if (analytics) return analytics
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    const supported = await isSupported()
    if (!supported) return null
    analytics = getAnalytics(app)
    return analytics
  } catch {
    return null
  }
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp',
}

const LOGO_OPTIONS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 512,
  useWebWorker: true,
  fileType: 'image/webp',
}

/**
 * Comprime e faz upload de uma imagem para o Firebase Storage.
 * Converte automaticamente para WebP, redimensiona e comprime.
 * @param {File} file
 * @param {string} path - ex: "lojas/cuid123/logo.webp"
 * @param {{ isLogo?: boolean }} opts
 * @returns {Promise<string>} download URL
 */
export async function uploadImagem(file, path, opts = {}) {
  const options = opts.isLogo ? LOGO_OPTIONS : COMPRESSION_OPTIONS
  let compressed = file
  try {
    compressed = await imageCompression(file, options)
  } catch {
    console.warn('[Upload] Compressão falhou, usando original.')
  }
  const webpPath = path.replace(/\.[^.]+$/, '.webp')
  const storageRef = ref(storage, webpPath)
  await uploadBytes(storageRef, compressed)
  return getDownloadURL(storageRef)
}

export async function uploadArquivoChat(file, path) {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' })
  return getDownloadURL(storageRef)
}
