import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import App from '../App.jsx'
import HomePage from '../pages/home.jsx'

const LojaPage = lazy(() => import('../pages/loja.jsx'))
const BuscaPage = lazy(() => import('../pages/busca.jsx'))
const PedidosPage = lazy(() => import('../pages/pedidos.jsx'))
const PerfilPage = lazy(() => import('../pages/perfil.jsx'))
const LoginPage = lazy(() => import('../pages/login.jsx'))
const CadastroPage = lazy(() => import('../pages/cadastro.jsx'))
const MotoboyLogin = lazy(() => import('../pages/motoboy/MotoboyLogin.jsx'))
const MotoboyPedidos = lazy(() => import('../pages/motoboy/MotoboyPedidos.jsx'))

function Lazy({ children }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/loja/:slug', element: <Lazy><LojaPage /></Lazy> },
      { path: '/busca', element: <Lazy><BuscaPage /></Lazy> },
      { path: '/pedidos', element: <Lazy><PedidosPage /></Lazy> },
      { path: '/perfil', element: <Lazy><PerfilPage /></Lazy> },
      { path: '/login', element: <Lazy><LoginPage /></Lazy> },
      { path: '/cadastro', element: <Lazy><CadastroPage /></Lazy> },
    ],
  },
  { path: '/motoboy', element: <Lazy><MotoboyLogin /></Lazy> },
  { path: '/motoboy/login', element: <Lazy><MotoboyLogin /></Lazy> },
  { path: '/motoboy/pedidos', element: <Lazy><MotoboyPedidos /></Lazy> },
])

export default router
