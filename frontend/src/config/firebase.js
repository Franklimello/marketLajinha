import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8",
  authDomain: "marcketlainha.firebaseapp.com",
  projectId: "marcketlainha",
  storageBucket: "marcketlainha.firebasestorage.app",
  messagingSenderId: "910649841875",
  appId: "1:910649841875:web:3ea1a73381a6914f56dc26",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

async function getMessagingCompat() {
  try {
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging')
    const messaging = getMessaging(app)
    return { messaging, getToken, onMessage }
  } catch {
    return null
  }
}

export { auth, onAuthStateChanged, googleProvider, getMessagingCompat }
