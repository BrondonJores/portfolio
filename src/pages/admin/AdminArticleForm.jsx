/* Formulaire de creation et d'edition d'article. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  PlusIcon,
  SparklesIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import Badge from '../../components/ui/Badge.jsx'
import BlockRenderer from '../../components/ui/BlockRenderer.jsx'
import Button from '../../components/ui/Button.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { ARTICLE_BLOCK_TEMPLATES } from '../../constants/blockTemplates.js'
import useAdminBlockTemplates from '../../hooks/useAdminBlockTemplates.js'
import useLocalDraftAutosave from '../../hooks/useLocalDraftAutosave.jsx'
import { isAdminEditorPopup, notifyAdminEditorSaved } from '../../utils/adminEditorWindow.js'
import {
  createBuilderChannel,
  openAdminVisualBuilder,
  subscribeBuilderChannel,
  writeBuilderChannelSnapshot,
} from '../../utils/adminVisualBuilderBridge.js'
import {
  createArticle,
  getAdminArticleById,
  updateArticle,
} from '../../services/articleService.js'
import { deleteCurrentVisualBuilderDraft } from '../../services/adminVisualBuilderService.js'

const EMPTY = {
  title: '',
  excerpt: '',
  content: '',
  cover_image: '',
  published: false,
  tags: [],
}

const AUTOSAVE_DEBOUNCE_MS = 800
const LOCAL_DRAFT_PREFIX = 'portfolio_article_form_draft'

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
const textareaClassName = `${textInputClassName} min-h-[108px] resize-y`

/**
 * Genere un slug lisible a partir du titre.
 * @param {string} value Titre source.
 * @returns {string} Slug genere.
 */
function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Parse le contenu (JSON blocks ou texte brut) vers un tableau de blocs.
 * @param {string | null | undefined} content Contenu de l'article.
 * @returns {Array<object>} Liste de blocs.
 */
function parseContent(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) return parsed.blocks
  } catch {
    /* ignore parse error */
  }

  if (!content) return []
  return [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'paragraph', content }]
}

/**
 * Construit la cle de brouillon localStorage.
 * @param {boolean} isEdit true si edition.
 * @param {string | undefined} articleId Identifiant article.
 * @returns {string} Cle localStorage.
 */
function getLocalDraftKey(isEdit, articleId) {
  return isEdit ? `${LOCAL_DRAFT_PREFIX}_edit_${articleId}` : `${LOCAL_DRAFT_PREFIX}_new`
}

/**
 * Retourne la tonalite du statut de publication.
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

export default function AdminArticleForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useAdminToast()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [blocks, setBlocks] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const builderChannel = useMemo(() => createBuilderChannel('article', id || 'new'), [id])

  const draftStorageKey = useMemo(() => getLocalDraftKey(isEdit, id), [isEdit, id])
  const previewContent = useMemo(() => JSON.stringify({ blocks }), [blocks])
  const hasDraftContent = useMemo(
    () =>
      Boolean(
        form.title.trim() ||
        form.excerpt.trim() ||
        form.cover_image ||
        (form.tags || []).length > 0 ||
        blocks.length > 0
      ),
    [form.title, form.excerpt, form.cover_image, form.tags, blocks]
  )
  const draftData = useMemo(
    () => ({
      title: form.title,
      excerpt: form.excerpt,
      cover_image: form.cover_image,
      published: form.published,
      tags: form.tags || [],
      blocks,
    }),
    [form.title, form.excerpt, form.cover_image, form.published, form.tags, blocks]
  )

  /**
   * Applique un brouillon restaure depuis localStorage.
   * @param {unknown} draft Donnees restaurees.
   * @returns {void}
   */
  const handleRestoreDraft = useCallback((draft) => {
    const restoredBlocks = Array.isArray(draft?.blocks) ? draft.blocks : []
    setBlocks(restoredBlocks)
    setForm((prev) => ({
      ...prev,
      title: typeof draft?.title === 'string' ? draft.title : '',
      excerpt: typeof draft?.excerpt === 'string' ? draft.excerpt : '',
      cover_image: typeof draft?.cover_image === 'string' ? draft.cover_image : '',
      published: Boolean(draft?.published),
      tags: Array.isArray(draft?.tags) ? draft.tags : [],
      content: JSON.stringify({ blocks: restoredBlocks }),
    }))
    addToast('Brouillon local d article restaure.', 'info')
  }, [addToast])

  const { autosaveLabel, localDraftRestored, clearDraft } = useLocalDraftAutosave({
    storageKey: draftStorageKey,
    loading,
    hasContent: hasDraftContent,
    draftData,
    onRestore: handleRestoreDraft,
    debounceMs: AUTOSAVE_DEBOUNCE_MS,
  })
  const { templates: editorTemplates } = useAdminBlockTemplates({
    context: 'article',
    fallbackTemplates: ARTICLE_BLOCK_TEMPLATES,
  })

  useEffect(() => {
    return subscribeBuilderChannel(builderChannel, (snapshot) => {
      const payload = snapshot?.payload
      if (!payload || (payload.type !== 'builder-draft' && payload.type !== 'builder-save')) {
        return
      }

      const nextBlocks = Array.isArray(payload.blocks) ? payload.blocks : []
      setBlocks(nextBlocks)
      setForm((prev) => ({ ...prev, content: JSON.stringify({ blocks: nextBlocks }) }))
    })
  }, [builderChannel])

  /**
   * Retourne a la liste articles ou ferme la popup d'edition.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/articles')
      }
      return
    }
    navigate('/admin/articles')
  }

  useEffect(() => {
    if (!isEdit) return

    getAdminArticleById(id)
      .then((res) => {
        const article = res?.data
        if (!article) return

        const loadedForm = {
          title: article.title || '',
          excerpt: article.excerpt || '',
          content: article.content || '',
          cover_image: article.cover_image || '',
          published: article.published || false,
          tags: article.tags || [],
        }

        setForm(loadedForm)
        setBlocks(parseContent(article.content || ''))
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  /**
   * Met a jour un champ du formulaire.
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event Evenement input.
   * @returns {void}
   */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  /**
   * Met a jour les blocs du contenu.
   * @param {Array<object>} nextBlocks Tableau de blocs.
   * @returns {void}
   */
  const handleBlocksChange = (nextBlocks) => {
    setBlocks(nextBlocks)
    setForm((prev) => ({ ...prev, content: JSON.stringify({ blocks: nextBlocks }) }))
  }

  /**
   * Ouvre le builder visuel plein ecran (style Elementor) dans un nouvel onglet.
   * @returns {void}
   */
  const openVisualBuilder = () => {
    writeBuilderChannelSnapshot(builderChannel, {
      type: 'builder-init',
      entity: 'article',
      title: form.title || 'Article',
      blocks,
      templates: editorTemplates,
    })

    const builderTab = openAdminVisualBuilder({
      entity: 'article',
      channel: builderChannel,
    })

    if (!builderTab) {
      navigate(`/admin/builder?entity=article&channel=${encodeURIComponent(builderChannel)}`)
    }
  }

  /**
   * Ajoute un tag si valide et unique.
   * @returns {void}
   */
  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
    }
    setTagInput('')
  }

  /**
   * Supprime un tag selectionne.
   * @param {string} tag Tag a retirer.
   * @returns {void}
   */
  const removeTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((entry) => entry !== tag) }))
  }

  /**
   * Gere l'ajout de tag via touche Entree.
   * @param {React.KeyboardEvent<HTMLInputElement>} event Evenement clavier.
   * @returns {void}
   */
  const handleTagKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addTag()
  }

  /**
   * Sauvegarde l'article.
   * @param {React.FormEvent<HTMLFormElement>} event Evenement submit.
   * @returns {Promise<void>} Promise de sauvegarde.
   */
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.title.trim() || blocks.length === 0) {
      addToast('Le titre et le contenu sont obligatoires.', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateArticle(id, form)
        addToast('Article mis a jour.', 'success')
      } else {
        await createArticle(form)
        addToast('Article cree avec succes.', 'success')
      }

      clearDraft()
      void deleteCurrentVisualBuilderDraft({
        entity: 'article',
        channel: builderChannel,
      }).catch(() => {})
      notifyAdminEditorSaved('articles')
      closeEditorOrBack()
    } catch (error) {
      addToast(error.message || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const slug = toSlug(form.title)
  const publishedTone = getPublishedTone(form.published)

  return (
    <>
      <Helmet>
        <title>{isEdit ? "Modifier l'article" : 'Nouvel article'} - Administration</title>
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
                <TagIcon className="h-4 w-4" aria-hidden="true" />
                Editorial cockpit
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  {isEdit ? 'Affiner l article sans perdre la vue d ensemble.' : 'Monter un article comme une vraie piece editoriale.'}
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Le titre, la structure, les tags et la preview sont maintenant regroupes dans un
                  cockpit plus lisible pour les allers-retours d edition.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
                style={publishedTone}
              >
                {form.published ? 'Publie' : 'Brouillon'}
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
              { label: 'Slug live', value: slug || 'a-definir', mono: true },
              { label: 'Tags actifs', value: form.tags.length },
              { label: 'Blocs de contenu', value: blocks.length },
            ].map((metric) => (
              <article key={metric.label} className="rounded-[24px] border px-4 py-4" style={insetPanelStyle}>
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
            <div className="space-y-5 min-w-0">
              <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Fondations editoriales
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Pose le titre, le chapô et la base du storytelling avant le travail de structure.
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

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label htmlFor="af-title" className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Titre <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      id="af-title"
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleChange}
                      required
                      className={textInputClassName}
                      style={inputStyle}
                    />
                    {form.title && (
                      <p className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        Slug: {slug}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="af-excerpt" className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Extrait
                    </label>
                    <textarea
                      id="af-excerpt"
                      name="excerpt"
                      value={form.excerpt}
                      onChange={handleChange}
                      rows={3}
                      className={textareaClassName}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Structure du contenu
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Compose l article comme une succession de sections premium, avec rendu live a droite.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium" style={insetPanelStyle}>
                    {blocks.length} bloc{blocks.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="rounded-[24px] border p-3 sm:p-4" style={insetPanelStyle}>
                  <BlockEditor
                    blocks={blocks}
                    onChange={handleBlocksChange}
                    templates={editorTemplates}
                  />
                </div>
              </section>

              <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Distribution et taxonomie
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Gere la couverture, les tags et le statut de publication depuis un meme espace.
                  </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[24px] border p-4" style={insetPanelStyle}>
                    <ImageUploader
                      label="Image de couverture"
                      value={form.cover_image}
                      onUpload={(url) => setForm((prev) => ({ ...prev, cover_image: url }))}
                    />
                  </div>

                  <div className="space-y-4 rounded-[24px] border p-4" style={insetPanelStyle}>
                    <div>
                      <label htmlFor="af-tag" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Tags
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="af-tag"
                          type="text"
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={handleTagKeyDown}
                          className={`${textInputClassName} flex-1`}
                          style={inputStyle}
                          placeholder="Appuyer sur Entree pour ajouter"
                        />
                        <Button type="button" variant="secondary" onClick={addTag}>
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      {form.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {form.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1">
                              <Badge>{tag}</Badge>
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="p-1 rounded"
                                style={{ color: 'var(--color-text-secondary)' }}
                                aria-label={`Supprimer le tag ${tag}`}
                              >
                                <XMarkIcon className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <label
                      className="flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3"
                      style={inputStyle}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          Publication
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Active la publication quand l article est pret a etre visible.
                        </p>
                      </div>
                      <input
                        name="published"
                        type="checkbox"
                        checked={form.published}
                        onChange={handleChange}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                    </label>
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : "Creer l'article"}
                </Button>
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
                      Etat de l article
                    </h2>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={publishedTone}
                  >
                    {form.published ? 'Live' : 'Draft'}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Autosave local', value: autosaveLabel },
                    { label: 'Slug', value: slug || 'a-definir', mono: true },
                    { label: 'Tags actifs', value: `${form.tags.length} selectionnes` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border px-4 py-3" style={insetPanelStyle}>
                      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.label}
                      </p>
                      <p className={`mt-2 text-sm font-medium ${item.mono ? 'font-mono' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {localDraftRestored && (
                  <p className="mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Un brouillon local a ete restaure automatiquement.
                  </p>
                )}
              </section>

              <section className="overflow-hidden rounded-[28px] border" style={panelStyle}>
                <div className="border-b px-5 py-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Preview
                  </p>
                  <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Apercu live article
                  </h2>
                </div>

                <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
                  {form.cover_image && (
                    <img
                      src={form.cover_image}
                      alt=""
                      className="h-48 w-full rounded-[22px] border object-cover"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}
                    />
                  )}

                  <section className="rounded-[22px] border p-4" style={insetPanelStyle}>
                    <h2 className="break-words text-2xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--color-text-primary)' }}>
                      {form.title.trim() || "Titre de l'article..."}
                    </h2>
                    {form.excerpt.trim() && (
                      <p className="mt-3 text-sm leading-7" style={{ color: 'var(--color-text-secondary)' }}>
                        {form.excerpt}
                      </p>
                    )}
                  </section>

                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map((tag) => (
                        <Badge key={`preview-${tag}`}>{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <article className="rounded-[22px] border p-4" style={insetPanelStyle}>
                    {blocks.length > 0 ? (
                      <BlockRenderer content={previewContent} />
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Ajoute des blocs pour afficher un apercu.
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
