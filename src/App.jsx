/* Composant racine avec CSP et layout de base */
import { Helmet } from 'react-helmet-async'
import { Outlet } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import Navbar from './components/sections/Navbar.jsx'
import { SpeedInsights } from "@vercel/speed-insights/react"
import ScrollProgressBar from './components/ui/ScrollProgressBar.jsx'
import { useSettings } from './context/SettingsContext.jsx'
import { getAnimationConfig } from './utils/animationSettings.js'

/* Politique de securite du contenu */
const apiOrigin = import.meta.env.VITE_API_URL || ''
const serverOrigin = import.meta.env.VITE_SERVER_URL || ''

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: https:", serverOrigin].filter(Boolean).join(' '),
  "font-src 'self'",
  ["connect-src 'self' https://api.resend.com", apiOrigin].filter(Boolean).join(' '),
].join('; ')

/* Layout public avec Navbar */
export default function App() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )

  return (
    <>
      <Helmet>
        <meta httpEquiv="Content-Security-Policy" content={CSP_POLICY} />
      </Helmet>

      {/* Fade-in global au montage */}
      <motion.div
        initial={animationConfig.canAnimate ? { opacity: 0 } : false}
        animate={animationConfig.canAnimate ? { opacity: 1 } : false}
        transition={{ duration: 0.4 * animationConfig.durationScale, ease: animationConfig.easePreset }}
      >
        <ScrollProgressBar />
        <Navbar />
        <main>
          <Outlet />
          <SpeedInsights />
        </main>
      </motion.div>
    </>
  )
}
