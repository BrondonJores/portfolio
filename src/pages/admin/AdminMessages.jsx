/* Page de gestion des messages admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { EnvelopeIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { getAdminMessages, markMessageAsRead } from '../../services/messageService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'

const PAGE_LIMIT = 20

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return new Date(dateValue).toLocaleString('fr-FR')
}

export default function AdminMessages() {
  const addToast = useAdminToast()
  const [messages, setMessages] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const loadMessages = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getAdminMessages({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setMessages(normalized.items)
        setPagination({
          total: normalized.total,
          limit: normalized.limit,
          offset: normalized.offset,
        })

        const pages = Math.max(1, Math.ceil(normalized.total / normalized.limit))
        if (targetPage > pages && normalized.total > 0) {
          setPage(pages)
        }
      })
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMessages(page)
  }, [page])

  const handleOpen = async (message) => {
    setSelected(message)
    if (!message.read_at) {
      try {
        await markMessageAsRead(message.id)
        setMessages((prev) =>
          prev.map((item) => (item.id === message.id ? { ...item, read_at: new Date().toISOString() } : item))
        )
      } catch {
        /* Echec silencieux */
      }
    }
  }

  const unreadCount = messages.filter((message) => !message.read_at).length

  return (
    <>
      <Helmet>
        <title>Messages - Administration</title>
      </Helmet>
      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 18%, transparent))',
            boxShadow: '0 30px 68px -46px color-mix(in srgb, var(--color-accent-glow) 28%, transparent)',
          }}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_320px] xl:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                Inbox
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Messages
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Ouvre un message pour le lire, le marquer comme vu et garder une lecture propre de l'inbox.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[var(--ui-radius-xl)] border p-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)' }}>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Total
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {pagination.total}
                </p>
              </div>
              <div className="rounded-[var(--ui-radius-xl)] border p-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)' }}>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Non lus
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: unreadCount > 0 ? '#f87171' : 'var(--color-text-primary)' }}>
                  {unreadCount}
                </p>
              </div>
              <div className="rounded-[var(--ui-radius-xl)] border p-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)' }}>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Etat
                </p>
                <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {unreadCount > 0 ? 'Action requise' : 'Inbox calme'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div
            className="rounded-[var(--ui-radius-2xl)] border p-6"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
            }}
          >
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Aucun message
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              L'inbox est vide pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const unread = !message.read_at
              return (
                <button
                  key={message.id}
                  onClick={() => handleOpen(message)}
                  className="w-full rounded-[var(--ui-radius-2xl)] border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] md:p-5"
                  style={{
                    borderColor: unread ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-border) 70%, transparent)',
                    backgroundColor: unread
                      ? 'color-mix(in srgb, var(--color-accent-glow) 10%, transparent)'
                      : 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border"
                      style={{
                        borderColor: unread ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
                      }}
                    >
                      {unread ? (
                        <EnvelopeIcon className="h-5 w-5" style={{ color: '#f87171' }} aria-hidden="true" />
                      ) : (
                        <EnvelopeOpenIcon className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold md:text-base" style={{ color: 'var(--color-text-primary)' }}>
                            {message.name}
                          </p>
                          <p className="mt-1 text-xs break-all md:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {message.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {unread && (
                            <span
                              className="rounded-full px-3 py-1 text-[11px] font-medium"
                              style={{ backgroundColor: 'rgba(248, 113, 113, 0.12)', color: '#f87171' }}
                            >
                              Non lu
                            </span>
                          )}
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {message.message}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <AdminPagination
          total={pagination.total}
          limit={pagination.limit}
          offset={pagination.offset}
          disabled={loading}
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Message de ${selected.name}` : ''}
      >
        {selected && (
          <div>
            <div className="space-y-2 mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Email :
                </span>{' '}
                {selected.email}
              </p>
              <p>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Date :
                </span>{' '}
                {formatDate(selected.created_at)}
              </p>
            </div>
            <div
              className="rounded-[var(--ui-radius-xl)] border p-4 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                color: 'var(--color-text-primary)',
              }}
            >
              {selected.message}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
