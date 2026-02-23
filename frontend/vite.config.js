import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/messaging'],
          'vendor-icons': ['react-icons/fi', 'react-icons/fa'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
    target: 'es2020',
    cssMinify: 'lightningcss',
  },
})
