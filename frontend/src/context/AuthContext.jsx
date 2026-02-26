import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { auth, onAuthStateChanged, getMessagingCompat } from '../config/firebase'
import { signOut } from 'firebase/auth'
import { createSessionCookie, clearSessionCookie, refreshSessionCookie } from '../storage/authStorage'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

const AuthContext = createContext(null)

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`)
  return data
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined)
  const [cliente, setCliente] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [token, setToken] = useState(null)
  const [pedidosAtivos, setPedidosAtivos] = useState(0)
  const [messagingEnv, setMessagingEnv] = useState(null)

  // Ref para evitar registrar push múltiplas vezes na mesma sessão
  const pushRegistered = useRef(false)

  async function contarPedidosAtivos(t) {
    try {
      const pedidos = await apiFetch('/pedidos/meus', t)
      const ativos = (pedidos || []).filter(
        (p) => p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'IN_ROUTE'
      )
      setPedidosAtivos(ativos.length)
    } catch { setPedidosAtivos(0) }
  }

  async function getToken() {
    if (firebaseUser) return firebaseUser.getIdToken()
    return null
  }

  async function cadastrarCliente(nome, telefone) {
    const t = await getToken()
    const c = await apiFetch('/clientes/cadastro', t, {
      method: 'POST',
      body: JSON.stringify({ nome, telefone }),
    })
    setCliente(c)
    return c
  }

  async function atualizarPerfil(dados) {
    const t = await getToken()
    const c = await apiFetch('/clientes/me', t, {
      method: 'PUT',
      body: JSON.stringify(dados),
    })
    setCliente(c)
    return c
  }

  async function recarregarCliente() {
    const t = await getToken()
    if (!t) return
    try {
      const c = await apiFetch('/clientes/me', t)
      setCliente(c)
    } catch { setCliente(null) }
  }

  // ── registrarPush declarado antes dos useEffects que o chamam ──────────────
  const registrarPush = useCallback(async (authToken) => {
    if (!messagingEnv || !authToken || !('serviceWorker' in navigator) || !('Notification' in window)) return
    if (pushRegistered.current) return
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      // O FCM SDK encontra e registra /firebase-messaging-sw.js automaticamente.
      // NÃO registramos manualmente pois isso criaria um segundo SW competindo
      // com o sw.js principal no mesmo scope '/', causando reload infinito.
      const fcmToken = await messagingEnv.getToken(messagingEnv.messaging, {
        vapidKey: VAPID_KEY,
      })
      if (fcmToken) {
        await apiFetch('/clientes/me/fcm-token', authToken, {
          method: 'POST',
          body: JSON.stringify({ token: fcmToken }),
        })
        pushRegistered.current = true
      }
    } catch (e) {
      console.warn('Push registration failed:', e.message)
    }
  }, [messagingEnv])

  // ── Carrega o Firebase Messaging de forma assíncrona ──────────────────────
  useEffect(() => {
    getMessagingCompat().then((mod) => setMessagingEnv(mod || null))
  }, [])

  // Se o messagingEnv carregou DEPOIS do onAuthStateChanged (race condition),
  // re-tenta o registro de push com o token e cliente já disponíveis.
  // Reseta o flag para forçar novo token caso o SW anterior fosse incorreto.
  useEffect(() => {
    if (!messagingEnv || !token || !cliente) return
    pushRegistered.current = false
    registrarPush(token)
  }, [messagingEnv, token, cliente, registrarPush])

  // ── Auth state ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user || null)
      if (user) {
        const t = await user.getIdToken()
        setToken(t)
        createSessionCookie(t).catch(() => { })
        try {
          const c = await apiFetch('/clientes/me', t)
          setCliente(c)
          if (c) {
            // messagingEnv pode ainda ser null aqui; o useEffect acima cobre esse caso
            registrarPush(t)
            contarPedidosAtivos(t)
          }
        } catch {
          setCliente(null)
        }
      } else {
        setToken(null)
        setCliente(null)
        setPedidosAtivos(0)
        pushRegistered.current = false
      }
      setCarregando(false)
    })
    return unsub
  }, [registrarPush])

  // ── Foreground messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!messagingEnv) return undefined
    const unsub = messagingEnv.onMessage(messagingEnv.messaging, (payload) => {
      const { title, body } = payload.notification || {}
      if (Notification.permission === 'granted') {
        new Notification(title || 'UaiFood', {
          body: body || '',
          icon: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
        })
      }
    })
    return () => unsub?.()
  }, [messagingEnv])

  async function logout() {
    await clearSessionCookie().catch(() => { })
    await signOut(auth)
    setCliente(null)
    setToken(null)
    pushRegistered.current = false
  }

  useEffect(() => {
    if (!firebaseUser) return undefined
    const timer = setInterval(async () => {
      try {
        const refreshed = await firebaseUser.getIdToken(true)
        await refreshSessionCookie(refreshed)
      } catch {
        // noop
      }
    }, 1000 * 60 * 20)
    return () => clearInterval(timer)
  }, [firebaseUser])

  const value = useMemo(() => ({
    firebaseUser, cliente, carregando, token, getToken,
    cadastrarCliente, atualizarPerfil, recarregarCliente, logout, registrarPush,
    logado: !!firebaseUser,
    perfilCompleto: !!cliente,
    pedidosAtivos, setPedidosAtivos,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [firebaseUser, cliente, carregando, token, pedidosAtivos, registrarPush])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
