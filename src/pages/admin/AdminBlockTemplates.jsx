/* Page de gestion des templates de blocs personnalisables dans l'admin. */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import {
  createBlockTemplate,
  deleteBlockTemplate,
  getAdminBlockTemplates,
  updateBlockTemplate,
} from '../../services/blockTemplateService.js'

const CONTEXT_OPTIONS = [
  { value: 'article', label: 'Articles' },
  { value: 'project', label: 'Projets' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'all', label: 'Global (tous)' },
]

const CONTEXT_LABELS = {
  article: 'Articles',
  project: 'Projets',
  newsletter: 'Newsletter',
  all: 'Global',
}

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

/**
 * Genere un identifiant temporaire pour les blocs de l'editeur.
 * @returns {string} Identifiant unique.
 */
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Cree un tableau de blocs minimal pour initialiser un template vide.
 * @returns {Array<object>} Blocs initiaux.
 */
function createEmptyBlocks() {
  return [{ id: genId(), type: 'paragraph', content: '' }]
}

/**
 * Clone profond compatible avec les navigateurs ne supportant pas structuredClone.
 * @param {unknown} value Valeur a cloner.
 * @returns {unknown} Copie profonde.
 */
function safeClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

/**
 * Prepare les blocs venant de l'API pour BlockEditor (injection d'id si absent).
 * @param {Array<object>} blocks Blocs de template.
 * @returns {Array<object>} Blocs prets a editer.
 */
function toEditableBlocks(blocks) {
  const source = Array.isArray(blocks) ? blocks : []
  if (source.length === 0) return createEmptyBlocks()

  return source.map((block) => {
    const cloned = safeClone(block)
    return { ...cloned, id: cloned.id || genId() }
  })
}

/**
 * Retire les identifiants de blocs avant envoi au backend.
 * @param {Array<object>} blocks Blocs edites.
 * @returns {Array<object>} Blocs serialisables.
 */
function stripBlockIds(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => {
    const cloned = safeClone(block)
    delete cloned.id
    return cloned
  })
}

/**
 * Formulaire de base d'un template admin.
 * @returns {{name: string, context: string, description: string, blocks: Array<object>}} Etat initial.
 */
function createEmptyForm() {
  return {
    name: '',
    context: 'article',
    description: '',
    blocks: createEmptyBlocks(),
  }
}

export default function AdminBlockTemplates() {
  const addToast = useAdminToast()

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === editingId) || null,
    [templates, editingId]
  )

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await getAdminBlockTemplates()
      setTemplates(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      addToast(error.message || 'Erreur lors du chargement des templates.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  /**
   * Ouvre le mode creation.
   * @returns {void}
   */
  const startCreate = () => {
    setEditingId(null)
    setForm(createEmptyForm())
  }

  /**
   * Ouvre le mode edition pour un template existant.
   * @param {object} template Template cible.
   * @returns {void}
   */
  const startEdit = (template) => {
    setEditingId(template.id)
    setForm({
      name: template.name || '',
      context: template.context || 'article',
      description: template.description || '',
      blocks: toEditableBlocks(template.blocks),
    })
  }

  /**
   * Recharge le formulaire depuis le template courant.
   * @returns {void}
   */
  const resetCurrentForm = () => {
    if (!selectedTemplate) {
      startCreate()
      return
    }
    startEdit(selectedTemplate)
  }

  /**
   * Enregistre le template (creation ou mise a jour).
   * @returns {Promise<void>} Promise de sauvegarde.
   */
  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Le nom du template est obligatoire.', 'error')
      return
    }

    if (!Array.isArray(form.blocks) || form.blocks.length === 0) {
      addToast('Le template doit contenir au moins un bloc.', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        context: form.context,
        description: form.description.trim(),
        blocks: stripBlockIds(form.blocks),
      }

      let response
      if (editingId) {
        response = await updateBlockTemplate(editingId, payload)
        addToast('Template mis a jour.', 'success')
      } else {
        response = await createBlockTemplate(payload)
        addToast('Template cree.', 'success')
      }

      await loadTemplates()

      if (response?.data) {
        startEdit(response.data)
      } else {
        startCreate()
      }
    } catch (error) {
      addToast(error.message || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Supprime le template selectionne dans la confirmation.
   * @returns {Promise<void>} Promise de suppression.
   */
  const handleDelete = async () => {
    if (!confirmId) return

    try {
      await deleteBlockTemplate(confirmId)
      addToast('Template supprime.', 'success')
      await loadTemplates()

      if (editingId === confirmId) {
        startCreate()
      }
    } catch (error) {
      addToast(error.message || 'Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  return (
    <>
      <Helmet>
        <title>Templates de blocs - Administration</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Templates de blocs
          </h1>

          <Button variant="primary" onClick={startCreate}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nouveau template
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section
              className="rounded-xl border p-4 space-y-3 h-fit"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Templates existants
              </p>

              {templates.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun template personnalise pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <article
                      key={template.id}
                      className="rounded-lg border p-3"
                      style={{
                        borderColor: editingId === template.id ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: 'var(--color-bg-primary)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {template.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {CONTEXT_LABELS[template.context] || template.context} ·{' '}
                            {Array.isArray(template.blocks) ? template.blocks.length : 0} bloc(s)
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(template)}
                            className="p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={`Modifier ${template.name}`}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(template.id)}
                            className="p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={`Supprimer ${template.name}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {template.description && (
                        <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                          {template.description}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              className="rounded-xl border p-4 space-y-4 min-w-0"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Nom du template
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                    placeholder="Ex: Case study complet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Contexte
                  </label>
                  <select
                    value={form.context}
                    onChange={(event) => setForm((prev) => ({ ...prev, context: event.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                  >
                    {CONTEXT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Description (optionnelle)
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Structure du template
                </label>
                <BlockEditor
                  blocks={form.blocks}
                  onChange={(nextBlocks) => setForm((prev) => ({ ...prev, blocks: nextBlocks }))}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Spinner size="sm" /> : editingId ? 'Mettre a jour' : 'Creer le template'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetCurrentForm}>
                  Reinitialiser
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmId)}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer le template"
        message="Cette action est irreversible. Le template sera supprime definitivement."
      />
    </>
  )
}
