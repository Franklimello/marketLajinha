import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { getAnalyticsCompat } from './config/firebase'
import Login from './pages/Login'
import CadastroLoja from './pages/CadastroLoja'
import DashLayout from './components/DashLayout'
import Dashboard from './pages/Dashboard'
import MinhaLoja from './pages/MinhaLoja'
import Produtos from './pages/Produtos'
import Pedidos from './pages/Pedidos'
import PedidoDetalhe from './pages/PedidoDetalhe'
import Configuracoes from './pages/Configuracoes'
import Bairros from './pages/Bairros'
import Impressoras from './pages/Impressoras'
import AdminSistema from './pages/AdminSistema'
import Cupons from './pages/Cupons'
import Motoboys from './pages/Motoboys'
import Combos from './pages/Combos'
import Promocoes from './pages/Promocoes'
import Stories from './pages/Stories'
import Posts from './pages/Posts'

function AnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const analytics = await getAnalyticsCompat()
      if (!analytics || !ativo) return
      try {
        const { logEvent } = await import('firebase/analytics')
        if (!ativo) return
        logEvent(analytics, 'page_view', {
          page_path: location.pathname,
          page_location: window.location.href,
          page_title: document.title,
        })
      } catch {
        // noop
      }
    })()
    return () => {
      ativo = false
    }
  }, [location.pathname])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<CadastroLoja />} />
          <Route path="/cadastro-loja" element={<CadastroLoja />} />

          <Route element={<DashLayout />}>
            <Route path="/" element={<Navigate to="/pedidos" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/minha-loja" element={<MinhaLoja />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
            <Route path="/bairros" element={<Bairros />} />
            <Route path="/impressoras" element={<Impressoras />} />
            <Route path="/cupons" element={<Cupons />} />
            <Route path="/promocoes" element={<Promocoes />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/motoboys" element={<Motoboys />} />
            <Route path="/combos" element={<Combos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/admin" element={<AdminSistema />} />
          </Route>

          <Route path="*" element={<Navigate to="/pedidos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
