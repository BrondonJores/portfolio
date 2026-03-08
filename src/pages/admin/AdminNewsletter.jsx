/* Page de gestion des campagnes newsletter admin */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { TrashIcon, PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  getNewsletterCampaigns,
  deleteCampaign,
  sendCampaign,
} from '../../services/newsletterService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'
import { openAdminEditorWindow, subscribeAdminEditorRefresh } from '../../utils/adminEditorWindow.js'

const PAGE_LIMIT = 12

export default function AdminNewsletter() {
  const addToast = useAdminToast()
  const navigate = useNavigate()

  const [campaigns, setCampaigns] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadCampaigns = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getNewsletterCampaigns({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setCampaigns(normalized.items)
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
    loadCampaigns(page)
  }, [page])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'newsletter' || payload?.entity === 'global') {
        loadCampaigns(page)
      }
    })
  }, [page])

  /**
   * Ouvre l'editeur newsletter dans une fenetre dediee (fallback route locale).
   * @param {string} path Route cible.
   * @returns {void}
   */
  const openNewsletterEditor = (path) => {
    const popup = openAdminEditorWindow(path, { windowName: 'portfolio-admin-newsletter-editor' })
    if (!popup) {
      navigate(path)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteCampaign(id)
      addToast('Campagne supprimee.', 'success')
      loadCampaigns(page)
    } catch (err) {
      addToast(err.message || 'Erreur lors de la suppression.', 'error')
    }
  }

  const handleSend = async (id) => {
    try {
      await sendCampaign(id)
      addToast('Campagne envoyee avec succes.', 'success')
      loadCampaigns(page)
    } catch (err) {
      addToast(err.message || "Erreur lors de l'envoi.", 'error')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <>
      <Helmet>
        <title>Newsletter - Administration</title>
      </Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Newsletter
          </h1>

          <Button
            variant="primary"
            onClick={() => openNewsletterEditor('/admin/newsletter/new')}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nouvelle campagne
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : campaigns.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Aucune campagne.
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
                  <th className="text-left px-4 py-3 font-medium">Sujet</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    Articles
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Date d'envoi
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {campaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      backgroundColor:
                        i % 2 === 0
                          ? 'var(--color-bg-card)'
                          : 'var(--color-bg-secondary)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {c.subject}
                      {c.cta_label && (
                        <span className="ml-2 text-xs text-indigo-400">
                          CTA
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={
                          c.status === 'sent'
                            ? {
                                color: '#4ade80',
                                backgroundColor:
                                  'rgba(74,222,128,0.1)',
                              }
                            : {
                                color: 'var(--color-text-secondary)',
                                backgroundColor:
                                  'var(--color-bg-primary)',
                              }
                        }
                      >
                        {c.status === 'sent'
                          ? `Envoyee le ${formatDate(c.sent_at)}`
                          : 'Brouillon'}
                      </span>
                    </td>

                    <td
                      className="px-4 py-3 hidden lg:table-cell text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {Array.isArray(c.articles)
                        ? c.articles.length
                        : 0}
                    </td>

                    <td
                      className="px-4 py-3 hidden md:table-cell text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formatDate(c.sent_at)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {c.status === 'draft' && (
                          <>
                            <button
                              onClick={() =>
                                openNewsletterEditor(`/admin/newsletter/${c.id}/edit`)
                              }
                              className="p-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                              style={{
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              Modifier
                            </button>

                            <button
                              onClick={() => handleSend(c.id)}
                              className="p-1.5 rounded-lg transition-colors focus:outline-none"
                              style={{
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <PaperAirplaneIcon className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-lg transition-colors focus:outline-none"
                              style={{
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
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
