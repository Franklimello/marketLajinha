import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { api, setTokenGetter } from '../api/client'

const AuthContext = createContext(null)

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const minhaLoja = await api.lojas.minha()
          setLoja(minhaLoja)
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
  }, [])

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
