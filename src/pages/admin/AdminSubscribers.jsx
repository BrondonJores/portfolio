/* Page de gestion des abonnes newsletter admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { getAdminSubscribers, deleteSubscriber } from '../../services/subscriberService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'

const PAGE_LIMIT = 20

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

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  return (
    <>
      <Helmet>
        <title>Abonnes - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {pagination.total} abonne{pagination.total !== 1 ? 'e(s)' : '(e)'}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : subscribers.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucun abonne.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date d'inscription</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {s.email}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(s.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {deletingId === s.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="text-xs px-2 py-1 rounded focus:outline-none"
                              style={{ backgroundColor: '#f87171', color: '#fff' }}
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs px-2 py-1 rounded focus:outline-none"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              Annuler
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeletingId(s.id)}
                            className="p-1.5 rounded-lg transition-colors focus:outline-none"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={`Supprimer l'abonne ${s.email}`}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
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
        )}

        <div className="mt-4">
          <AdminPagination
            total={pagination.total}
            limit={pagination.limit}
            offset={pagination.offset}
            disabled={loading}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </div>
      </div>
    </>
  )
}
