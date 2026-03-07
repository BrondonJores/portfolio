/* Page de gestion des templates de blocs personnalisables dans l'admin. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ArrowDownTrayIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import {
  createBlockTemplate,
  deleteBlockTemplate,
  exportBlockTemplatePackage,
  getBlockTemplateReleases,
  getAdminBlockTemplates,
  importBlockTemplatePackage,
  importBlockTemplates,
  rollbackBlockTemplate,
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
 * Lit un fichier texte JSON cote navigateur.
 * @param {File} file Fichier selectionne.
 * @returns {Promise<string>} Contenu brut du fichier.
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
 * Telecharge un objet JSON en fichier cote navigateur.
 * @param {string} filename Nom du fichier de sortie.
 * @param {unknown} payload Contenu JSON.
 * @returns {void}
 */
function downloadJsonFile(filename, payload) {
  if (typeof window === 'undefined') return

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Normalise le format d'import vers { templates: [...] }.
 * Accepte:
 * - un tableau de templates
 * - un objet { templates: [...] }
 * - un template unique
 * @param {unknown} parsed Valeur JSON parsee.
 * @returns {{templates:Array<object>} | null} Payload normalise ou null.
 */
function normalizeImportPayload(parsed) {
  if (Array.isArray(parsed)) {
    return { templates: parsed }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  if (Array.isArray(parsed.templates)) {
    return { templates: parsed.templates }
  }

  if (parsed.name !== undefined || parsed.blocks !== undefined) {
    return { templates: [parsed] }
  }

  return null
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

/**
 * Formate une date de release pour affichage admin.
 * @param {unknown} value Date brute.
 * @returns {string} Date lisible ou fallback.
 */
function formatReleaseDate(value) {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return 'Date inconnue'
  return date.toLocaleString('fr-FR')
}

export default function AdminBlockTemplates() {
  const addToast = useAdminToast()
  const fileInputRef = useRef(null)

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [replaceExistingImport, setReplaceExistingImport] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [templateReleasesById, setTemplateReleasesById] = useState({})
  const [loadingReleasesId, setLoadingReleasesId] = useState(null)
  const [rollingBackReleaseId, setRollingBackReleaseId] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === editingId) || null,
    [templates, editingId]
  )
  const selectedTemplateReleases = useMemo(
    () => (selectedTemplate ? (templateReleasesById[selectedTemplate.id] || []) : []),
    [selectedTemplate, templateReleasesById]
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
   * Charge l'historique des releases d'un template.
   * @param {number|string} templateId Identifiant template.
   * @param {{force?: boolean}} [options] Options de rechargement.
   * @returns {Promise<void>} Promise resolue apres chargement.
   */
  const loadTemplateReleases = async (templateId, options = {}) => {
    const safeId = Number.parseInt(String(templateId), 10)
    if (!Number.isInteger(safeId) || safeId <= 0) return

    if (!options.force && Array.isArray(templateReleasesById[safeId])) {
      return
    }

    setLoadingReleasesId(safeId)
    try {
      const response = await getBlockTemplateReleases(safeId)
      const releases = Array.isArray(response?.data) ? response.data : []
      setTemplateReleasesById((prev) => ({ ...prev, [safeId]: releases }))
    } catch (error) {
      addToast(error.message || 'Impossible de charger les releases du template.', 'error')
    } finally {
      setLoadingReleasesId((current) => (current === safeId ? null : current))
    }
  }

  useEffect(() => {
    if (!selectedTemplate?.id) return
    loadTemplateReleases(selectedTemplate.id)
  }, [selectedTemplate?.id])

  /**
   * Ouvre le mode creation.
   * @returns {void}
   */
  const startCreate = () => {
    setEditingId(null)
    setForm(createEmptyForm())
    setRollingBackReleaseId(null)
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
    loadTemplateReleases(template.id)
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
      setTemplateReleasesById((prev) => {
        const next = { ...prev }
        delete next[confirmId]
        return next
      })

      if (editingId === confirmId) {
        startCreate()
      }
    } catch (error) {
      addToast(error.message || 'Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  /**
   * Revient a une release precise du template en cours d'edition.
   * @param {number|string} releaseId Identifiant release cible.
   * @returns {Promise<void>} Promise resolue apres rollback.
   */
  const handleRollbackTemplate = async (releaseId) => {
    const templateId = Number.parseInt(String(selectedTemplate?.id ?? ''), 10)
    const safeReleaseId = Number.parseInt(String(releaseId), 10)

    if (!Number.isInteger(templateId) || templateId <= 0) {
      addToast('Selectionne un template avant de lancer un rollback.', 'error')
      return
    }
    if (!Number.isInteger(safeReleaseId) || safeReleaseId <= 0) {
      addToast('Release invalide.', 'error')
      return
    }

    setRollingBackReleaseId(safeReleaseId)
    try {
      const response = await rollbackBlockTemplate(templateId, safeReleaseId)
      const rolledTemplate = response?.data?.template || null

      await loadTemplates()
      await loadTemplateReleases(templateId, { force: true })

      if (rolledTemplate?.id) {
        setEditingId(rolledTemplate.id)
        setForm({
          name: rolledTemplate.name || '',
          context: rolledTemplate.context || 'article',
          description: rolledTemplate.description || '',
          blocks: toEditableBlocks(rolledTemplate.blocks),
        })
      }

      addToast('Rollback du template effectue.', 'success')
    } catch (error) {
      addToast(error.message || 'Erreur lors du rollback du template.', 'error')
    } finally {
      setRollingBackReleaseId(null)
    }
  }

  /**
   * Ouvre le selecteur de fichier pour l'import JSON.
   * @returns {void}
   */
  const openImportPicker = () => {
    fileInputRef.current?.click()
  }

  /**
   * Importe des templates depuis un fichier JSON.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event Evenement de selection.
   * @returns {Promise<void>} Promise resolue apres traitement.
   */
  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    try {
      const rawText = await readFileAsText(file)
      const parsed = JSON.parse(rawText)

      if (parsed?.packageType === 'block-template-package') {
        const response = await importBlockTemplatePackage({
          ...parsed,
          replaceExisting: replaceExistingImport,
        })
        const action = response?.data?.action || 'created'
        await loadTemplates()
        addToast(`Package template importe (${action}).`, 'success')
        return
      }

      const normalized = normalizeImportPayload(parsed)

      if (!normalized || !Array.isArray(normalized.templates) || normalized.templates.length === 0) {
        addToast('Format JSON invalide. Utilise { "templates": [...] } ou un tableau.', 'error')
        return
      }

      const response = await importBlockTemplates({
        templates: normalized.templates,
        replaceExisting: replaceExistingImport,
      })

      const summary = response?.data || {}
      await loadTemplates()

      addToast(
        `Import termine: ${summary.created || 0} cree(s), ${summary.updated || 0} mis a jour, ${summary.skippedCount || 0} ignore(s).`,
        'success'
      )
    } catch (error) {
      addToast(error.message || "Erreur pendant l'import des templates.", 'error')
    } finally {
      setImporting(false)
    }
  }

  /**
   * Exporte un template unique au format package versionne.
   * @param {object} template Template source.
   * @returns {Promise<void>} Promise resolue apres telechargement.
   */
  const handleExportTemplatePackage = async (template) => {
    try {
      const response = await exportBlockTemplatePackage(template.id)
      const payload = response?.data

      if (!payload || typeof payload !== 'object') {
        throw new Error('Package template invalide.')
      }

      const safeName = String(template.name || 'template')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      downloadJsonFile(`block-template-package-${safeName || 'template'}.json`, payload)
      addToast('Package template exporte.', 'success')
    } catch (error) {
      addToast(error.message || "Erreur pendant l'export du package template.", 'error')
    }
  }

  return (
    <>
      <Helmet>
        <title>Templates de blocs - Administration</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Templates de blocs
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={replaceExistingImport}
                onChange={(event) => setReplaceExistingImport(event.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Remplacer les doublons
            </label>

            <Button variant="secondary" onClick={openImportPicker} disabled={importing}>
              {importing ? <Spinner size="sm" /> : null}
              Importer JSON
            </Button>

            <Button variant="primary" onClick={startCreate}>
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nouveau template
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
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

                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleExportTemplatePackage(template)}
                          className="w-full justify-center"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Export package
                        </Button>
                      </div>
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

              {selectedTemplate && (
                <div
                  className="rounded-lg border p-3 space-y-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Historique des versions
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => loadTemplateReleases(selectedTemplate.id, { force: true })}
                      disabled={loadingReleasesId === selectedTemplate.id || Boolean(rollingBackReleaseId)}
                    >
                      Rafraichir
                    </Button>
                  </div>

                  {loadingReleasesId === selectedTemplate.id ? (
                    <div className="flex justify-center py-2">
                      <Spinner size="sm" />
                    </div>
                  ) : selectedTemplateReleases.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Aucune release disponible pour ce template.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedTemplateReleases.map((release) => {
                        const releaseId = Number.parseInt(String(release?.id ?? ''), 10)
                        const versionNumber = Number.parseInt(String(release?.version_number ?? ''), 10)
                        const isRollingBack = rollingBackReleaseId === releaseId

                        return (
                          <div
                            key={releaseId}
                            className="rounded-lg border px-3 py-2 space-y-2"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                Version v{Number.isInteger(versionNumber) ? versionNumber : '?'}
                              </p>
                              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                                {formatReleaseDate(release?.created_at)}
                              </p>
                            </div>

                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {release?.change_note || 'Sans note de changement.'}
                            </p>

                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleRollbackTemplate(releaseId)}
                              disabled={!Number.isInteger(releaseId) || Boolean(rollingBackReleaseId)}
                              className="w-full justify-center"
                            >
                              {isRollingBack ? 'Rollback...' : `Rollback vers v${Number.isInteger(versionNumber) ? versionNumber : '?'}`}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
