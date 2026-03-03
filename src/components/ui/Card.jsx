/* Carte reutilisable avec animation hover */
import { motion } from 'framer-motion'

/**
 * Carte avec fond sombre, bordure et animation de survol.
 * Accepte les props children et className.
 */
export default function Card({ children, className = '' }) {
  return (
    <motion.div
      className={`rounded-xl border p-6 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
