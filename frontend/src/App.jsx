import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './componentes/header'
import Footer from './componentes/footer'
import InstallPrompt from './componentes/InstallPrompt'
import { useAuth } from './context/AuthContext'
import { setTokenGetter } from './api/client'
import { getItem as getLocalItem, setItem as setLocalItem } from './storage/localStorageService'

export default function App() {
  const { getToken } = useAuth()

  useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])

  useEffect(() => {
    const savedTheme = getLocalItem('theme', null)
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
    setLocalItem('theme', initialTheme)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-20">
        <Outlet />
      </main>
      <Footer />
      <InstallPrompt />
    </div>
  )
}
