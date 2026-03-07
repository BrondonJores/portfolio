/* Formulaire de creation et d'edition d'article. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
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
import {
  createArticle,
  getAdminArticles,
  updateArticle,
} from '../../services/articleService.js'

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
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

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
    if (!isEdit) return

    getAdminArticles()
      .then((res) => {
        const article = (res?.data || []).find((entry) => String(entry.id) === String(id))
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
      navigate('/admin/articles')
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

  return (
    <>
      <Helmet>
        <title>{isEdit ? "Modifier l'article" : 'Nouvel article'} - Administration</title>
      </Helmet>

      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
          {isEdit ? "Modifier l'article" : 'Nouvel article'}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="space-y-5 min-w-0">
              <div>
                <label htmlFor="af-title" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Titre <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  id="af-title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                  style={inputStyle}
                />
                {form.title && (
                  <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    Slug : {slug}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="af-excerpt" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Extrait
                </label>
                <textarea
                  id="af-excerpt"
                  name="excerpt"
                  value={form.excerpt}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Contenu <span style={{ color: '#f87171' }}>*</span>
                </label>
                <BlockEditor
                  blocks={blocks}
                  onChange={handleBlocksChange}
                  templates={editorTemplates}
                />
              </div>

              <ImageUploader
                label="Image de couverture"
                value={form.cover_image}
                onUpload={(url) => setForm((prev) => ({ ...prev, cover_image: url }))}
              />

              <div>
                <label htmlFor="af-tag" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    id="af-tag"
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    style={inputStyle}
                    placeholder="Appuyer sur Entree pour ajouter"
                  />
                  <Button type="button" variant="secondary" onClick={addTag}>
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1">
                        <Badge>{tag}</Badge>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-xs focus:outline-none"
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  name="published"
                  type="checkbox"
                  checked={form.published}
                  onChange={handleChange}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Publie
                </span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : "Creer l'article"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/admin/articles')}>
                  Annuler
                </Button>
              </div>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 self-start">
              <div
                className="rounded-xl border p-3 space-y-1"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
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
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Apercu live article
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Rendu en temps reel du contenu.
                  </p>
                </div>

                <div className="p-4 max-h-[72vh] overflow-y-auto space-y-4">
                  {form.cover_image && (
                    <img
                      src={form.cover_image}
                      alt=""
                      className="w-full h-40 object-cover rounded-lg border"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  )}

                  <section
                    className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                  >
                    <h2 className="text-xl font-semibold break-words" style={{ color: 'var(--color-text-primary)' }}>
                      {form.title.trim() || "Titre de l'article..."}
                    </h2>
                    {form.excerpt.trim() && (
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
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

                  <article
                    className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                  >
                    {blocks.length > 0 ? (
                      <BlockRenderer content={previewContent} />
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Ajoute des blocs pour afficher un apercu.
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
