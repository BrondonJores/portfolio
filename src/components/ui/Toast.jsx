/* Composant de notifications toast avec animations */
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

/* Configuration visuelle par type de toast */
const TOAST_CONFIG = {
  success: {
    icon: CheckCircleIcon,
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.1)',
    border: 'rgba(74, 222, 128, 0.3)',
  },
  error: {
    icon: XCircleIcon,
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.1)',
    border: 'rgba(248, 113, 113, 0.3)',
  },
  info: {
    icon: InformationCircleIcon,
    color: 'var(--color-accent-light)',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.3)',
  },
}

/* Composant d'un toast individuel */
function ToastItem({ toast, onRemove }) {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-64 max-w-xs"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: config.border,
      }}
      role="alert"
    >
      <Icon
        className="h-5 w-5 flex-shrink-0 mt-0.5"
        style={{ color: config.color }}
        aria-hidden="true"
      />
      <p
        className="text-sm flex-grow"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-0.5 rounded transition-opacity hover:opacity-70 focus:outline-none"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-label="Fermer la notification"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

/* Conteneur de tous les toasts positionne en bas a droite */
export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}
