import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider, messaging, getFcmToken, onMessage } from '../config/firebase'
import { api, setTokenGetter } from '../api/client'

const AuthContext = createContext(null)
const VAPID_KEY = 'BCRFH6ED5f585HBRYI1xT6Z_qcf8dzmD2ExUlVLkjIBOO8xsLT_n828jXPyR1vwc8DjcBe8PvFM_UQsaCxoHorU'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loja, setLoja] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    setTokenGetter(async () => {
      const u = auth.currentUser
      return u ? u.getIdToken() : null
    })
  }, [])

  const registrarPushLoja = useCallback(async () => {
    if (!messaging || !('serviceWorker' in navigator) || !('Notification' in window)) return
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      if (!reg.active) {
        await new Promise((resolve) => {
          const sw = reg.installing || reg.waiting
          if (!sw) return resolve()
          sw.addEventListener('statechange', function handler() {
            if (sw.state === 'activated') { sw.removeEventListener('statechange', handler); resolve() }
          })
        })
      }

      const fcmToken = await getFcmToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
      if (fcmToken) {
        await api.usuarios.salvarFcmToken(fcmToken)
      }
    } catch (e) {
      console.warn('Push loja registration failed:', e.message)
    }
  }, [])

  useEffect(() => {
    if (!messaging) return
    const unsub = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {}
      if (Notification.permission === 'granted') {
        new Notification(title || 'MarketLajinha', {
          body: body || '',
          icon: '/vite.svg',
          vibrate: [300, 100, 300, 100, 300],
        })
      }
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const minhaLoja = await api.lojas.minha()
          setLoja(minhaLoja)
          if (minhaLoja) registrarPushLoja()
        } catch {
          setLoja(null)
        }
        try {
          await api.admin.stats()
          setIsSuperAdmin(true)
        } catch {
          setIsSuperAdmin(false)
        }
      } else {
        setLoja(null)
        setIsSuperAdmin(false)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [registrarPushLoja])

  const login = (email, senha) =>
    signInWithEmailAndPassword(auth, email, senha)

  const loginGoogle = () => signInWithPopup(auth, googleProvider)

  const cadastrar = (email, senha) =>
    createUserWithEmailAndPassword(auth, email, senha)

  const logout = () => signOut(auth)

  const atualizarLoja = (novaLoja) => setLoja(novaLoja)

  return (
    <AuthContext.Provider
      value={{ user, loja, loading, login, loginGoogle, cadastrar, logout, atualizarLoja, isSuperAdmin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
