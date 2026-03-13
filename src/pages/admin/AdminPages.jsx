/* Page de gestion des pages CMS (draft/published) dans l'administration. */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  RocketLaunchIcon,
  ArrowDownOnSquareStackIcon,
  DocumentTextIcon,
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

const panelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 78%, transparent)',
}

const metricCardStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
}

/**
 * Formate une date en texte lisible FR.
 * @param {string | Date | null | undefined} value Date source.
 * @returns {string} Date formatee.
 */
function fmtDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Retourne les couleurs d'un badge de statut.
 * @param {'published' | 'draft' | string} status Statut de la page.
 * @returns {{color: string, backgroundColor: string, borderColor: string}} Styles badge.
 */
function getStatusTone(status) {
  if (status === 'published') {
    return {
      color: '#4ade80',
      backgroundColor: 'rgba(74, 222, 128, 0.12)',
      borderColor: 'rgba(74, 222, 128, 0.26)',
    }
  }

  return {
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.26)',
  }
}

/**
 * Retourne le titre principal de la page CMS.
 * @param {object} page Page CMS admin.
 * @returns {string} Titre a afficher.
 */
function getPageTitle(page) {
  return page?.draft?.title || page?.published?.title || page?.slug || 'Page sans titre'
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
   * @param {number} [targetPage=currentPage] Page cible.
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

  const publishedCount = useMemo(
    () => items.filter((page) => page?.status === 'published').length,
    [items]
  )
  const draftCount = useMemo(
    () => items.filter((page) => page?.status !== 'published').length,
    [items]
  )

  return (
    <>
      <Helmet>
        <title>Pages CMS - Administration</title>
      </Helmet>

      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-[32px] border px-5 py-5 sm:px-6 sm:py-6"
          style={panelStyle}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span
                className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
                }}
              >
                <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
                CMS studio
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  Des pages qui gardent leur allure, meme en mode ops.
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Gere tes pages marketing, tes brouillons et tes publications dans un espace plus lisible,
                  plus editorial et mieux calibre pour les editions rapides.
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={() => openPageEditor('/admin/pages/nouveau')} className="w-full sm:w-auto">
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nouvelle page
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Pages visibles', value: publishedCount },
              { label: 'Brouillons actifs', value: draftCount },
              { label: 'Total suivis', value: pagination.total },
            ].map((metric) => (
              <article key={metric.label} className="rounded-[24px] border px-4 py-4" style={metricCardStyle}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center rounded-[28px] border py-20" style={panelStyle}>
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <section
            className="rounded-[28px] border px-6 py-14 text-center"
            style={panelStyle}
          >
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucune page CMS pour le moment.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Cree ta premiere page pour commencer a structurer tes contenus evergreen.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="primary" onClick={() => openPageEditor('/admin/pages/nouveau')}>
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Creer une page
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {items.map((page) => {
                const isBusy = busyId === page.id
                const statusTone = getStatusTone(page.status)

                return (
                  <article
                    key={page.id}
                    className="rounded-[26px] border p-4"
                    style={panelStyle}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {getPageTitle(page)}
                        </p>
                        <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          /pages/{page.slug}
                        </p>
                      </div>
                      <span
                        className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={statusTone}
                      >
                        {page.status === 'published' ? 'Publiee' : 'Brouillon'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Derniere mise a jour
                        </p>
                        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {fmtDate(page.updatedAt)}
                        </p>
                      </div>
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          URL live
                        </p>
                        <p className="mt-2 truncate font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                          /pages/{page.slug}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openPageEditor(`/admin/pages/${page.id}`)} className="flex-1">
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void togglePublish(page)}
                        disabled={isBusy}
                        className="flex-1"
                      >
                        {page.status === 'published' ? (
                          <ArrowDownOnSquareStackIcon className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
                        )}
                        {page.status === 'published' ? 'Depublier' : 'Publier'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setConfirmId(page.id)}
                        disabled={isBusy}
                        className="w-full sm:w-auto"
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        Supprimer
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>

            <section className="hidden overflow-hidden rounded-[30px] border lg:block" style={panelStyle}>
              <div
                className="grid grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_130px_150px_180px] gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                }}
              >
                <span>Titre</span>
                <span>Route</span>
                <span>Statut</span>
                <span>Mise a jour</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                {items.map((page) => {
                  const isBusy = busyId === page.id
                  const statusTone = getStatusTone(page.status)

                  return (
                    <div
                      key={page.id}
                      className="grid grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_130px_150px_180px] items-center gap-4 px-6 py-5 transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)' }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {getPageTitle(page)}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Edition rapide disponible depuis la fenetre dediee.
                        </p>
                      </div>

                      <p className="truncate font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        /pages/{page.slug}
                      </p>

                      <span
                        className="inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={statusTone}
                      >
                        {page.status === 'published' ? 'Publiee' : 'Brouillon'}
                      </span>

                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmtDate(page.updatedAt)}
                      </p>

                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => openPageEditor(`/admin/pages/${page.id}`)}>
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void togglePublish(page)}
                          disabled={isBusy}
                        >
                          {page.status === 'published' ? (
                            <ArrowDownOnSquareStackIcon className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setConfirmId(page.id)}
                          disabled={isBusy}
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <div className="pt-1">
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
