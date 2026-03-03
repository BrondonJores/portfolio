/* Carte reutilisable avec animation hover */
import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Carte avec fond sombre, bordure et animation de survol.
 * Accepte les props children et className.
 */
export default function Card({ children, className = '' }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={`rounded-xl border p-6 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: isHovered ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: isHovered ? '0 0 15px var(--color-accent-glow)' : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </motion.div>
  )
}
