/* Page de gestion des articles admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import { getAdminArticles, deleteArticle } from '../../services/articleService.js'
import { openAdminEditorWindow, subscribeAdminEditorRefresh } from '../../utils/adminEditorWindow.js'

export default function AdminArticles() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)

  const loadArticles = () => {
    setLoading(true)
    getAdminArticles()
      .then((res) => setArticles(res?.data || []))
      .catch(() => addToast('Erreur lors du chargement des articles.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadArticles, [])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'articles' || payload?.entity === 'global') {
        loadArticles()
      }
    })
  }, [])

  /**
   * Ouvre l'editeur article dans une fenetre dediee (fallback route locale).
   * @param {string} path Route cible.
   * @returns {void}
   */
  const openArticleEditor = (path) => {
    const popup = openAdminEditorWindow(path, { windowName: 'portfolio-admin-article-editor' })
    if (!popup) {
      navigate(path)
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteArticle(confirmId)
      addToast('Article supprime avec succes.', 'success')
      loadArticles()
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-')

  return (
    <>
      <Helmet>
        <title>Articles - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Articles
          </h1>
          <Button variant="primary" onClick={() => openArticleEditor('/admin/articles/nouveau')}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nouvel article
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : articles.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucun article pour le moment.</p>
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
                  <th className="text-left px-4 py-3 font-medium">Titre</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Publie</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date de publication</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article, i) => (
                  <tr
                    key={article.id}
                    style={{
                      backgroundColor:
                        i % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)',
                      borderTop: `1px solid var(--color-border)`,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {article.title}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          color: article.published ? '#4ade80' : '#f87171',
                          backgroundColor: article.published
                            ? 'rgba(74, 222, 128, 0.1)'
                            : 'rgba(248, 113, 113, 0.1)',
                        }}
                      >
                        {article.published ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 hidden lg:table-cell text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {fmt(article.published_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openArticleEditor(`/admin/articles/${article.id}`)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Modifier ${article.title}`}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmId(article.id)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Supprimer ${article.title}`}
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
        title="Supprimer l'article"
        message="Cette action est irreversible. L'article sera definitivement supprime."
      />
    </>
  )
}
