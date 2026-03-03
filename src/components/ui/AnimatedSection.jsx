/* Composant wrapper pour les animations de scroll reveal */
import { motion } from 'framer-motion'

/**
 * Anime les sections en entree dans le viewport.
 * Responsabilite unique : gere uniquement l'animation de scroll reveal.
 */
export default function AnimatedSection({ className = '', children, ...props }) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.section>
  )
}
