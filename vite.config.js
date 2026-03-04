import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // uniquement pour dev
  const backendUrl = mode === 'development'
    ? (process.env.VITE_SERVER_URL || 'http://localhost:5000')
    : undefined

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      proxy: mode === 'development' ? {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
        },
      } : undefined,
    },
  }
})