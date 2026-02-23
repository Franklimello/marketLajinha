import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { auth, onAuthStateChanged, messaging, getFcmToken, onMessage } from '../config/firebase'
import { signOut } from 'firebase/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

const AuthContext = createContext(null)

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
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

  async function contarPedidosAtivos(t) {
    try {
      const pedidos = await apiFetch('/pedidos/meus', t)
      const ativos = (pedidos || []).filter(
        (p) => p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'IN_ROUTE'
      )
      setPedidosAtivos(ativos.length)
    } catch { setPedidosAtivos(0) }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user || null)
      if (user) {
        const t = await user.getIdToken()
        setToken(t)
        try {
          const c = await apiFetch('/clientes/me', t)
          setCliente(c)
          if (c) {
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
      }
      setCarregando(false)
    })
    return unsub
  }, [])

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

  const registrarPush = useCallback(async (authToken) => {
    if (!messaging || !authToken || !('serviceWorker' in navigator) || !('Notification' in window)) return
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

      const fcmToken = await getFcmToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: reg,
      })
      if (fcmToken) {
        await apiFetch('/clientes/me/fcm-token', authToken, {
          method: 'POST',
          body: JSON.stringify({ token: fcmToken }),
        })
      }
    } catch (e) {
      console.warn('Push registration failed:', e.message)
    }
  }, [])

  useEffect(() => {
    if (!messaging) return
    const unsub = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {}
      if (Notification.permission === 'granted') {
        new Notification(title || 'UaiFood', {
          body: body || '',
          icon: '/vite.svg',
          vibrate: [200, 100, 200],
        })
      }
    })
    return () => unsub?.()
  }, [])

  async function logout() {
    await signOut(auth)
    setCliente(null)
    setToken(null)
  }

  const value = useMemo(() => ({
    firebaseUser, cliente, carregando, token, getToken,
    cadastrarCliente, atualizarPerfil, recarregarCliente, logout, registrarPush,
    logado: !!firebaseUser,
    perfilCompleto: !!cliente,
    pedidosAtivos, setPedidosAtivos,
  }), [firebaseUser, cliente, carregando, token, pedidosAtivos])

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
