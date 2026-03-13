/* Page de moderation des commentaires admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { CheckIcon, ChatBubbleLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import { getAdminComments, approveComment, deleteComment } from '../../services/commentService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'

const PAGE_LIMIT = 20

export default function AdminComments() {
  const addToast = useAdminToast()
  const [comments, setComments] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)

  const loadComments = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getAdminComments({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setComments(normalized.items)
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
    loadComments(page)
  }, [page])

  const handleApprove = async (id) => {
    try {
      await approveComment(id)
      addToast('Commentaire approuve.', 'success')
      loadComments(page)
    } catch {
      addToast("Erreur lors de l'approbation.", 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteComment(confirmId)
      addToast('Commentaire supprime.', 'success')
      loadComments(page)
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  const pendingCount = comments.filter((comment) => !comment.approved).length
  const approvedCount = comments.filter((comment) => comment.approved).length

  return (
    <>
      <Helmet>
        <title>Commentaires - Administration</title>
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
                <ChatBubbleLeftIcon className="h-6 w-6" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Moderation
                </p>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Commentaires
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Garde la conversation propre: approuve les retours utiles et supprime les messages a ecarter.
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
                  En attente
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: pendingCount > 0 ? '#fb923c' : 'var(--color-text-primary)' }}>
                  {pendingCount}
                </p>
              </div>
              <div className="rounded-[var(--ui-radius-xl)] border p-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)' }}>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Approuves
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: approvedCount > 0 ? '#4ade80' : 'var(--color-text-primary)' }}>
                  {approvedCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : comments.length === 0 ? (
          <div
            className="rounded-[var(--ui-radius-2xl)] border p-6"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
            }}
          >
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Aucun commentaire
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Rien a moderer pour le moment.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-[var(--ui-radius-2xl)] border p-5"
                  style={{
                    borderColor: comment.approved ? 'color-mix(in srgb, var(--color-border) 70%, transparent)' : '#fb923c',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {comment.author_name}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Article #{comment.article_id}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-medium"
                      style={{
                        color: comment.approved ? '#4ade80' : '#fb923c',
                        backgroundColor: comment.approved ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                      }}
                    >
                      {comment.approved ? 'Approuve' : 'En attente'}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {comment.content}
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    {!comment.approved && (
                      <button
                        onClick={() => handleApprove(comment.id)}
                        className="inline-flex min-h-[var(--ui-control-height)] flex-1 items-center justify-center gap-2 rounded-[var(--ui-radius-xl)] border px-4 py-2.5 text-sm font-medium"
                        style={{
                          color: '#4ade80',
                          borderColor: 'rgba(74, 222, 128, 0.34)',
                          backgroundColor: 'rgba(74, 222, 128, 0.08)',
                        }}
                      >
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        Approuver
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmId(comment.id)}
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
                <thead
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 86%, transparent)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <tr>
                    <th className="text-left px-5 py-4 font-medium">Article</th>
                    <th className="text-left px-5 py-4 font-medium">Auteur</th>
                    <th className="text-left px-5 py-4 font-medium">Commentaire</th>
                    <th className="text-left px-5 py-4 font-medium">Statut</th>
                    <th className="text-right px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((comment, index) => (
                    <tr
                      key={comment.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0
                            ? 'color-mix(in srgb, var(--color-bg-card) 82%, transparent)'
                            : 'color-mix(in srgb, var(--color-bg-secondary) 66%, transparent)',
                        borderTop: '1px solid color-mix(in srgb, var(--color-border) 62%, transparent)',
                      }}
                    >
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        #{comment.article_id}
                      </td>
                      <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {comment.author_name}
                      </td>
                      <td className="px-5 py-4 max-w-sm truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {comment.content}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-medium"
                          style={{
                            color: comment.approved ? '#4ade80' : '#fb923c',
                            backgroundColor: comment.approved ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                          }}
                        >
                          {comment.approved ? 'Approuve' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!comment.approved && (
                            <button
                              onClick={() => handleApprove(comment.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border focus:outline-none"
                              style={{
                                color: '#4ade80',
                                borderColor: 'rgba(74, 222, 128, 0.3)',
                                backgroundColor: 'rgba(74, 222, 128, 0.08)',
                              }}
                              aria-label={`Approuver le commentaire de ${comment.author_name}`}
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmId(comment.id)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border focus:outline-none"
                            style={{
                              color: '#f87171',
                              borderColor: 'rgba(248, 113, 113, 0.3)',
                              backgroundColor: 'rgba(248, 113, 113, 0.08)',
                            }}
                            aria-label={`Supprimer le commentaire de ${comment.author_name}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
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

      <ConfirmModal
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer le commentaire"
        message="Ce commentaire sera definitivement supprime."
      />
    </>
  )
}
