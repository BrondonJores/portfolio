/* Page de gestion des messages admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { EnvelopeIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { getAdminMessages, markMessageAsRead } from '../../services/messageService.js'

/* Formatage de la date */
function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('fr-FR')
}

export default function AdminMessages() {
  const addToast = useAdminToast()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const loadMessages = () => {
    setLoading(true)
    getAdminMessages()
      .then((res) => setMessages(res?.data || []))
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadMessages, [])

  /* Ouverture du detail et marquage comme lu */
  const handleOpen = async (msg) => {
    setSelected(msg)
    if (!msg.read_at) {
      try {
        await markMessageAsRead(msg.id)
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m))
        )
      } catch {
        /* Echec silencieux */
      }
    }
  }

  const unreadCount = messages.filter((m) => !m.read_at).length

  return (
    <>
      <Helmet>
        <title>Messages - Administration</title>
      </Helmet>
      <div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Messages
          {unreadCount > 0 && (
            <span
              className="ml-3 text-sm font-normal px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#f87171', color: '#fff' }}
            >
              {unreadCount} non {unreadCount > 1 ? 'lus' : 'lu'}
            </span>
          )}
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Cliquez sur un message pour le lire et le marquer comme lu.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucun message.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => handleOpen(msg)}
                className="w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{
                  backgroundColor: msg.read_at ? 'var(--color-bg-card)' : 'rgba(99, 102, 241, 0.05)',
                  borderColor: msg.read_at ? 'var(--color-border)' : 'var(--color-accent)',
                }}
              >
                {/* Icone lire/non-lue */}
                {msg.read_at ? (
                  <EnvelopeOpenIcon
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-hidden="true"
                  />
                ) : (
                  <EnvelopeIcon
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    style={{ color: '#f87171' }}
                    aria-hidden="true"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {msg.name}
                      {!msg.read_at && (
                        <span
                          className="ml-2 inline-block w-2 h-2 rounded-full align-middle"
                          style={{ backgroundColor: '#f87171' }}
                        />
                      )}
                    </p>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {msg.email}
                  </p>
                  <p
                    className="text-sm mt-1 truncate"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {msg.message}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detail du message */}
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
              className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
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
