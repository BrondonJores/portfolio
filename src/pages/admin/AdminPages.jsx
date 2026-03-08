/* Page de gestion des pages CMS (draft/published) dans l'administration. */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  RocketLaunchIcon,
  ArrowDownOnSquareStackIcon,
} from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  getAdminCmsPages,
  publishCmsPage,
  unpublishCmsPage,
  deleteCmsPage,
} from '../../services/cmsPageService.js'
import { toOffsetFromPage } from '../../utils/adminPagination.js'
import { openAdminEditorWindow, subscribeAdminEditorRefresh } from '../../utils/adminEditorWindow.js'

const PAGE_LIMIT = 12

/**
 * Formate une date en texte lisible FR.
 * @param {string | Date | null | undefined} value Date source.
 * @returns {string} Date formatee.
 */
function fmtDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('fr-FR')
}

export default function AdminPages() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  /**
   * Charge la liste des pages CMS cote admin.
   * @returns {Promise<void>} Promise resolue apres chargement.
   */
  const loadPages = async (targetPage = currentPage) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    try {
      const response = await getAdminCmsPages({ limit: PAGE_LIMIT, offset })
      const payload = response?.data || {}
      const nextItems = Array.isArray(payload.items) ? payload.items : []
      const nextTotal = Number(payload.total || 0)
      const nextLimit = Number(payload.limit || PAGE_LIMIT)
      const nextOffset = Number(payload.offset || offset)

      setItems(nextItems)
      setPagination({
        total: nextTotal,
        limit: nextLimit,
        offset: nextOffset,
      })

      const pages = Math.max(1, Math.ceil(nextTotal / Math.max(nextLimit, 1)))
      if (targetPage > pages && nextTotal > 0) {
          setCurrentPage(pages)
      }
    } catch {
      addToast('Erreur lors du chargement des pages CMS.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPages(currentPage)
  }, [currentPage])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'pages' || payload?.entity === 'global') {
        void loadPages(currentPage)
      }
    })
  }, [currentPage])

  /**
   * Ouvre l'editeur page dans un onglet dedie (fallback route locale).
   * @param {string} path Route cible.
   * @returns {void}
   */
  const openPageEditor = (path) => {
    const popup = openAdminEditorWindow(path, { windowName: 'portfolio-admin-page-editor' })
    if (!popup) {
      navigate(path)
    }
  }

  /**
   * Bascule le statut publie <-> draft d'une page.
   * @param {object} pageItem Page cible.
   * @returns {Promise<void>} Promise resolue apres operation.
   */
  const togglePublish = async (pageItem) => {
    setBusyId(pageItem.id)
    try {
      if (pageItem.status === 'published') {
        await unpublishCmsPage(pageItem.id)
        addToast('Page depubliee.', 'success')
      } else {
        await publishCmsPage(pageItem.id)
        addToast('Page publiee.', 'success')
      }
      await loadPages(currentPage)
    } catch (error) {
      addToast(error.message || 'Operation impossible pour cette page.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Supprime la page confirmee.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  const handleDelete = async () => {
    if (!confirmId) return

    setBusyId(confirmId)
    try {
      await deleteCmsPage(confirmId)
      addToast('Page supprimee avec succes.', 'success')
      await loadPages(currentPage)
    } catch {
      addToast('Erreur lors de la suppression de la page.', 'error')
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  return (
    <>
      <Helmet>
        <title>Pages CMS - Administration</title>
      </Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Pages CMS
          </h1>
          <Button variant="primary" onClick={() => openPageEditor('/admin/pages/nouveau')}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nouvelle page
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Aucune page CMS. Creez votre premiere page.
          </p>
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
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Slug</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Maj</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((page, index) => (
                  <tr
                    key={page.id}
                    style={{
                      backgroundColor:
                        index % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {page?.draft?.title || page?.published?.title || page.slug}
                    </td>
                    <td
                      className="px-4 py-3 hidden md:table-cell font-mono text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      /pages/{page.slug}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          color: page.status === 'published' ? '#4ade80' : '#f59e0b',
                          backgroundColor:
                            page.status === 'published'
                              ? 'rgba(74, 222, 128, 0.1)'
                              : 'rgba(245, 158, 11, 0.1)',
                        }}
                      >
                        {page.status === 'published' ? 'Publiee' : 'Brouillon'}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 hidden lg:table-cell text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {fmtDate(page.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPageEditor(`/admin/pages/${page.id}`)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Modifier ${page.slug}`}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void togglePublish(page)}
                          disabled={busyId === page.id}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={page.status === 'published' ? 'Depublier la page' : 'Publier la page'}
                        >
                          {page.status === 'published' ? (
                            <ArrowDownOnSquareStackIcon className="h-4 w-4" />
                          ) : (
                            <RocketLaunchIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmId(page.id)}
                          disabled={busyId === page.id}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Supprimer ${page.slug}`}
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
            onPageChange={(nextPage) => setCurrentPage(nextPage)}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmId)}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmId(null)}
        title="Supprimer la page"
        message="Cette action est irreversible. La page et son historique seront supprimes."
      />
    </>
  )
}
