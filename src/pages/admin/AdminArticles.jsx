/* Page de gestion des articles admin */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import { getAdminArticles, deleteArticle, importAdminArticles } from '../../services/articleService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'
import {
  notifyAdminEditorSaved,
  openAdminEditorWindow,
  subscribeAdminEditorRefresh,
} from '../../utils/adminEditorWindow.js'

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

/**
 * Formate une date FR.
 * @param {string | null | undefined} value Date source.
 * @returns {string} Date lisible.
 */
function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-'
}

/**
 * Retourne la tonalite visuelle du statut de publication.
 * @param {boolean} published Statut publication.
 * @returns {{color:string, backgroundColor:string, borderColor:string}} Styles badge.
 */
function getPublishedTone(published) {
  if (published) {
    return {
      color: '#4ade80',
      backgroundColor: 'rgba(74, 222, 128, 0.12)',
      borderColor: 'rgba(74, 222, 128, 0.28)',
    }
  }

  return {
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  }
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

  const publishedCount = useMemo(
    () => articles.filter((article) => article?.published).length,
    [articles]
  )
  const draftCount = useMemo(
    () => articles.filter((article) => !article?.published).length,
    [articles]
  )

  return (
    <>
      <Helmet>
        <title>Articles - Administration</title>
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
                Editorial ops
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  Gere le flux editorial sans casser le rythme.
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Liste, import et edition rapide sont regroupes dans un ecran plus propre, avec une
                  lecture nette des contenus publies et de ceux encore en brouillon.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <label
                className="inline-flex items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-sm"
                style={metricCardStyle}
              >
                <span style={{ color: 'var(--color-text-primary)' }}>Remplacer les doublons</span>
                <input
                  type="checkbox"
                  checked={replaceExistingImport}
                  onChange={(event) => setReplaceExistingImport(event.target.checked)}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
              </label>
              <Button variant="secondary" onClick={openImportPicker} disabled={importing}>
                {importing ? <Spinner size="sm" /> : <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />}
                Importer JSON
              </Button>
              <Button variant="primary" onClick={() => openArticleEditor('/admin/articles/nouveau')}>
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Nouvel article
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Publies', value: publishedCount },
              { label: 'Brouillons', value: draftCount },
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

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </section>

        {loading ? (
          <div className="flex justify-center rounded-[28px] border py-20" style={panelStyle}>
            <Spinner size="lg" />
          </div>
        ) : articles.length === 0 ? (
          <section className="rounded-[28px] border px-6 py-14 text-center" style={panelStyle}>
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucun article pour le moment.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Lance ton premier article ou importe un lot JSON pour alimenter l espace editorial.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={openImportPicker}>
                <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
                Importer JSON
              </Button>
              <Button variant="primary" onClick={() => openArticleEditor('/admin/articles/nouveau')}>
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Creer un article
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {articles.map((article) => {
                const statusTone = getPublishedTone(Boolean(article.published))

                return (
                  <article
                    key={article.id}
                    className="rounded-[26px] border p-4"
                    style={panelStyle}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {article.title}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          Publication: {fmtDate(article.published_at)}
                        </p>
                      </div>
                      <span
                        className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={statusTone}
                      >
                        {article.published ? 'Publie' : 'Brouillon'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Etat
                        </p>
                        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {article.published ? 'Visible sur le site' : 'Encore hors ligne'}
                        </p>
                      </div>
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Date cle
                        </p>
                        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {fmtDate(article.published_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openArticleEditor(`/admin/articles/${article.id}`)} className="flex-1">
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Modifier
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setConfirmId(article.id)} className="w-full sm:w-auto">
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
                className="grid grid-cols-[minmax(0,1.35fr)_140px_180px_180px] gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                }}
              >
                <span>Titre</span>
                <span>Statut</span>
                <span>Publication</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                {articles.map((article) => {
                  const statusTone = getPublishedTone(Boolean(article.published))

                  return (
                    <div
                      key={article.id}
                      className="grid grid-cols-[minmax(0,1.35fr)_140px_180px_180px] items-center gap-4 px-6 py-5 transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)' }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {article.title}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Edition rapide disponible dans la fenetre dediee.
                        </p>
                      </div>

                      <span
                        className="inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={statusTone}
                      >
                        {article.published ? 'Publie' : 'Brouillon'}
                      </span>

                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmtDate(article.published_at)}
                      </p>

                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => openArticleEditor(`/admin/articles/${article.id}`)}>
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                          Modifier
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setConfirmId(article.id)}>
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
