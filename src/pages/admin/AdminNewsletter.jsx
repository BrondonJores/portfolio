/* Page de gestion des campagnes newsletter admin */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  TrashIcon,
  PaperAirplaneIcon,
  PlusIcon,
  PencilSquareIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
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

const panelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 78%, transparent)',
}

const metricCardStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
}

/**
 * Formate une date courte FR.
 * @param {string | null | undefined} dateString Date source.
 * @returns {string} Date lisible.
 */
function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Retourne le style visuel d'un statut campagne.
 * @param {string} status Statut campagne.
 * @returns {{color: string, backgroundColor: string, borderColor: string}} Styles.
 */
function getStatusTone(status) {
  if (status === 'sent') {
    return {
      color: '#4ade80',
      backgroundColor: 'rgba(74, 222, 128, 0.12)',
      borderColor: 'rgba(74, 222, 128, 0.26)',
    }
  }

  return {
    color: 'var(--color-text-secondary)',
    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 72%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  }
}

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
  const [busyId, setBusyId] = useState(null)

  /**
   * Charge les campagnes newsletter.
   * @param {number} [targetPage=page] Page cible.
   * @returns {void}
   */
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

  /**
   * Supprime une campagne.
   * @param {number|string} id Identifiant campagne.
   * @returns {Promise<void>} Promise de suppression.
   */
  const handleDelete = async (id) => {
    setBusyId(id)
    try {
      await deleteCampaign(id)
      addToast('Campagne supprimee.', 'success')
      loadCampaigns(page)
    } catch (err) {
      addToast(err.message || 'Erreur lors de la suppression.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Envoie une campagne brouillon.
   * @param {number|string} id Identifiant campagne.
   * @returns {Promise<void>} Promise d'envoi.
   */
  const handleSend = async (id) => {
    setBusyId(id)
    try {
      await sendCampaign(id)
      addToast('Campagne envoyee avec succes.', 'success')
      loadCampaigns(page)
    } catch (err) {
      addToast(err.message || "Erreur lors de l'envoi.", 'error')
    } finally {
      setBusyId(null)
    }
  }

  const sentCount = useMemo(
    () => campaigns.filter((campaign) => campaign?.status === 'sent').length,
    [campaigns]
  )
  const draftCount = useMemo(
    () => campaigns.filter((campaign) => campaign?.status !== 'sent').length,
    [campaigns]
  )

  return (
    <>
      <Helmet>
        <title>Newsletter - Administration</title>
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
                <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                Audience ops
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  Des campagnes plus nettes, du brouillon jusqu'a l'envoi.
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Suit les brouillons, garde un oeil sur ce qui est deja parti et declenche
                  les envois sans quitter un cockpit plus lisible et plus dense.
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={() => openNewsletterEditor('/admin/newsletter/new')} className="w-full sm:w-auto">
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nouvelle campagne
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Brouillons prets', value: draftCount },
              { label: 'Campagnes envoyees', value: sentCount },
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
        ) : campaigns.length === 0 ? (
          <section className="rounded-[28px] border px-6 py-14 text-center" style={panelStyle}>
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucune campagne newsletter pour l’instant.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Cree un premier brouillon pour lancer ton canal de diffusion.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="primary" onClick={() => openNewsletterEditor('/admin/newsletter/new')}>
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Creer une campagne
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {campaigns.map((campaign) => {
                const isBusy = busyId === campaign.id
                const statusTone = getStatusTone(campaign.status)
                const articleCount = Array.isArray(campaign.articles) ? campaign.articles.length : 0

                return (
                  <article
                    key={campaign.id}
                    className="rounded-[26px] border p-4"
                    style={panelStyle}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {campaign.subject}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {campaign.status === 'sent'
                            ? `Envoyee le ${formatDate(campaign.sent_at)}`
                            : 'Brouillon pret pour revision ou envoi'}
                        </p>
                      </div>
                      <span
                        className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={statusTone}
                      >
                        {campaign.status === 'sent' ? 'Envoyee' : 'Brouillon'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Articles lies
                        </p>
                        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {articleCount}
                        </p>
                      </div>
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Derniere date
                        </p>
                        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {formatDate(campaign.sent_at || campaign.updatedAt || campaign.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {campaign.status === 'draft' && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => openNewsletterEditor(`/admin/newsletter/${campaign.id}/edit`)}
                            className="flex-1"
                          >
                            <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void handleSend(campaign.id)}
                            disabled={isBusy}
                            className="flex-1"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                            Envoyer
                          </Button>
                        </>
                      )}

                      {campaign.status !== 'sent' && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void handleDelete(campaign.id)}
                          disabled={isBusy}
                          className="w-full sm:w-auto"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            <section className="hidden overflow-hidden rounded-[30px] border lg:block" style={panelStyle}>
              <div
                className="grid grid-cols-[minmax(0,1.3fr)_130px_120px_170px_220px] gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                }}
              >
                <span>Sujet</span>
                <span>Statut</span>
                <span>Articles</span>
                <span>Date cle</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                {campaigns.map((campaign) => {
                  const isBusy = busyId === campaign.id
                  const statusTone = getStatusTone(campaign.status)
                  const articleCount = Array.isArray(campaign.articles) ? campaign.articles.length : 0

                  return (
                    <div
                      key={campaign.id}
                      className="grid grid-cols-[minmax(0,1.3fr)_130px_120px_170px_220px] items-center gap-4 px-6 py-5 transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)' }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {campaign.subject}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {campaign.status === 'sent'
                            ? `Envoyee le ${formatDate(campaign.sent_at)}`
                            : 'Brouillon pret a etre active'}
                        </p>
                      </div>

                      <span
                        className="inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={statusTone}
                      >
                        {campaign.status === 'sent' ? 'Envoyee' : 'Brouillon'}
                      </span>

                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {articleCount}
                      </p>

                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatDate(campaign.sent_at || campaign.updatedAt || campaign.createdAt)}
                      </p>

                      <div className="flex items-center justify-end gap-2">
                        {campaign.status === 'draft' && (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => openNewsletterEditor(`/admin/newsletter/${campaign.id}/edit`)}
                            >
                              <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void handleSend(campaign.id)}
                              disabled={isBusy}
                            >
                              <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void handleDelete(campaign.id)}
                              disabled={isBusy}
                            >
                              <TrashIcon className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </>
                        )}
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
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </div>
      </div>
    </>
  )
}
