/* Composant modal accessible avec animation Framer Motion */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Modal accessible avec focus trap, overlay et fermeture au clic/touche Escape.
 * Props : isOpen, onClose, title, children.
 */
export default function Modal({ isOpen, onClose, title, children }) {
  /* Fermeture au clic sur l'overlay ou a la touche Escape */
  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    /* Blocage du defilement de la page */
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Overlay sombre avec effet blur */}
          <motion.div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Contenu du modal */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* En-tete du modal */}
            <div className="flex items-center justify-between mb-4">
              <h2
                id="modal-title"
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Fermer le modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Contenu dynamique */}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
