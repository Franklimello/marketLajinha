import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider, getMessagingCompat } from '../config/firebase'
import { api, setTokenGetter } from '../api/client'
import { createSessionCookie, clearSessionCookie, refreshSessionCookie } from '../storage/authStorage'

const AuthContext = createContext(null)
const VAPID_KEY = 'BCRFH6ED5f585HBRYI1xT6Z_qcf8dzmD2ExUlVLkjIBOO8xsLT_n828jXPyR1vwc8DjcBe8PvFM_UQsaCxoHorU'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loja, setLoja] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [messagingEnv, setMessagingEnv] = useState(null)

  useEffect(() => {
    setTokenGetter(async () => {
      const u = auth.currentUser
      return u ? u.getIdToken() : null
    })
  }, [])

  useEffect(() => {
    getMessagingCompat().then((mod) => setMessagingEnv(mod || null))
  }, [])

  const registrarPushLoja = useCallback(async () => {
    if (!messagingEnv || !('serviceWorker' in navigator) || !('Notification' in window)) return
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

      const fcmToken = await messagingEnv.getToken(messagingEnv.messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
      if (fcmToken) {
        await api.usuarios.salvarFcmToken(fcmToken)
      }
    } catch (e) {
      console.warn('Push loja registration failed:', e.message)
    }
  }, [messagingEnv])

  useEffect(() => {
    if (!messagingEnv) return undefined
    const unsub = messagingEnv.onMessage(messagingEnv.messaging, (payload) => {
      const { title, body } = payload.notification || {}
      const data = payload.data || {}
      if (Notification.permission === 'granted') {
        const n = new Notification(title || 'MarketLajinha', {
          body: body || '',
          icon: '/vite.svg',
          vibrate: [300, 100, 300, 100, 300],
        })
        const targetUrl = data.url || '/pedidos'
        n.onclick = () => {
          window.focus()
          if (targetUrl) window.location.href = targetUrl
        }
      }
    })
    return () => unsub?.()
  }, [messagingEnv])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken()
          await createSessionCookie(idToken)
        } catch {}
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

  const logout = async () => {
    await clearSessionCookie().catch(() => {})
    return signOut(auth)
  }

  const atualizarLoja = (novaLoja) => setLoja(novaLoja)

  useEffect(() => {
    if (!user) return undefined
    const timer = setInterval(async () => {
      try {
        const refreshed = await user.getIdToken(true)
        await refreshSessionCookie(refreshed)
      } catch {}
    }, 1000 * 60 * 20)
    return () => clearInterval(timer)
  }, [user])

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
