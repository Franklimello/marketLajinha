import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import router from './routes/routes.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function safeReloadFromChunkError() {
  try {
    const key = 'app:chunk-reload-at'
    const now = Date.now()
    const last = Number(sessionStorage.getItem(key) || 0)
    if (now - last < 10_000) return
    sessionStorage.setItem(key, String(now))
    window.location.reload()
  } catch {
    window.location.reload()
  }
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  safeReloadFromChunkError()
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  const message = String(reason?.message || reason || '')
  const isChunkError = message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('Loading chunk')
    || message.includes('ChunkLoadError')

  if (!isChunkError) return
  event.preventDefault()
  safeReloadFromChunkError()
})

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onRegisterError(error) {
    console.warn('SW registration failed:', error?.message ?? error)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
