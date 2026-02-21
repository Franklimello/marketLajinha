import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getMessaging, getToken as getFcmToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8',
  authDomain: 'marcketlainha.firebaseapp.com',
  projectId: 'marcketlainha',
  storageBucket: 'marcketlainha.firebasestorage.app',
  messagingSenderId: '910649841875',
  appId: '1:910649841875:web:3ea1a73381a6914f56dc26',
  measurementId: 'G-QJ6RRF830R',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

let messaging = null
try { messaging = getMessaging(app) } catch { /* browser sem suporte */ }
export { messaging, getFcmToken, onMessage }

/**
 * Faz upload de um arquivo para o Firebase Storage e retorna a URL pública.
 * @param {File} file
 * @param {string} path - ex: "lojas/cuid123/logo.jpg"
 * @returns {Promise<string>} download URL
 */
export async function uploadImagem(file, path) {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
