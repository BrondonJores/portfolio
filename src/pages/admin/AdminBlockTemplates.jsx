/* Page de gestion des templates de blocs personnalisables dans l'admin. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownTrayIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'
import {
  isAdminEditorPopup,
  notifyAdminEditorSaved,
  openAdminEditorWindow,
  subscribeAdminEditorRefresh,
} from '../../utils/adminEditorWindow.js'
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

const panelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 78%, transparent)',
}

const metricCardStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
}

const inputStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
  color: 'var(--color-text-primary)',
}

const PAGE_LIMIT = 10

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

/**
 * Nettoie un bloc avant comparaison structurelle.
 * @param {unknown} block Bloc source.
 * @returns {unknown} Bloc normalise.
 */
function normalizeBlockForComparison(block) {
  if (!block || typeof block !== 'object') {
    return block ?? null
  }

  const cloned = JSON.parse(JSON.stringify(block))
  if (cloned && typeof cloned === 'object' && !Array.isArray(cloned)) {
    delete cloned.id
  }
  return cloned
}

/**
 * Construit un resume des ecarts entre le template courant et une release cible.
 * @param {object | null} currentTemplate Template selectionne.
 * @param {object | null} release Release cible.
 * @returns {object | null} Resume de comparaison.
 */
function buildTemplateReleaseComparison(currentTemplate, release) {
  if (!currentTemplate || !release) return null

  const snapshot = release?.snapshot && typeof release.snapshot === 'object'
    ? release.snapshot
    : {}

  const currentName = String(currentTemplate?.name || '')
  const targetName = String(snapshot?.name || '')
  const currentContext = String(currentTemplate?.context || '')
  const targetContext = String(snapshot?.context || '')
  const currentDescription = String(currentTemplate?.description || '')
  const targetDescription = String(snapshot?.description || '')

  const currentBlocks = Array.isArray(currentTemplate?.blocks) ? currentTemplate.blocks : []
  const targetBlocks = Array.isArray(snapshot?.blocks) ? snapshot.blocks : []
  const maxLength = Math.max(currentBlocks.length, targetBlocks.length)
  const changedBlockIndexes = []

  for (let index = 0; index < maxLength; index += 1) {
    const currentBlock = normalizeBlockForComparison(currentBlocks[index])
    const targetBlock = normalizeBlockForComparison(targetBlocks[index])
    if (JSON.stringify(currentBlock) !== JSON.stringify(targetBlock)) {
      changedBlockIndexes.push(index + 1)
    }
  }

  return {
    nameChanged: currentName !== targetName,
    contextChanged: currentContext !== targetContext,
    descriptionChanged: currentDescription !== targetDescription,
    currentBlocksCount: currentBlocks.length,
    targetBlocksCount: targetBlocks.length,
    changedBlockIndexes,
  }
}

export default function AdminBlockTemplates() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [comparingReleaseId, setComparingReleaseId] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const editorParam = searchParams.get('editor')

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === editingId) || null,
    [templates, editingId]
  )
  const selectedTemplateReleases = useMemo(
    () => (selectedTemplate ? (templateReleasesById[selectedTemplate.id] || []) : []),
    [selectedTemplate, templateReleasesById]
  )
  const selectedComparedRelease = useMemo(
    () =>
      selectedTemplateReleases.find(
        (release) => Number.parseInt(String(release?.id ?? ''), 10) === comparingReleaseId
      ) || null,
    [selectedTemplateReleases, comparingReleaseId]
  )
  const selectedReleaseComparison = useMemo(
    () => buildTemplateReleaseComparison(selectedTemplate, selectedComparedRelease),
    [selectedTemplate, selectedComparedRelease]
  )
  const activeContextsCount = useMemo(
    () => new Set(templates.map((template) => template.context).filter(Boolean)).size,
    [templates]
  )
  const versionedTemplatesCount = useMemo(
    () => Object.values(templateReleasesById).filter((releases) => Array.isArray(releases) && releases.length > 0).length,
    [templateReleasesById]
  )

  const loadTemplates = async (requestedPage = page) => {
    setLoading(true)
    try {
      const requestedOffset = toOffsetFromPage(requestedPage, PAGE_LIMIT)
      const response = await getAdminBlockTemplates({
        limit: PAGE_LIMIT,
        offset: requestedOffset,
      })
      if (Array.isArray(response?.data)) {
        const total = response.data.length
        const maxOffset = total === 0 ? 0 : Math.floor((total - 1) / PAGE_LIMIT) * PAGE_LIMIT
        const safeOffset = Math.min(requestedOffset, maxOffset)
        const items = response.data.slice(safeOffset, safeOffset + PAGE_LIMIT)
        setTemplates(items)
        setPagination({
          total,
          limit: PAGE_LIMIT,
          offset: safeOffset,
        })
        const nextPage = Math.floor(safeOffset / PAGE_LIMIT) + 1
        setPage(nextPage)
        return
      }
      const normalized = normalizeAdminPagePayload(response?.data, {
        defaultLimit: PAGE_LIMIT,
        requestedOffset,
      })
      setTemplates(normalized.items)
      setPagination({
        total: normalized.total,
        limit: normalized.limit,
        offset: normalized.offset,
      })
      const nextPage = Math.floor(normalized.offset / normalized.limit) + 1
      setPage(nextPage)
    } catch (error) {
      addToast(error.message || 'Erreur lors du chargement des templates.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates(page)
  }, [page])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'templates' || payload?.entity === 'global') {
        loadTemplates(page)
      }
    })
  }, [page])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || PAGE_LIMIT)))
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [pagination.total, pagination.limit, page])

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
    setComparingReleaseId(null)
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
    setComparingReleaseId(null)
    loadTemplateReleases(template.id)
  }

  useEffect(() => {
    if (!editorParam) return

    if (editorParam === 'new') {
      startCreate()
      return
    }

    const parsedId = Number.parseInt(editorParam, 10)
    if (!Number.isInteger(parsedId) || parsedId <= 0) return

    const target = templates.find((template) => Number(template.id) === parsedId)
    if (target && editingId !== target.id) {
      startEdit(target)
    }
  }, [editorParam, templates, editingId])

  /**
   * Ferme la fenetre popup ou revient a la vue liste.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/templates')
      }
      return
    }

    if (editorParam) {
      navigate('/admin/templates', { replace: true })
    } else {
      startCreate()
    }
  }

  /**
   * Ouvre l'editeur template dans une fenetre dediee.
   * @param {'new' | number} target Cible d'edition.
   * @param {() => void} fallback Action locale si popup bloquee.
   * @returns {void}
   */
  const openTemplateEditor = (target, fallback) => {
    if (isAdminEditorPopup()) {
      fallback()
      return
    }

    const path =
      target === 'new'
        ? '/admin/templates?editor=new'
        : `/admin/templates?editor=${target}`

    const popup = openAdminEditorWindow(path, {
      windowName: 'portfolio-admin-template-editor',
      width: 1480,
      height: 920,
    })

    if (!popup) {
      fallback()
    }
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
      notifyAdminEditorSaved('templates')

      if (response?.data) {
        startEdit(response.data)
      } else {
        startCreate()
      }

      if (isAdminEditorPopup()) {
        closeEditorOrBack()
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
      notifyAdminEditorSaved('templates')
      await loadTemplates()
      setTemplateReleasesById((prev) => {
        const next = { ...prev }
        delete next[confirmId]
        return next
      })

      if (editingId === confirmId) {
        startCreate()
      }
      if (comparingReleaseId) {
        setComparingReleaseId(null)
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
      notifyAdminEditorSaved('templates')
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
      setComparingReleaseId(null)

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
        notifyAdminEditorSaved('templates')
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
      notifyAdminEditorSaved('templates')

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
                Template studio
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  Des blocs reutilisables, mais enfin presentes comme un vrai systeme.
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Cree, versionne, importe et compare tes templates depuis un studio plus lisible,
                  avec une meilleure separation entre catalogue, edition et historique.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <label className="inline-flex items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-sm" style={metricCardStyle}>
                <span style={{ color: 'var(--color-text-primary)' }}>Remplacer les doublons</span>
                <input
                  type="checkbox"
                  checked={replaceExistingImport}
                  onChange={(event) => setReplaceExistingImport(event.target.checked)}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
              </label>

              <Button variant="secondary" onClick={openImportPicker} disabled={importing}>
                {importing ? <Spinner size="sm" /> : null}
                Importer JSON
              </Button>

              <Button
                variant="primary"
                onClick={() =>
                  openTemplateEditor('new', () => {
                    startCreate()
                  })
                }
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Nouveau template
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Templates actifs', value: pagination.total },
              { label: 'Contextes couverts', value: activeContextsCount },
              { label: 'Avec historique', value: versionedTemplatesCount },
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
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className="h-fit rounded-[28px] border p-4 space-y-3" style={panelStyle}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Templates existants
              </p>

              {templates.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun template personnalise pour le moment.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <article
                        key={template.id}
                        className="rounded-[24px] border p-4 transition-transform duration-200 hover:-translate-y-0.5"
                        style={{
                          borderColor: editingId === template.id
                            ? 'color-mix(in srgb, var(--color-accent) 72%, var(--color-border))'
                            : 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {template.name}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {CONTEXT_LABELS[template.context] || template.context} · {Array.isArray(template.blocks) ? template.blocks.length : 0} bloc(s)
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                openTemplateEditor(template.id, () => {
                                  startEdit(template)
                                })
                              }
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
                          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
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
                  <AdminPagination
                    total={pagination.total}
                    limit={pagination.limit}
                    offset={pagination.offset}
                    onPageChange={(nextPage) => setPage(nextPage)}
                  />
                </>
              )}
            </section>

            <section className="min-w-0 rounded-[28px] border p-5 space-y-4" style={panelStyle}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Nom du template
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
                    className="w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
                  className="w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
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
                  allowSections
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Spinner size="sm" /> : editingId ? 'Mettre a jour' : 'Creer le template'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetCurrentForm}>
                  Reinitialiser
                </Button>
                {isAdminEditorPopup() && (
                  <Button type="button" variant="ghost" onClick={closeEditorOrBack}>
                    Fermer
                  </Button>
                )}
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
                        const isComparing = comparingReleaseId === releaseId
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
                              variant={isComparing ? 'primary' : 'secondary'}
                              onClick={() =>
                                setComparingReleaseId((prev) =>
                                  prev === releaseId ? null : releaseId
                                )
                              }
                              disabled={!Number.isInteger(releaseId) || Boolean(rollingBackReleaseId)}
                              className="w-full justify-center"
                            >
                              {isComparing ? 'Masquer comparaison' : `Comparer avec v${Number.isInteger(versionNumber) ? versionNumber : '?'}`}
                            </Button>

                            {isComparing && selectedReleaseComparison && (
                              <div
                                className="rounded-lg border p-2 space-y-2"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  backgroundColor: 'var(--color-bg-primary)',
                                }}
                              >
                                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                  Comparaison avant rollback
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                  Nom: {selectedReleaseComparison.nameChanged ? 'modifie' : 'identique'} | Contexte: {selectedReleaseComparison.contextChanged ? 'modifie' : 'identique'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                  Description: {selectedReleaseComparison.descriptionChanged ? 'modifiee' : 'identique'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                  Blocs: {selectedReleaseComparison.currentBlocksCount}{' -> '}{selectedReleaseComparison.targetBlocksCount} (changes: {selectedReleaseComparison.changedBlockIndexes.length})
                                </p>

                                {selectedReleaseComparison.changedBlockIndexes.length > 0 && (
                                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                                    Positions impactees: {selectedReleaseComparison.changedBlockIndexes.slice(0, 10).join(', ')}
                                    {selectedReleaseComparison.changedBlockIndexes.length > 10
                                      ? ` (+${selectedReleaseComparison.changedBlockIndexes.length - 10} autres)`
                                      : ''}
                                  </p>
                                )}

                                <Button
                                  type="button"
                                  variant="primary"
                                  onClick={() => handleRollbackTemplate(releaseId)}
                                  disabled={!Number.isInteger(releaseId) || Boolean(rollingBackReleaseId)}
                                  className="w-full justify-center"
                                >
                                  {isRollingBack ? 'Rollback...' : `Confirmer rollback vers v${Number.isInteger(versionNumber) ? versionNumber : '?'}`}
                                </Button>
                              </div>
                            )}
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
