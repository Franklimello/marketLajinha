import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase-core': ['firebase/app', 'firebase/auth', 'firebase/storage'],
          'vendor-firebase-messaging': ['firebase/messaging'],
          'vendor-icons': ['react-icons/fi', 'react-icons/fa'],
        },
      },
    },
    target: 'es2020',
    cssMinify: 'lightningcss',
  },
})
