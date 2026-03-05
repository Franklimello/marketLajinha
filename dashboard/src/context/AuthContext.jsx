import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithRedirect,
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
  const [account, setAccount] = useState(null)
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

  const registrarPushConta = useCallback(async (accountType = 'store') => {
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
        if (accountType === 'service') {
          await api.users.salvarFcmToken(fcmToken)
        } else {
          await api.usuarios.salvarFcmToken(fcmToken)
        }
      }
    } catch (e) {
      console.warn('Push loja registration failed:', e.message)
    }
  }, [messagingEnv])

  useEffect(() => {
    if (!messagingEnv) return undefined
    const unsub = messagingEnv.onMessage(messagingEnv.messaging, (payload) => {
      const safePayload = payload || {}
      const { title, body } = safePayload.notification || {}
      const data = safePayload.data || {}
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
      setLoading(true)
      setUser(firebaseUser)
      if (firebaseUser) {
        setLoja(null)
        setIsSuperAdmin(false)
        setAccount(null)
        let idToken = null
        try {
          idToken = await firebaseUser.getIdToken()
          // Evita corrida no primeiro request autenticado logo após login social.
          if (idToken) {
            setTokenGetter(async () => idToken)
            await createSessionCookie(idToken)
          }
        } catch {}

        let conta = null
        try {
          conta = await api.users.me()
          setAccount(conta)
        } catch {
          conta = { accountType: 'store', name: firebaseUser.displayName || firebaseUser.email || 'Usuário' }
          setAccount(conta)
        }

        const tipoConta = String(conta?.accountType || 'store')
        if (tipoConta === 'service') {
          registrarPushConta('service')
          setLoja(null)
          setIsSuperAdmin(false)
          setLoading(false)
          return
        }

        let minhaLoja = null
        try {
          minhaLoja = await api.lojas.minha()
          setLoja(minhaLoja)
          if (minhaLoja) registrarPushConta('store')
        } catch {
          setLoja(null)
        }

        // Verifica super admin mesmo quando há loja vinculada.
        // Um usuário pode ser lojista e super admin ao mesmo tempo.
        try {
          await api.admin.stats()
          setIsSuperAdmin(true)
        } catch {
          setIsSuperAdmin(false)
        }
      } else {
        setLoja(null)
        setIsSuperAdmin(false)
        setAccount(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [registrarPushConta])

  const login = (email, senha) =>
    signInWithEmailAndPassword(auth, email, senha)

  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      return { redirect: false }
    } catch (err) {
      const code = String(err?.code || '')
      const msg = String(err?.message || '')
      const deveUsarRedirect =
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        msg.toLowerCase().includes('cross-origin-opener-policy')

      if (deveUsarRedirect) {
        await signInWithRedirect(auth, googleProvider)
        return { redirect: true }
      }
      throw err
    }
  }

  const cadastrar = (email, senha) =>
    createUserWithEmailAndPassword(auth, email, senha)

  const logout = async () => {
    await clearSessionCookie().catch(() => {})
    return signOut(auth)
  }

  const atualizarLoja = (novaLoja) => setLoja(novaLoja)
  const accountType = String(account?.accountType || 'store')

  const registrarTipoConta = async (payload) => {
    const conta = await api.users.registerAccountType(payload)
    setAccount(conta)
    return conta
  }

  const atualizarConta = async (payload) => {
    const conta = await api.users.atualizarMe(payload)
    setAccount(conta)
    return conta
  }

  useEffect(() => {
    if (!user) return undefined
    const timer = setInterval(async () => {
      try {
        const refreshed = await user.getIdToken(true)
        setTokenGetter(async () => refreshed)
        await refreshSessionCookie(refreshed)
      } catch {}
    }, 1000 * 60 * 20)
    return () => clearInterval(timer)
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        loja,
        loading,
        login,
        loginGoogle,
        cadastrar,
        logout,
        atualizarLoja,
        isSuperAdmin,
        account,
        accountType,
        registrarTipoConta,
        atualizarConta,
      }}
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
