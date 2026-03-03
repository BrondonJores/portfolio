/* Page de moderation des commentaires admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { CheckIcon, TrashIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import { getAdminComments, approveComment, deleteComment } from '../../services/commentService.js'

export default function AdminComments() {
  const addToast = useAdminToast()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)

  const loadComments = () => {
    setLoading(true)
    getAdminComments()
      .then((res) => setComments(res?.data || []))
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadComments, [])

  const handleApprove = async (id) => {
    try {
      await approveComment(id)
      addToast('Commentaire approuvé.', 'success')
      loadComments()
    } catch {
      addToast('Erreur lors de l\'approbation.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteComment(confirmId)
      addToast('Commentaire supprimé.', 'success')
      loadComments()
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  return (
    <>
      <Helmet>
        <title>Commentaires - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <ChatBubbleLeftIcon className="h-6 w-6" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Commentaires
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : comments.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucun commentaire.</p>
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <table className="w-full text-sm">
              <thead
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <tr>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Article ID</th>
                  <th className="text-left px-4 py-3 font-medium">Auteur</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Commentaire</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      backgroundColor:
                        i % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      className="px-4 py-3 hidden md:table-cell text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {c.article_id}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {c.author_name}
                    </td>
                    <td
                      className="px-4 py-3 hidden lg:table-cell max-w-xs truncate text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {c.content}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          color: c.approved ? '#4ade80' : '#fb923c',
                          backgroundColor: c.approved
                            ? 'rgba(74, 222, 128, 0.1)'
                            : 'rgba(251, 146, 60, 0.1)',
                        }}
                      >
                        {c.approved ? 'Approuvé' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!c.approved && (
                          <button
                            onClick={() => handleApprove(c.id)}
                            className="p-1.5 rounded-lg transition-colors focus:outline-none"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={`Approuver le commentaire de ${c.author_name}`}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#4ade80' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmId(c.id)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Supprimer le commentaire de ${c.author_name}`}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
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
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer le commentaire"
        message="Ce commentaire sera définitivement supprimé."
      />
    </>
  )
}
