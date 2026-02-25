import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase-core': ['firebase/app', 'firebase/auth'],
          'vendor-firebase-messaging': ['firebase/messaging'],
          'vendor-icons': ['react-icons/fi', 'react-icons/fa'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
    target: 'es2020',
    cssMinify: 'lightningcss',
  },
})
