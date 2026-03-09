import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8",
  authDomain: "marcketlainha.firebaseapp.com",
  projectId: "marcketlainha",
  storageBucket: "marcketlainha.firebasestorage.app",
  messagingSenderId: "910649841875",
  appId: "1:910649841875:web:3ea1a73381a6914f56dc26",
  measurementId: "G-QJ6RRF830R",
}

const FIREBASE_APP_NAME = 'marcket-frontend'

const app = getApps().some((existingApp) => existingApp.name === FIREBASE_APP_NAME)
  ? getApp(FIREBASE_APP_NAME)
  : initializeApp(firebaseConfig, FIREBASE_APP_NAME)
const auth = getAuth(app)
const storage = getStorage(app)
const googleProvider = new GoogleAuthProvider()
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

async function getAnalyticsCompat() {
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

export { auth, onAuthStateChanged, googleProvider, getMessagingCompat, getAnalyticsCompat }

export async function uploadArquivoChat(file, path) {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' })
  return getDownloadURL(storageRef)
}
