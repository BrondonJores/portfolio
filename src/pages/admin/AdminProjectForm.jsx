/* Formulaire de creation et d'edition de projet. */
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
import { PROJECT_BLOCK_TEMPLATES } from '../../constants/blockTemplates.js'
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
  createProject,
  getAdminProjects,
  updateProject,
} from '../../services/projectService.js'

const EMPTY = {
  title: '',
  description: '',
  content: '',
  github_url: '',
  demo_url: '',
  image_url: '',
  featured: false,
  published: true,
  tags: [],
}

const AUTOSAVE_DEBOUNCE_MS = 800
const LOCAL_DRAFT_PREFIX = 'portfolio_project_form_draft'

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

/**
 * Genere un slug lisible a partir du titre.
 * @param {string} value Texte source.
 * @returns {string} Slug calcule.
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
 * Parse le contenu projet (JSON blocks ou texte brut) vers des blocs.
 * @param {string | null | undefined} content Contenu source.
 * @returns {Array<object>} Tableau de blocs.
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
 * Construit la cle localStorage du brouillon.
 * @param {boolean} isEdit true si edition.
 * @param {string | undefined} projectId Identifiant projet.
 * @returns {string} Cle localStorage.
 */
function getLocalDraftKey(isEdit, projectId) {
  return isEdit ? `${LOCAL_DRAFT_PREFIX}_edit_${projectId}` : `${LOCAL_DRAFT_PREFIX}_new`
}

export default function AdminProjectForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useAdminToast()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [blocks, setBlocks] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const builderChannel = useMemo(() => createBuilderChannel('project', id || 'new'), [id])

  const draftStorageKey = useMemo(() => getLocalDraftKey(isEdit, id), [isEdit, id])
  const previewContent = useMemo(() => JSON.stringify({ blocks }), [blocks])
  const hasDraftContent = useMemo(
    () =>
      Boolean(
        form.title.trim() ||
        form.description.trim() ||
        form.image_url ||
        form.github_url ||
        form.demo_url ||
        (form.tags || []).length > 0 ||
        blocks.length > 0
      ),
    [form.title, form.description, form.image_url, form.github_url, form.demo_url, form.tags, blocks]
  )
  const draftData = useMemo(
    () => ({
      title: form.title,
      description: form.description,
      image_url: form.image_url,
      github_url: form.github_url,
      demo_url: form.demo_url,
      featured: form.featured,
      published: form.published,
      tags: form.tags || [],
      blocks,
    }),
    [
      form.title,
      form.description,
      form.image_url,
      form.github_url,
      form.demo_url,
      form.featured,
      form.published,
      form.tags,
      blocks,
    ]
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
      description: typeof draft?.description === 'string' ? draft.description : '',
      image_url: typeof draft?.image_url === 'string' ? draft.image_url : '',
      github_url: typeof draft?.github_url === 'string' ? draft.github_url : '',
      demo_url: typeof draft?.demo_url === 'string' ? draft.demo_url : '',
      featured: Boolean(draft?.featured),
      published: typeof draft?.published === 'boolean' ? draft.published : true,
      tags: Array.isArray(draft?.tags) ? draft.tags : [],
      content: JSON.stringify({ blocks: restoredBlocks }),
    }))
    addToast('Brouillon local projet restaure.', 'info')
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
    context: 'project',
    fallbackTemplates: PROJECT_BLOCK_TEMPLATES,
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
   * Retourne a la liste projets ou ferme la popup d'edition.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/projets')
      }
      return
    }
    navigate('/admin/projets')
  }

  useEffect(() => {
    if (!isEdit) return

    getAdminProjects()
      .then((res) => {
        const project = (res?.data || []).find((entry) => String(entry.id) === String(id))
        if (!project) return

        const loadedForm = {
          title: project.title || '',
          description: project.description || '',
          content: project.content || '',
          github_url: project.github_url || '',
          demo_url: project.demo_url || '',
          image_url: project.image_url || '',
          featured: project.featured || false,
          published: project.published !== false,
          tags: project.tags || [],
        }

        setForm(loadedForm)
        setBlocks(parseContent(project.content || ''))
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  /**
   * Met a jour un champ du formulaire projet.
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event Evenement input.
   * @returns {void}
   */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  /**
   * Met a jour les blocs de contenu.
   * @param {Array<object>} nextBlocks Blocs modifies.
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
      entity: 'project',
      title: form.title || 'Projet',
      blocks,
      templates: editorTemplates,
    })

    const builderTab = openAdminVisualBuilder({
      entity: 'project',
      channel: builderChannel,
    })

    if (!builderTab) {
      navigate(`/admin/builder?entity=project&channel=${encodeURIComponent(builderChannel)}`)
    }
  }

  /**
   * Ajoute un tag unique.
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
   * Supprime un tag.
   * @param {string} tag Tag a supprimer.
   * @returns {void}
   */
  const removeTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((entry) => entry !== tag) }))
  }

  /**
   * Gere la saisie des tags au clavier.
   * @param {React.KeyboardEvent<HTMLInputElement>} event Evenement clavier.
   * @returns {void}
   */
  const handleTagKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addTag()
  }

  /**
   * Sauvegarde le projet.
   * @param {React.FormEvent<HTMLFormElement>} event Evenement submit.
   * @returns {Promise<void>} Promise de sauvegarde.
   */
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      addToast('Le titre est obligatoire.', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateProject(id, form)
        addToast('Projet mis a jour.', 'success')
      } else {
        await createProject(form)
        addToast('Projet cree avec succes.', 'success')
      }

      clearDraft()
      notifyAdminEditorSaved('projects')
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

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Modifier le projet' : 'Nouveau projet'} - Administration</title>
      </Helmet>

      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
          {isEdit ? 'Modifier le projet' : 'Nouveau projet'}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="space-y-5 min-w-0">
              <div>
                <label htmlFor="pf-title" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Titre <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  id="pf-title"
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
                <label htmlFor="pf-desc" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Description
                </label>
                <textarea
                  id="pf-desc"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
                  style={inputStyle}
                />
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
                  onChange={handleBlocksChange}
                  templates={editorTemplates}
                />
              </div>

              <div>
                <label htmlFor="pf-tag" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    id="pf-tag"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pf-github" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    URL GitHub
                  </label>
                  <input
                    id="pf-github"
                    name="github_url"
                    type="url"
                    value={form.github_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="pf-demo" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    URL Demo
                  </label>
                  <input
                    id="pf-demo"
                    name="demo_url"
                    type="url"
                    value={form.demo_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    style={inputStyle}
                  />
                </div>
              </div>

              <ImageUploader
                label="Image du projet"
                value={form.image_url}
                onUpload={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
              />

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    name="featured"
                    type="checkbox"
                    checked={form.featured}
                    onChange={handleChange}
                    className="rounded focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Mis en avant
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    name="published"
                    type="checkbox"
                    checked={form.published}
                    onChange={handleChange}
                    className="rounded focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Publie
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : 'Creer le projet'}
                </Button>
                <Button type="button" variant="ghost" onClick={closeEditorOrBack}>
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
                    Apercu live projet
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Rendu en temps reel du projet.
                  </p>
                </div>

                <div className="p-4 max-h-[72vh] overflow-y-auto space-y-4">
                  {form.image_url && (
                    <img
                      src={form.image_url}
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
                      {form.title.trim() || 'Titre du projet...'}
                    </h2>
                    {form.description.trim() && (
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {form.description}
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

                  {(form.github_url || form.demo_url) && (
                    <section
                      className="rounded-lg border p-3 space-y-1"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                    >
                      {form.github_url && (
                        <p className="text-sm break-all" style={{ color: 'var(--color-text-secondary)' }}>
                          GitHub: {form.github_url}
                        </p>
                      )}
                      {form.demo_url && (
                        <p className="text-sm break-all" style={{ color: 'var(--color-text-secondary)' }}>
                          Demo: {form.demo_url}
                        </p>
                      )}
                    </section>
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
