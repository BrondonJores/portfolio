/* Composant cloche de notification pour l'espace admin */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useUnreadMessages } from '../../hooks/useUnreadMessages.js'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'il y a quelques secondes'
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const { unreadMessages, unreadCount, markAsRead } = useUnreadMessages()

  useEffect(() => {
    if (!open) return undefined
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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

  const preview = unreadMessages.slice(0, 5)

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        style={{
          color: 'var(--color-text-secondary)',
          borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
        }}
        aria-label={`Notifications - ${unreadCount} non lus`}
        animate={unreadCount > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 30 }}
      >
        <BellIcon className="h-5 w-5" />

        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: '#ef4444' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-[var(--ui-radius-2xl)] border shadow-2xl sm:w-[25rem]"
            style={{
              background:
                'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 92%, transparent), color-mix(in srgb, var(--color-accent-glow) 14%, transparent))',
              borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
            }}
          >
            <div className="border-b px-5 py-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Inbox rapide
                  </p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Notifications
                  </p>
                </div>
                <span
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
                  }}
                >
                  {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {preview.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Inbox calme
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun nouveau message a traiter pour le moment.
                </p>
              </div>
            ) : (
              <ul className="max-h-[24rem] space-y-2 overflow-y-auto px-3 py-3">
                {preview.map((message) => (
                  <li key={message.id}>
                    <div
                      className="rounded-[var(--ui-radius-xl)] border px-4 py-3"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-border) 66%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {message.name}
                            </p>
                            <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
                              {timeAgo(message.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {message.message}
                          </p>
                        </div>

                        <button
                          onClick={() => markAsRead(message.id)}
                          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          style={{
                            color: 'var(--color-text-secondary)',
                            borderColor: 'color-mix(in srgb, var(--color-border) 66%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 74%, transparent)',
                          }}
                          aria-label="Marquer comme lu"
                          title="Marquer comme lu"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t px-4 py-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
              <button
                onClick={handleViewAll}
                className="w-full rounded-[var(--ui-radius-xl)] border px-4 py-3 text-sm font-medium transition-colors focus:outline-none"
                style={{
                  color: 'var(--color-text-primary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
                }}
              >
                Voir tous les messages
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
