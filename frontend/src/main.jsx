import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import router from './routes/routes.jsx'

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('SW registration failed:', error?.message ?? error)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
