import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth'
import { getMessaging, getToken as getFcmToken, onMessage } from 'firebase/messaging'

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

let messaging = null
try {
  messaging = getMessaging(app)
} catch (e) {
  console.warn('Firebase Messaging não suportado neste navegador.')
}

export { auth, onAuthStateChanged, googleProvider, messaging, getFcmToken, onMessage }
