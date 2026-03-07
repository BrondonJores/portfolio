/* Page admin pour gerer les presets de theme (CRUD + apply + import/export + affectations). */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  EyeSlashIcon,
  PaintBrushIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAdminSettings, updateSettings } from '../../services/settingService.js'
import {
  applyThemePreset,
  createThemePreset,
  deleteThemePreset,
  getThemePresets,
  updateThemePreset,
} from '../../services/themePresetService.js'
import { PAGE_THEME_TARGETS } from '../../utils/pageThemeTargets.js'
import { DEFAULT_THEME_SETTINGS } from '../../utils/themeSettings.js'

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

const THEME_KEYS = Object.keys(DEFAULT_THEME_SETTINGS)

/**
 * Extrait uniquement les cles de theme supportees.
 * @param {Record<string, unknown>} settings Settings complets.
 * @returns {Record<string, string>} Snapshot theme nettoye.
 */
function pickThemeSettings(settings) {
  const next = {}

  for (const key of THEME_KEYS) {
    if (settings[key] !== undefined) {
      next[key] = String(settings[key])
    }
  }

  return next
}

/**
 * Etat initial du formulaire preset.
 * @returns {{name: string, description: string}} Formulaire vide.
 */
function createEmptyForm() {
  return { name: '', description: '' }
}

/**
 * Lit les affectations page->preset stockees dans les settings.
 * @param {Record<string, unknown>} settings Settings admin.
 * @returns {Record<string, string>} Map par id de cible.
 */
function readAssignmentsFromSettings(settings) {
  const next = {}

  for (const target of PAGE_THEME_TARGETS) {
    const raw = settings?.[target.settingKey]
    const parsed = Number.parseInt(String(raw ?? ''), 10)
    next[target.id] = Number.isInteger(parsed) && parsed > 0 ? String(parsed) : ''
  }

  return next
}

/**
 * Transforme un JSON importe en tableau de presets candidats.
 * @param {unknown} payload JSON parse.
 * @returns {Array<object>} Presets detectes.
 */
function toImportCandidates(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.presets)) {
      return payload.presets
    }
    return [payload]
  }

  return []
}

/**
 * Telecharge un fichier JSON dans le navigateur.
 * @param {string} filename Nom du fichier.
 * @param {unknown} payload Contenu JSON.
 * @returns {void}
 */
function downloadJsonFile(filename, payload) {
  if (typeof window === 'undefined') {
    return
  }

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
 * Normalise une chaine pour les comparaisons de noms.
 * @param {unknown} value Valeur brute.
 * @returns {string} Chaine normalisee.
 */
function normalizeTextKey(value) {
  return String(value || '').trim().toLowerCase()
}

export default function AdminThemePresets() {
  const addToast = useAdminToast()
  const { refreshSettings, refreshThemePresets, updateLocalSettings } = useSettings()

  const [presets, setPresets] = useState([])
  const [currentSettings, setCurrentSettings] = useState({})
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAssignments, setSavingAssignments] = useState(false)
  const [importing, setImporting] = useState(false)
  const [applyingId, setApplyingId] = useState(null)
  const [previewingId, setPreviewingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())

  const importInputRef = useRef(null)
  const previewBaseRef = useRef(null)

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === editingId) || null,
    [presets, editingId]
  )

  const snapshotSettings = useMemo(
    () => pickThemeSettings(currentSettings),
    [currentSettings]
  )

  const snapshotCount = Object.keys(snapshotSettings).length

  const loadData = async () => {
    setLoading(true)
    try {
      const [presetsRes, settingsRes] = await Promise.all([getThemePresets(), getAdminSettings()])
      const nextPresets = Array.isArray(presetsRes?.data) ? presetsRes.data : []
      const nextSettings = settingsRes?.data || {}

      setPresets(nextPresets)
      setCurrentSettings(nextSettings)
      setAssignments(readAssignmentsFromSettings(nextSettings))
    } catch (error) {
      addToast(error.message || 'Erreur lors du chargement des presets de theme.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    return () => {
      if (previewBaseRef.current) {
        updateLocalSettings(previewBaseRef.current)
        previewBaseRef.current = null
      }
    }
  }, [updateLocalSettings])

  /**
   * Passe en mode creation.
   * @returns {void}
   */
  const startCreate = () => {
    setEditingId(null)
    setForm(createEmptyForm())
  }

  /**
   * Passe en mode edition pour un preset existant.
   * @param {object} preset Preset cible.
   * @returns {void}
   */
  const startEdit = (preset) => {
    setEditingId(preset.id)
    setForm({
      name: preset.name || '',
      description: preset.description || '',
    })
  }

  /**
   * Cree ou met a jour les metadonnees du preset.
   * En creation, capture automatiquement le theme actuel.
   * @returns {Promise<void>} Promise de sauvegarde.
   */
  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Le nom du preset est obligatoire.', 'error')
      return
    }

    setSaving(true)
    try {
      let response
      if (editingId) {
        response = await updateThemePreset(editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
        })
        addToast('Preset de theme mis a jour.', 'success')
      } else {
        response = await createThemePreset({
          name: form.name.trim(),
          description: form.description.trim(),
          settings: snapshotSettings,
        })
        addToast('Preset de theme cree a partir du theme actuel.', 'success')
      }

      await loadData()
      await refreshThemePresets()

      if (response?.data) {
        startEdit(response.data)
      }
    } catch (error) {
      addToast(error.message || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Met a jour le preset selectionne avec le theme actuel.
   * @returns {Promise<void>} Promise de mise a jour.
   */
  const captureCurrentThemeToPreset = async () => {
    if (!editingId) {
      addToast('Selectionne un preset a mettre a jour.', 'error')
      return
    }

    setSaving(true)
    try {
      await updateThemePreset(editingId, { settings: snapshotSettings })
      addToast('Preset synchronise avec le theme actuel.', 'success')
      await loadData()
      await refreshThemePresets()
    } catch (error) {
      addToast(error.message || 'Erreur lors de la synchronisation.', 'error')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Active un apercu live du preset sans persister en base.
   * @param {object} preset Preset cible.
   * @returns {void}
   */
  const startPreview = (preset) => {
    const previewPatch = pickThemeSettings(preset?.settings || {})
    if (Object.keys(previewPatch).length === 0) {
      addToast('Ce preset ne contient pas de theme exploitable.', 'error')
      return
    }

    if (!previewBaseRef.current) {
      previewBaseRef.current = snapshotSettings
    }

    updateLocalSettings(previewPatch)
    setPreviewingId(preset.id)
  }

  /**
   * Arrete l'apercu live et restaure le theme initial.
   * @returns {void}
   */
  const stopPreview = () => {
    if (!previewBaseRef.current) {
      setPreviewingId(null)
      return
    }

    updateLocalSettings(previewBaseRef.current)
    previewBaseRef.current = null
    setPreviewingId(null)
    addToast('Apercu annule, theme restaure.', 'success')
  }

  /**
   * Applique un preset sur les settings globaux.
   * @param {number} id Identifiant preset.
   * @returns {Promise<void>} Promise d'application.
   */
  const handleApply = async (id) => {
    setApplyingId(id)
    try {
      await applyThemePreset(id)
      await refreshSettings()
      await refreshThemePresets()

      const fresh = await getAdminSettings()
      setCurrentSettings(fresh?.data || {})

      previewBaseRef.current = null
      setPreviewingId(null)

      addToast('Preset de theme applique.', 'success')
    } catch (error) {
      addToast(error.message || "Erreur lors de l'application du preset.", 'error')
    } finally {
      setApplyingId(null)
    }
  }

  /**
   * Supprime le preset confirme.
   * @returns {Promise<void>} Promise de suppression.
   */
  const handleDelete = async () => {
    if (!confirmId) return

    try {
      await deleteThemePreset(confirmId)
      addToast('Preset supprime.', 'success')
      await loadData()
      await refreshThemePresets()

      if (editingId === confirmId) {
        startCreate()
      }
      if (previewingId === confirmId) {
        stopPreview()
      }
    } catch (error) {
      addToast(error.message || 'Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  /**
   * Exporte tous les presets au format JSON.
   * @returns {void}
   */
  const exportAllPresets = () => {
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      presets: presets.map((preset) => ({
        name: preset.name,
        description: preset.description || '',
        settings: pickThemeSettings(preset.settings || {}),
      })),
    }

    const dateStamp = new Date().toISOString().slice(0, 10)
    downloadJsonFile(`theme-presets-${dateStamp}.json`, payload)
  }

  /**
   * Exporte un preset unique au format JSON.
   * @param {object} preset Preset a exporter.
   * @returns {void}
   */
  const exportOnePreset = (preset) => {
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      name: preset.name,
      description: preset.description || '',
      settings: pickThemeSettings(preset.settings || {}),
    }

    const safeName = String(preset.name || 'preset')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    downloadJsonFile(`theme-preset-${safeName || 'preset'}.json`, payload)
  }

  /**
   * Ouvre le selecteur de fichier pour importer un JSON.
   * @returns {void}
   */
  const requestImport = () => {
    importInputRef.current?.click()
  }

  /**
   * Importe un JSON de presets (collection ou preset unique).
   * Si un preset porte deja le meme nom, il est mis a jour.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event Changement input file.
   * @returns {Promise<void>} Promise d'import.
   */
  const handleImportFile = async (event) => {
    const inputElement = event.target
    const file = inputElement.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const rawContent = await file.text()
      const parsed = JSON.parse(rawContent)
      const candidates = toImportCandidates(parsed)

      if (candidates.length === 0) {
        throw new Error('Le fichier JSON ne contient aucun preset.')
      }

      const byName = new Map(
        presets.map((preset) => [normalizeTextKey(preset.name), preset])
      )

      let created = 0
      let updated = 0
      let skipped = 0

      for (const candidate of candidates) {
        const name = typeof candidate?.name === 'string' ? candidate.name.trim() : ''
        const description = typeof candidate?.description === 'string' ? candidate.description.trim() : ''
        const settings = pickThemeSettings(candidate?.settings || {})

        if (!name || Object.keys(settings).length === 0) {
          skipped += 1
          continue
        }

        const existing = byName.get(normalizeTextKey(name))
        if (existing) {
          const response = await updateThemePreset(existing.id, { name, description, settings })
          byName.set(normalizeTextKey(name), response?.data || existing)
          updated += 1
        } else {
          const response = await createThemePreset({ name, description, settings })
          if (response?.data) {
            byName.set(normalizeTextKey(name), response.data)
          }
          created += 1
        }
      }

      if (created === 0 && updated === 0) {
        throw new Error('Aucun preset valide n a ete trouve dans ce fichier.')
      }

      await loadData()
      await refreshThemePresets()

      addToast(
        `Import termine: ${created} cree(s), ${updated} mis a jour, ${skipped} ignore(s).`,
        'success'
      )
    } catch (error) {
      addToast(error.message || "Erreur pendant l'import JSON.", 'error')
    } finally {
      inputElement.value = ''
      setImporting(false)
    }
  }

  /**
   * Change localement l'affectation d'une page vers un preset.
   * @param {string} targetId Identifiant de cible.
   * @param {string} presetId Identifiant preset selectionne.
   * @returns {void}
   */
  const handleAssignmentChange = (targetId, presetId) => {
    setAssignments((prev) => ({ ...prev, [targetId]: presetId }))
  }

  /**
   * Persiste les affectations de themes par page.
   * @returns {Promise<void>} Promise de sauvegarde.
   */
  const handleSaveAssignments = async () => {
    setSavingAssignments(true)
    try {
      const payload = {}
      for (const target of PAGE_THEME_TARGETS) {
        payload[target.settingKey] = assignments[target.id] || ''
      }

      await updateSettings(payload)
      await refreshSettings()

      const fresh = await getAdminSettings()
      const nextSettings = fresh?.data || {}
      setCurrentSettings(nextSettings)
      setAssignments(readAssignmentsFromSettings(nextSettings))

      addToast('Affectations de themes enregistrees.', 'success')
    } catch (error) {
      addToast(error.message || "Erreur lors de l'enregistrement des affectations.", 'error')
    } finally {
      setSavingAssignments(false)
    }
  }

  /**
   * Reinitialise localement les affectations par page.
   * @returns {void}
   */
  const resetAssignments = () => {
    const cleared = {}
    for (const target of PAGE_THEME_TARGETS) {
      cleared[target.id] = ''
    }
    setAssignments(cleared)
  }

  return (
    <>
      <Helmet>
        <title>Presets de theme - Administration</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Presets de theme
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" type="button" onClick={exportAllPresets} disabled={presets.length === 0}>
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              Exporter JSON
            </Button>
            <Button variant="secondary" type="button" onClick={requestImport} disabled={importing}>
              <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
              {importing ? 'Import en cours...' : 'Importer JSON'}
            </Button>
            <Button variant="primary" onClick={startCreate}>
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nouveau preset
            </Button>
          </div>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />

        {previewingId && (
          <div
            className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Apercu live actif: {presets.find((preset) => preset.id === previewingId)?.name || 'Preset'}
            </p>
            <Button type="button" variant="ghost" onClick={stopPreview}>
              <EyeSlashIcon className="h-4 w-4" />
              Arreter l'apercu
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section
              className="rounded-xl border p-4 space-y-3 h-fit"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Presets disponibles
              </p>

              {presets.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun preset pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {presets.map((preset) => {
                    const isPreviewing = previewingId === preset.id

                    return (
                      <article
                        key={preset.id}
                        className="rounded-lg border p-3"
                        style={{
                          borderColor: editingId === preset.id
                            ? 'var(--color-accent)'
                            : isPreviewing
                              ? 'var(--color-accent-light)'
                              : 'var(--color-border)',
                          backgroundColor: 'var(--color-bg-primary)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {preset.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {Object.keys(preset.settings || {}).length} cle(s) de theme
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(preset)}
                              className="p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                              style={{ color: 'var(--color-text-secondary)' }}
                              aria-label={`Modifier ${preset.name}`}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => (isPreviewing ? stopPreview() : startPreview(preset))}
                              className="p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                              style={{ color: isPreviewing ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                              aria-label={isPreviewing ? `Arreter apercu ${preset.name}` : `Apercu ${preset.name}`}
                            >
                              {isPreviewing ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(preset.id)}
                              className="p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                              style={{ color: 'var(--color-text-secondary)' }}
                              aria-label={`Supprimer ${preset.name}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {preset.description && (
                          <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {preset.description}
                          </p>
                        )}

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleApply(preset.id)}
                            disabled={applyingId === preset.id}
                            className="justify-center"
                          >
                            <PaintBrushIcon className="h-4 w-4" />
                            {applyingId === preset.id ? 'Application...' : 'Appliquer'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => exportOnePreset(preset)}
                            className="justify-center"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Exporter
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section
                className="rounded-xl border p-4 space-y-4"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Nom du preset
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                    placeholder="Ex: Ocean Clean"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Description (optionnelle)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
                    style={inputStyle}
                  />
                </div>

                <div
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Snapshot theme actuel
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {snapshotCount} cle(s) capturees depuis les reglages actuels.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? <Spinner size="sm" /> : editingId ? 'Mettre a jour infos' : 'Creer depuis theme actuel'}
                  </Button>

                  {editingId && (
                    <Button type="button" variant="secondary" onClick={captureCurrentThemeToPreset} disabled={saving}>
                      Capturer le theme actuel
                    </Button>
                  )}

                  <Button type="button" variant="ghost" onClick={startCreate}>
                    Reinitialiser
                  </Button>
                </div>

                {activePreset && (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Edition du preset: {activePreset.name}
                  </p>
                )}
              </section>

              <section
                className="rounded-xl border p-4 space-y-4"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Affectation par page
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Choisis un preset pour chaque page publique. Vide = theme global actuel.
                  </p>
                </div>

                <div className="space-y-3">
                  {PAGE_THEME_TARGETS.map((target) => (
                    <div key={target.id}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {target.label} ({target.routeHint})
                      </label>
                      <select
                        value={assignments[target.id] || ''}
                        onChange={(event) => handleAssignmentChange(target.id, event.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      >
                        <option value="">Theme global (defaut)</option>
                        {presets.map((preset) => (
                          <option key={preset.id} value={String(preset.id)}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="primary" onClick={handleSaveAssignments} disabled={savingAssignments}>
                    {savingAssignments ? 'Enregistrement...' : 'Enregistrer les affectations'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetAssignments}>
                    Vider les affectations
                  </Button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmId)}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer le preset"
        message="Cette action est irreversible. Le preset sera supprime definitivement."
      />
    </>
  )
}

