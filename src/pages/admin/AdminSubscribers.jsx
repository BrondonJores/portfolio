/* Page de gestion des abonnes newsletter admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { getAdminSubscribers, deleteSubscriber } from '../../services/subscriberService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'

const PAGE_LIMIT = 20

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function AdminSubscribers() {
  const addToast = useAdminToast()
  const [subscribers, setSubscribers] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const loadSubscribers = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getAdminSubscribers({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setSubscribers(normalized.items)
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
    loadSubscribers(page)
  }, [page])

  const handleDelete = async (id) => {
    try {
      await deleteSubscriber(id)
      addToast('Abonne supprime.', 'success')
      setDeletingId(null)
      loadSubscribers(page)
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    }
  }

  return (
    <>
      <Helmet>
        <title>Abonnes - Administration</title>
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
              <div className="flex items-center gap-3">
                <UserGroupIcon className="h-6 w-6" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Audience
                </p>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Abonnes
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Garde une vue nette sur la base newsletter et nettoie les inscriptions qui ne doivent plus rester actives.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
                  Etat
                </p>
                <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Base active
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : subscribers.length === 0 ? (
          <div
            className="rounded-[var(--ui-radius-2xl)] border p-6"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
            }}
          >
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Aucun abonne
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              La liste newsletter est vide pour le moment.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {subscribers.map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="rounded-[var(--ui-radius-2xl)] border p-5"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
                  }}
                >
                  <p className="text-sm font-semibold break-all" style={{ color: 'var(--color-text-primary)' }}>
                    {subscriber.email}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Inscrit le {formatDate(subscriber.created_at)}
                  </p>

                  <div className="mt-5">
                    {deletingId === subscriber.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleDelete(subscriber.id)}
                          className="rounded-[var(--ui-radius-xl)] px-4 py-2.5 text-sm font-medium"
                          style={{ backgroundColor: '#f87171', color: '#fff' }}
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="rounded-[var(--ui-radius-xl)] border px-4 py-2.5 text-sm font-medium"
                          style={{
                            color: 'var(--color-text-secondary)',
                            borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(subscriber.id)}
                        className="inline-flex min-h-[var(--ui-control-height)] items-center justify-center gap-2 rounded-[var(--ui-radius-xl)] border px-4 py-2.5 text-sm font-medium"
                        style={{
                          color: '#f87171',
                          borderColor: 'rgba(248, 113, 113, 0.3)',
                          backgroundColor: 'rgba(248, 113, 113, 0.08)',
                        }}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="hidden overflow-hidden rounded-[var(--ui-radius-2xl)] border lg:block"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
              }}
            >
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 86%, transparent)', color: 'var(--color-text-secondary)' }}>
                  <tr>
                    <th className="text-left px-5 py-4 font-medium">Email</th>
                    <th className="text-left px-5 py-4 font-medium">Date d'inscription</th>
                    <th className="text-right px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber, index) => (
                    <tr
                      key={subscriber.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0
                            ? 'color-mix(in srgb, var(--color-bg-card) 82%, transparent)'
                            : 'color-mix(in srgb, var(--color-bg-secondary) 66%, transparent)',
                        borderTop: '1px solid color-mix(in srgb, var(--color-border) 62%, transparent)',
                      }}
                    >
                      <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {subscriber.email}
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatDate(subscriber.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {deletingId === subscriber.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(subscriber.id)}
                                className="rounded-xl px-3 py-2 text-xs font-medium"
                                style={{ backgroundColor: '#f87171', color: '#fff' }}
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="rounded-xl border px-3 py-2 text-xs font-medium"
                                style={{
                                  color: 'var(--color-text-secondary)',
                                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                                }}
                              >
                                Annuler
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeletingId(subscriber.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border focus:outline-none"
                              style={{
                                color: '#f87171',
                                borderColor: 'rgba(248, 113, 113, 0.3)',
                                backgroundColor: 'rgba(248, 113, 113, 0.08)',
                              }}
                              aria-label={`Supprimer l'abonne ${subscriber.email}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <AdminPagination
          total={pagination.total}
          limit={pagination.limit}
          offset={pagination.offset}
          disabled={loading}
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      </div>
    </>
  )
}
