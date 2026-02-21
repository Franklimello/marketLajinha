import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './componentes/header'
import Footer from './componentes/footer'
import InstallPrompt from './componentes/InstallPrompt'
import { useAuth } from './context/AuthContext'
import { setTokenGetter } from './api/client'

export default function App() {
  const { getToken } = useAuth()

  useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 pb-20">
        <Outlet />
      </main>
      <Footer />
      <InstallPrompt />
    </div>
  )
}
