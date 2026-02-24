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
const SobrePage = lazy(() => import('../pages/sobre.jsx'))
const MotoboyLogin = lazy(() => import('../pages/motoboy/MotoboyLogin.jsx'))
const MotoboyPedidos = lazy(() => import('../pages/motoboy/MotoboyPedidos.jsx'))

function LojaFallback() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-4 animate-pulse">
      <div className="h-40 rounded-2xl mb-4 bg-stone-200" />
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-xl shrink-0 bg-stone-200" />
        <div className="flex-1 space-y-2">
          <div className="h-5 rounded w-2/3 bg-stone-200" />
          <div className="h-3 rounded w-1/2 bg-stone-200" />
        </div>
      </div>
      <div className="flex gap-2 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded-full flex-1 bg-stone-200" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-stone-100">
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-3/4 bg-stone-200" />
            <div className="h-3 rounded w-full bg-stone-200" />
            <div className="h-4 rounded w-1/3 bg-stone-200" />
          </div>
          <div className="w-16 h-16 rounded-lg shrink-0 bg-stone-200" />
        </div>
      ))}
    </div>
  )
}

function Lazy({ children, fallback = 'default' }) {
  const content = fallback === 'loja'
    ? <LojaFallback />
    : (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return (
    <Suspense fallback={content}>
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
      { path: '/loja/:slug', element: <Lazy fallback="loja"><LojaPage /></Lazy> },
      { path: '/busca', element: <Lazy><BuscaPage /></Lazy> },
      { path: '/pedidos', element: <Lazy><PedidosPage /></Lazy> },
      { path: '/perfil', element: <Lazy><PerfilPage /></Lazy> },
      { path: '/login', element: <Lazy><LoginPage /></Lazy> },
      { path: '/cadastro', element: <Lazy><CadastroPage /></Lazy> },
      { path: '/sobre', element: <Lazy><SobrePage /></Lazy> },
    ],
  },
  { path: '/motoboy', element: <Lazy><MotoboyLogin /></Lazy> },
  { path: '/motoboy/login', element: <Lazy><MotoboyLogin /></Lazy> },
  { path: '/motoboy/pedidos', element: <Lazy><MotoboyPedidos /></Lazy> },
])

export default router
