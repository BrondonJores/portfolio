/* Formulaire de creation/edition d'une page CMS dynamique. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import BlockRenderer from '../../components/ui/BlockRenderer.jsx'
import Button from '../../components/ui/Button.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { PAGE_BLOCK_TEMPLATES } from '../../constants/blockTemplates.js'
import useAdminBlockTemplates from '../../hooks/useAdminBlockTemplates.js'
import useLocalDraftAutosave from '../../hooks/useLocalDraftAutosave.jsx'
import { isAdminEditorPopup, notifyAdminEditorSaved } from '../../utils/adminEditorWindow.js'
import {
  createBuilderChannel,
  openAdminVisualBuilder,
  subscribeBuilderChannel,
  writeBuilderChannelSnapshot,
} from '../../utils/adminVisualBuilderBridge.js'
import { deleteCurrentVisualBuilderDraft } from '../../services/adminVisualBuilderService.js'
import {
  createCmsPage,
  getAdminCmsPageById,
  publishCmsPage,
  unpublishCmsPage,
  updateCmsPage,
} from '../../services/cmsPageService.js'

const AUTOSAVE_DEBOUNCE_MS = 900
const LOCAL_DRAFT_PREFIX = 'portfolio_cms_page_form_draft'

const inputStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
  color: 'var(--color-text-primary)',
}

const panelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 78%, transparent)',
}

const insetPanelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
}

const textInputClassName = 'w-full rounded-2xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'
const textareaClassName = `${textInputClassName} min-h-[124px] resize-y`

const EMPTY_FORM = {
  title: '',
  slug: '',
  seo_title: '',
  seo_description: '',
  og_image: '',
  canonical_url: '',
  noindex: false,
  nofollow: false,
}

/**
 * Genere un slug lisible.
 * @param {string} value Valeur source.
 * @returns {string} Slug normalise.
 */
function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 160)
}

/**
 * Formate une date FR.
 * @param {string | Date | null | undefined} value Date source.
 * @returns {string} Date lisible.
 */
function fmtDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('fr-FR')
}

/**
 * Parse un layout brut (array ou JSON texte) vers des blocs.
 * @param {unknown} value Valeur source.
 * @returns {Array<object>} Tableau de blocs.
 */
function parseLayout(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed?.blocks)) return parsed.blocks
    } catch {
      return []
    }
  }
  return []
}

/**
 * Construit la cle localStorage d'autosave local.
 * @param {boolean} isEdit True si edition.
 * @param {string | undefined} pageId Identifiant page.
 * @returns {string} Cle locale.
 */
function getLocalDraftKey(isEdit, pageId) {
  return isEdit ? `${LOCAL_DRAFT_PREFIX}_edit_${pageId}` : `${LOCAL_DRAFT_PREFIX}_new`
}

/**
 * Retourne le style du badge de statut.
 * @param {string} status Statut courant.
 * @returns {{color:string, backgroundColor:string, borderColor:string}} Style badge.
 */
function getStatusTone(status) {
  if (status === 'published') {
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

export default function AdminPageForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useAdminToast()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(EMPTY_FORM)
  const [blocks, setBlocks] = useState([])
  const [status, setStatus] = useState('draft')
  const [publishedAt, setPublishedAt] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const builderChannel = useMemo(() => createBuilderChannel('page', id || 'new'), [id])

  const previewContent = useMemo(() => JSON.stringify({ blocks }), [blocks])
  const draftStorageKey = useMemo(() => getLocalDraftKey(isEdit, id), [isEdit, id])
  const hasDraftContent = useMemo(
    () =>
      Boolean(
        form.title.trim() ||
        form.slug.trim() ||
        form.seo_title.trim() ||
        form.seo_description.trim() ||
        form.og_image ||
        form.canonical_url ||
        blocks.length > 0
      ),
    [form, blocks]
  )
  const draftData = useMemo(
    () => ({
      ...form,
      blocks,
      status,
    }),
    [form, blocks, status]
  )
  const { templates: editorTemplates } = useAdminBlockTemplates({
    context: 'all',
    fallbackTemplates: PAGE_BLOCK_TEMPLATES,
  })

  /**
   * Applique un brouillon restaure depuis localStorage.
   * @param {unknown} draft Brouillon brut.
   * @returns {void}
   */
  const handleRestoreDraft = useCallback((draft) => {
    const restoredBlocks = Array.isArray(draft?.blocks) ? draft.blocks : []
    setBlocks(restoredBlocks)
    setStatus(typeof draft?.status === 'string' ? draft.status : 'draft')
    setForm((prev) => ({
      ...prev,
      title: typeof draft?.title === 'string' ? draft.title : '',
      slug: typeof draft?.slug === 'string' ? draft.slug : '',
      seo_title: typeof draft?.seo_title === 'string' ? draft.seo_title : '',
      seo_description: typeof draft?.seo_description === 'string' ? draft.seo_description : '',
      og_image: typeof draft?.og_image === 'string' ? draft.og_image : '',
      canonical_url: typeof draft?.canonical_url === 'string' ? draft.canonical_url : '',
      noindex: Boolean(draft?.noindex),
      nofollow: Boolean(draft?.nofollow),
    }))
    addToast('Brouillon local page restaure.', 'info')
  }, [addToast])

  const { autosaveLabel, localDraftRestored, clearDraft } = useLocalDraftAutosave({
    storageKey: draftStorageKey,
    loading,
    hasContent: hasDraftContent,
    draftData,
    onRestore: handleRestoreDraft,
    debounceMs: AUTOSAVE_DEBOUNCE_MS,
  })

  useEffect(() => {
    return subscribeBuilderChannel(builderChannel, (snapshot) => {
      const payload = snapshot?.payload
      if (!payload || (payload.type !== 'builder-draft' && payload.type !== 'builder-save')) {
        return
      }

      setBlocks(Array.isArray(payload.blocks) ? payload.blocks : [])
      if (typeof payload.title === 'string') {
        setForm((prev) => ({ ...prev, title: payload.title }))
      }
    })
  }, [builderChannel])

  useEffect(() => {
    if (!isEdit) return

    getAdminCmsPageById(id)
      .then((response) => {
        const page = response?.data
        if (!page) return

        setStatus(page.status || 'draft')
        setPublishedAt(page?.published?.publishedAt || null)
        setForm({
          title: page?.draft?.title || '',
          slug: page.slug || '',
          seo_title: page?.draft?.seo?.title || '',
          seo_description: page?.draft?.seo?.description || '',
          og_image: page?.draft?.seo?.ogImage || '',
          canonical_url: page?.draft?.seo?.canonicalUrl || '',
          noindex: Boolean(page?.draft?.seo?.noindex),
          nofollow: Boolean(page?.draft?.seo?.nofollow),
        })
        setBlocks(parseLayout(page?.draft?.layout))
      })
      .catch((error) => {
        addToast(error.message || 'Impossible de charger la page.', 'error')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, addToast])

  /**
   * Retourne a la liste pages ou ferme l'onglet d'edition.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/pages')
      }
      return
    }
    navigate('/admin/pages')
  }

  /**
   * Met a jour un champ de formulaire.
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event Evenement input.
   * @returns {void}
   */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  /**
   * Construit le payload API page CMS.
   * @returns {object} Payload normalise.
   */
  const buildPagePayload = () => {
    const safeTitle = form.title.trim()
    const safeSlug = toSlug(form.slug || safeTitle)
    return {
      title: safeTitle,
      slug: safeSlug,
      blocks,
      seo: {
        title: form.seo_title.trim(),
        description: form.seo_description.trim(),
        ogImage: form.og_image.trim(),
        canonicalUrl: form.canonical_url.trim(),
        noindex: form.noindex,
        nofollow: form.nofollow,
      },
    }
  }

  /**
   * Ouvre le visual builder plein ecran.
   * @returns {void}
   */
  const openVisualBuilder = () => {
    writeBuilderChannelSnapshot(builderChannel, {
      type: 'builder-init',
      entity: 'page',
      title: form.title || 'Page CMS',
      blocks,
      templates: editorTemplates,
    })

    const builderTab = openAdminVisualBuilder({
      entity: 'page',
      channel: builderChannel,
    })

    if (!builderTab) {
      navigate(`/admin/builder?entity=page&channel=${encodeURIComponent(builderChannel)}`)
    }
  }

  /**
   * Sauvegarde la page en draft.
   * @param {React.FormEvent<HTMLFormElement>} event Evenement submit.
   * @returns {Promise<void>} Promise resolue apres sauvegarde.
   */
  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = buildPagePayload()

    if (!payload.title) {
      addToast('Le titre est obligatoire.', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        const response = await updateCmsPage(id, payload)
        setStatus(response?.data?.status || 'draft')
        addToast('Page mise a jour.', 'success')
      } else {
        await createCmsPage(payload)
        addToast('Page creee avec succes.', 'success')
      }

      clearDraft()
      void deleteCurrentVisualBuilderDraft({
        entity: 'page',
        channel: builderChannel,
      }).catch(() => {})
      notifyAdminEditorSaved('pages')
      closeEditorOrBack()
    } catch (error) {
      addToast(error.message || 'Erreur lors de la sauvegarde de la page.', 'error')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Publie la page courante apres synchronisation du draft.
   * @returns {Promise<void>} Promise resolue apres publication.
   */
  const handlePublish = async () => {
    if (!isEdit) return

    const payload = buildPagePayload()
    if (!payload.title || payload.blocks.length === 0) {
      addToast('Le titre et au moins un bloc sont requis pour publier.', 'error')
      return
    }

    setPublishing(true)
    try {
      await updateCmsPage(id, payload)
      const response = await publishCmsPage(id)
      setStatus(response?.data?.status || 'published')
      setPublishedAt(response?.data?.published?.publishedAt || new Date().toISOString())
      clearDraft()
      notifyAdminEditorSaved('pages')
      addToast('Page publiee avec succes.', 'success')
    } catch (error) {
      addToast(error.message || 'Erreur lors de la publication.', 'error')
    } finally {
      setPublishing(false)
    }
  }

  /**
   * Depublie la page courante.
   * @returns {Promise<void>} Promise resolue apres depub.
   */
  const handleUnpublish = async () => {
    if (!isEdit) return

    setUnpublishing(true)
    try {
      const response = await unpublishCmsPage(id)
      setStatus(response?.data?.status || 'draft')
      notifyAdminEditorSaved('pages')
      addToast('Page depubliee.', 'success')
    } catch (error) {
      addToast(error.message || 'Erreur lors de la depub.', 'error')
    } finally {
      setUnpublishing(false)
    }
  }

  const statusTone = getStatusTone(status)
  const liveSlug = toSlug(form.slug || form.title) || 'nouvelle-page'
  const sectionCount = blocks.length

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Modifier la page CMS' : 'Nouvelle page CMS'} - Administration</title>
      </Helmet>

      <div className="max-w-7xl space-y-6">
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
                Page system
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  {isEdit ? 'Affiner la page sans perdre le fil du rendu.' : 'Composer une page qui reste premium meme en edition.'}
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Structure, SEO et preview live sont regroupes dans un meme cockpit pour reduire
                  les allers-retours et garder une vue claire sur l’etat de publication.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
                style={statusTone}
              >
                {status === 'published' ? 'Publiee' : 'Brouillon'}
              </span>
              <span
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
                }}
              >
                {autosaveLabel}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Sections en cours', value: sectionCount },
              { label: 'Slug live', value: liveSlug, mono: true },
              { label: 'Publication', value: publishedAt ? fmtDate(publishedAt) : 'Pas encore publiee' },
            ].map((metric) => (
              <article
                key={metric.label}
                className="rounded-[24px] border px-4 py-4"
                style={insetPanelStyle}
              >
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                  {metric.label}
                </p>
                <p
                  className={`mt-3 text-sm font-semibold sm:text-base ${metric.mono ? 'font-mono' : ''}`}
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Fondations de la page
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Definis le titre, la route et l’identite editoriale de base.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openVisualBuilder}
                    className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                    style={insetPanelStyle}
                  >
                    <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                    Ouvrir le builder visuel
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Titre <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleChange}
                      className={textInputClassName}
                      style={inputStyle}
                      required
                    />
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Utilise un titre clair, distinctif et assez fort pour la navigation.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Slug
                    </label>
                    <input
                      name="slug"
                      type="text"
                      value={form.slug}
                      onChange={handleChange}
                      placeholder={toSlug(form.title)}
                      className={`${textInputClassName} font-mono`}
                      style={inputStyle}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      La route finale sera generee en format `/pages/{liveSlug}`.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Architecture du contenu
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Gere les blocs comme un storyboard, avec un rendu qui reste visible a droite.
                    </p>
                  </div>
                  <span
                    className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium"
                    style={insetPanelStyle}
                  >
                    {sectionCount} bloc{sectionCount > 1 ? 's' : ''} actif{sectionCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="rounded-[24px] border p-3 sm:p-4" style={insetPanelStyle}>
                  <BlockEditor
                    blocks={blocks}
                    onChange={setBlocks}
                    templates={editorTemplates}
                    allowSections
                  />
                </div>
              </section>

              <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    SEO et diffusion
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Prepare les meta signaux qui accompagnent la page dans les recherches et les partages.
                  </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-4 rounded-[24px] border p-4" style={insetPanelStyle}>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        Meta title
                      </label>
                      <input
                        name="seo_title"
                        type="text"
                        value={form.seo_title}
                        onChange={handleChange}
                        className={textInputClassName}
                        style={inputStyle}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        Meta description
                      </label>
                      <textarea
                        name="seo_description"
                        value={form.seo_description}
                        onChange={handleChange}
                        rows={4}
                        className={textareaClassName}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[24px] border p-4" style={insetPanelStyle}>
                    <ImageUploader
                      label="Image Open Graph"
                      value={form.og_image}
                      onUpload={(url) => setForm((prev) => ({ ...prev, og_image: url }))}
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        URL canonique
                      </label>
                      <input
                        name="canonical_url"
                        type="url"
                        value={form.canonical_url}
                        onChange={handleChange}
                        className={textInputClassName}
                        style={inputStyle}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { key: 'noindex', label: 'Masquer des moteurs', checked: form.noindex },
                        { key: 'nofollow', label: 'Ne pas suivre les liens', checked: form.nofollow },
                      ].map((toggle) => (
                        <label
                          key={toggle.key}
                          className="flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3"
                          style={inputStyle}
                        >
                          <span className="pr-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {toggle.label}
                          </span>
                          <input
                            name={toggle.key}
                            type="checkbox"
                            checked={toggle.checked}
                            onChange={handleChange}
                            style={{ accentColor: 'var(--color-accent)' }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : 'Creer la page'}
                </Button>
                {isEdit && (
                  <Button type="button" variant="secondary" onClick={() => void handlePublish()} disabled={publishing}>
                    {publishing ? <Spinner size="sm" /> : 'Publier'}
                  </Button>
                )}
                {isEdit && status === 'published' && (
                  <Button type="button" variant="ghost" onClick={() => void handleUnpublish()} disabled={unpublishing}>
                    {unpublishing ? <Spinner size="sm" /> : 'Depublier'}
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={closeEditorOrBack}>
                  Annuler
                </Button>
              </div>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 self-start">
              <section className="rounded-[28px] border p-5" style={panelStyle}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Pulse
                    </p>
                    <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Etat de la page
                    </h2>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={statusTone}
                  >
                    {status === 'published' ? 'Live' : 'Draft'}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Autosave local', value: autosaveLabel },
                    { label: 'Route finale', value: `/pages/${liveSlug}`, mono: true },
                    { label: 'Publication', value: publishedAt ? fmtDate(publishedAt) : 'En attente' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border px-4 py-3" style={insetPanelStyle}>
                      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.label}
                      </p>
                      <p
                        className={`mt-2 text-sm font-medium ${item.mono ? 'font-mono' : ''}`}
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {localDraftRestored && (
                  <p className="mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Un brouillon local a ete restaure automatiquement sur ce navigateur.
                  </p>
                )}
              </section>

              <section className="overflow-hidden rounded-[28px] border" style={panelStyle}>
                <div className="border-b px-5 py-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Preview
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Apercu live page
                    </h2>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
                      style={insetPanelStyle}
                    >
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      Temps reel
                    </span>
                  </div>
                </div>
                <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
                  <section className="rounded-[22px] border p-4" style={insetPanelStyle}>
                    <h3 className="break-words text-2xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--color-text-primary)' }}>
                      {form.title.trim() || 'Titre de la page...'}
                    </h3>
                    {form.seo_description.trim() && (
                      <p className="mt-3 text-sm leading-7" style={{ color: 'var(--color-text-secondary)' }}>
                        {form.seo_description}
                      </p>
                    )}
                  </section>

                  <article className="rounded-[22px] border p-4" style={insetPanelStyle}>
                    {blocks.length > 0 ? (
                      <BlockRenderer content={previewContent} />
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Ajoute des blocs pour voir l'apercu de la page.
                      </p>
                    )}
                  </article>
                </div>
              </section>
            </aside>
          </div>
        </form>
      </div>
    </>
  )
}
