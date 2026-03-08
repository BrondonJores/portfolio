/* Formulaire de creation/edition d'une page CMS dynamique. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
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
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

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

      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
          {isEdit ? 'Modifier la page CMS' : 'Nouvelle page CMS'}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="space-y-5 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Titre <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Slug
                  </label>
                  <input
                    name="slug"
                    type="text"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder={toSlug(form.title)}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Contenu <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <Button type="button" variant="ghost" onClick={openVisualBuilder}>
                    Builder visuel
                  </Button>
                </div>
                <BlockEditor
                  blocks={blocks}
                  onChange={setBlocks}
                  templates={editorTemplates}
                />
              </div>

              <div
                className="rounded-xl border p-4 space-y-4"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  SEO de la page
                </h2>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Meta title
                  </label>
                  <input
                    name="seo_title"
                    type="text"
                    value={form.seo_title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Meta description
                  </label>
                  <textarea
                    name="seo_description"
                    value={form.seo_description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
                    style={inputStyle}
                  />
                </div>
                <ImageUploader
                  label="Image Open Graph"
                  value={form.og_image}
                  onUpload={(url) => setForm((prev) => ({ ...prev, og_image: url }))}
                />
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    URL canonique
                  </label>
                  <input
                    name="canonical_url"
                    type="url"
                    value={form.canonical_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                  />
                </div>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      name="noindex"
                      type="checkbox"
                      checked={form.noindex}
                      onChange={handleChange}
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      noindex
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      name="nofollow"
                      type="checkbox"
                      checked={form.nofollow}
                      onChange={handleChange}
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      nofollow
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
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
              <div
                className="rounded-xl border p-3 space-y-1"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                  Autosave local
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {autosaveLabel}
                </p>
                {localDraftRestored && (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Un brouillon local a ete restaure automatiquement.
                  </p>
                )}
              </div>

              <div
                className="rounded-xl border p-3 space-y-1"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Statut: <strong style={{ color: 'var(--color-text-primary)' }}>{status}</strong>
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  URL: /pages/{toSlug(form.slug || form.title) || 'nouvelle-page'}
                </p>
                {publishedAt && (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Publiee le: {fmtDate(publishedAt)}
                  </p>
                )}
              </div>

              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Apercu live page
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Rendu en temps reel de la page CMS.
                  </p>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
                  <section
                    className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                  >
                    <h2 className="text-xl font-semibold break-words" style={{ color: 'var(--color-text-primary)' }}>
                      {form.title.trim() || 'Titre de la page...'}
                    </h2>
                    {form.seo_description.trim() && (
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {form.seo_description}
                      </p>
                    )}
                  </section>

                  <article
                    className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                  >
                    {blocks.length > 0 ? (
                      <BlockRenderer content={previewContent} />
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Ajoute des blocs pour voir l'apercu de la page.
                      </p>
                    )}
                  </article>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </>
  )
}
