import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // uniquement pour dev
  const backendUrl = mode === 'development'
    ? (process.env.VITE_SERVER_URL || 'http://localhost:5000')
    : undefined

  /**
   * Segmente les librairies lourdes en chunks dedies.
   * Objectif: reduire le cout JS initial et ameliorer la reutilisation du cache navigateur.
   * @param {string} id Identifiant module resolu par Rollup.
   * @returns {string | undefined} Nom de chunk manuel.
   */
  const resolveManualChunk = (id) => {
    if (!id.includes('node_modules')) {
      return undefined
    }

    if (id.includes('@lottiefiles') || id.includes('lottie-web')) {
      return 'vendor-lottie'
    }

    if (id.includes('@rive-app')) {
      return 'vendor-rive'
    }

    if (id.includes('recharts')) {
      return 'vendor-charts'
    }

    if (id.includes('framer-motion')) {
      return 'vendor-motion'
    }

    if (id.includes('react-router')) {
      return 'vendor-router'
    }

    if (
      id.includes('/react/')
      || id.includes('/react-dom/')
      || id.includes('\\react\\')
      || id.includes('\\react-dom\\')
    ) {
      return 'vendor-react'
    }

    return undefined
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
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
