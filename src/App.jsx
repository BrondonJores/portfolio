/* Composant racine avec CSP et layout de base */
import { Helmet } from 'react-helmet-async'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './components/sections/Navbar.jsx'

/* Politique de securite du contenu */
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
].join('; ')

/* Layout public avec Navbar */
export default function App() {
  return (
    <>
      <Helmet>
        <meta httpEquiv="Content-Security-Policy" content={CSP_POLICY} />
      </Helmet>

      {/* Fade-in global au montage */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Navbar />
        <main>
          <Outlet />
        </main>
      </motion.div>
    </>
  )
}
