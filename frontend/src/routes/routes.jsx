import { createBrowserRouter } from 'react-router-dom'
import App from '../App.jsx'
import HomePage from '../pages/home.jsx'
import LojaPage from '../pages/loja.jsx'
import BuscaPage from '../pages/busca.jsx'
import PedidosPage from '../pages/pedidos.jsx'
import PerfilPage from '../pages/perfil.jsx'
import LoginPage from '../pages/login.jsx'
import CadastroPage from '../pages/cadastro.jsx'
import MotoboyLogin from '../pages/motoboy/MotoboyLogin.jsx'
import MotoboyPedidos from '../pages/motoboy/MotoboyPedidos.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/loja/:slug', element: <LojaPage /> },
      { path: '/busca', element: <BuscaPage /> },
      { path: '/pedidos', element: <PedidosPage /> },
      { path: '/perfil', element: <PerfilPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/cadastro', element: <CadastroPage /> },
    ],
  },
  { path: '/motoboy', element: <MotoboyLogin /> },
  { path: '/motoboy/login', element: <MotoboyLogin /> },
  { path: '/motoboy/pedidos', element: <MotoboyPedidos /> },
])

export default router
