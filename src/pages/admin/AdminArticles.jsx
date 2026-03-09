/* Page de gestion des articles admin */
import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon, PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import { getAdminArticles, deleteArticle, importAdminArticles } from '../../services/articleService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'
import { notifyAdminEditorSaved, openAdminEditorWindow, subscribeAdminEditorRefresh } from '../../utils/adminEditorWindow.js'

const PAGE_LIMIT = 12

/**
 * Lit un fichier texte JSON cote navigateur.
 * @param {File} file Fichier selectionne.
 * @returns {Promise<string>} Contenu brut.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Impossible de lire le fichier JSON.'))
    reader.readAsText(file)
  })
}

/**
 * Normalise un payload d'import articles vers { articles: [...] }.
 * Accepte: tableau, objet { articles }, ou article unique.
 * @param {unknown} parsed JSON parse.
 * @returns {{articles:Array<object>} | null} Payload normalise.
 */
function normalizeArticleImportPayload(parsed) {
  if (Array.isArray(parsed)) {
    return { articles: parsed }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  if (Array.isArray(parsed.articles)) {
    return { articles: parsed.articles }
  }

  if (parsed.title !== undefined || parsed.slug !== undefined) {
    return { articles: [parsed] }
  }

  return null
}

export default function AdminArticles() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [articles, setArticles] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [replaceExistingImport, setReplaceExistingImport] = useState(false)

  const loadArticles = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getAdminArticles({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setArticles(normalized.items)
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
      .catch(() => addToast('Erreur lors du chargement des articles.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadArticles(page)
  }, [page])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'articles' || payload?.entity === 'global') {
        loadArticles(page)
      }
    })
  }, [page])

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
      loadArticles(page)
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  /**
   * Ouvre le selecteur de fichier pour import JSON.
   * @returns {void}
   */
  const openImportPicker = () => {
    fileInputRef.current?.click()
  }

  /**
   * Importe des articles depuis un fichier JSON.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event Evenement de selection.
   * @returns {Promise<void>} Promise resolue apres import.
   */
  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    try {
      const rawText = await readFileAsText(file)
      const parsed = JSON.parse(rawText)
      const normalized = normalizeArticleImportPayload(parsed)

      if (!normalized || !Array.isArray(normalized.articles) || normalized.articles.length === 0) {
        addToast('Format JSON invalide. Utilise { "articles": [...] } ou un tableau.', 'error')
        return
      }

      const response = await importAdminArticles({
        articles: normalized.articles,
        replaceExisting: replaceExistingImport,
      })

      const summary = response?.data || {}
      await loadArticles(page)
      notifyAdminEditorSaved('articles')
      addToast(
        `Import termine: ${summary.created || 0} cree(s), ${summary.updated || 0} mis a jour, ${summary.skippedCount || 0} ignore(s).`,
        'success'
      )
    } catch (error) {
      addToast(error.message || "Erreur pendant l'import des articles.", 'error')
    } finally {
      setImporting(false)
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={replaceExistingImport}
                onChange={(event) => setReplaceExistingImport(event.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Remplacer les doublons
            </label>
            <Button variant="secondary" onClick={openImportPicker} disabled={importing}>
              {importing ? <Spinner size="sm" /> : <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />}
              Importer JSON
            </Button>
            <Button variant="primary" onClick={() => openArticleEditor('/admin/articles/nouveau')}>
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nouvel article
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
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
