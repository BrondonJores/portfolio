/* Composant cloche de notification pour l'espace admin */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useUnreadMessages } from '../../hooks/useUnreadMessages.js'

/* Formate une date en temps relatif (ex: "il y a 2h") */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "il y a quelques secondes"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

/**
 * Cloche de notification avec badge et dropdown des messages non lus.
 * Se ferme au clic en dehors et apres navigation vers /admin/messages.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const { unreadMessages, unreadCount, markAsRead } = useUnreadMessages()

  /* Fermeture au clic en dehors du composant */
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleViewAll() {
    setOpen(false)
    navigate('/admin/messages')
  }

  /* Les 5 premiers messages non lus */
  const preview = unreadMessages.slice(0, 5)

  return (
    <div ref={containerRef} className="relative">
      {/* Bouton cloche */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-label={`Notifications — ${unreadCount} non lus`}
        animate={unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
        transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 30 }}
      >
        <BellIcon className="h-5 w-5" />

        {/* Badge rouge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: '#ef4444' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border shadow-2xl z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* En-tete */}
            <div
              className="px-4 py-3 border-b text-sm font-semibold"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              Notifications
            </div>

            {/* Liste des messages */}
            {preview.length === 0 ? (
              <p
                className="px-4 py-6 text-sm text-center"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Aucune nouvelle notification
              </p>
            ) : (
              <ul>
                {preview.map((msg) => (
                  <li
                    key={msg.id}
                    className="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-[var(--color-bg-secondary)]"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {/* Contenu du message */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {msg.name}
                      </p>
                      <p
                        className="text-xs truncate mt-0.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {msg.message}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>

                    {/* Bouton marquer comme lu */}
                    <button
                      onClick={() => markAsRead(msg.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                      aria-label="Marquer comme lu"
                      title="Marquer comme lu"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Pied de page */}
            <div className="px-4 py-3">
              <button
                onClick={handleViewAll}
                className="w-full text-sm font-medium text-center transition-colors focus:outline-none"
                style={{ color: 'var(--color-accent)' }}
              >
                Voir tous les messages →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
