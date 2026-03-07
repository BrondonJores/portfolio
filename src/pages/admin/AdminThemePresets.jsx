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
  SparklesIcon,
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
  exportThemePresetPackage,
  getThemePresetReleases,
  getThemePresets,
  importThemePresetPackage,
  rollbackThemePreset,
  updateThemePreset,
} from '../../services/themePresetService.js'
import { getThemeMarketplace, importThemeFromMarketplace } from '../../services/themeMarketplaceService.js'
import { PAGE_THEME_TARGETS } from '../../utils/pageThemeTargets.js'
import { DEFAULT_THEME_SETTINGS } from '../../utils/themeSettings.js'

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

const THEME_KEYS = Object.keys(DEFAULT_THEME_SETTINGS)
const MARKETPLACE_FAVORITES_SETTING_KEY = 'theme_marketplace_favorites'
const MARKETPLACE_RATINGS_SETTING_KEY = 'theme_marketplace_ratings'

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

/**
 * Construit un identifiant stable d'apercu pour un preset local.
 * @param {number|string} presetId Identifiant preset.
 * @returns {string} Cle d'apercu.
 */
function toPresetPreviewId(presetId) {
  return `preset:${presetId}`
}

/**
 * Construit un identifiant stable d'apercu pour un item marketplace.
 * @param {string} slug Slug marketplace.
 * @returns {string} Cle d'apercu.
 */
function toMarketplacePreviewId(slug) {
  return `market:${slug}`
}

/**
 * Parse une valeur JSON de setting avec fallback.
 * @param {unknown} rawValue Valeur brute.
 * @param {unknown} fallback Valeur de repli.
 * @returns {unknown} JSON parse ou fallback.
 */
function parseJsonSetting(rawValue, fallback) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return fallback
  }

  try {
    const parsed = JSON.parse(rawValue)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

/**
 * Lit les slugs favoris marketplace depuis les settings.
 * @param {Record<string, unknown>} settings Settings admin.
 * @returns {string[]} Liste des slugs favoris.
 */
function readMarketplaceFavoritesFromSettings(settings) {
  const parsed = parseJsonSetting(settings?.[MARKETPLACE_FAVORITES_SETTING_KEY], [])
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 200)
}

/**
 * Lit la notation marketplace depuis les settings.
 * @param {Record<string, unknown>} settings Settings admin.
 * @returns {Record<string, number>} Map slug -> note (1..5).
 */
function readMarketplaceRatingsFromSettings(settings) {
  const parsed = parseJsonSetting(settings?.[MARKETPLACE_RATINGS_SETTING_KEY], {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {}
  }

  const next = {}
  for (const [slug, rawRating] of Object.entries(parsed)) {
    const safeSlug = String(slug || '').trim()
    const rating = Number.parseInt(String(rawRating ?? ''), 10)
    if (!safeSlug) continue
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue
    next[safeSlug] = rating
  }

  return next
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
 * Construit un resume des ecarts entre le preset courant et une release cible.
 * @param {object | null} currentPreset Preset actuellement selectionne.
 * @param {object | null} release Release cible.
 * @returns {object | null} Resume de comparaison exploitable par l'UI.
 */
function buildThemeReleaseComparison(currentPreset, release) {
  if (!currentPreset || !release) return null

  const snapshot = release?.snapshot && typeof release.snapshot === 'object'
    ? release.snapshot
    : {}

  const currentSettings = pickThemeSettings(currentPreset?.settings || {})
  const targetSettings = pickThemeSettings(snapshot?.settings || {})
  const settingKeys = Array.from(
    new Set([...Object.keys(currentSettings), ...Object.keys(targetSettings)])
  ).sort((a, b) => a.localeCompare(b))

  const changedSettings = settingKeys
    .map((key) => {
      const currentValue = currentSettings[key]
      const targetValue = targetSettings[key]
      if (String(currentValue ?? '') === String(targetValue ?? '')) {
        return null
      }
      return {
        key,
        currentValue: currentValue ?? '(vide)',
        targetValue: targetValue ?? '(vide)',
      }
    })
    .filter(Boolean)

  const currentName = String(currentPreset?.name || '')
  const targetName = String(snapshot?.name || '')
  const currentDescription = String(currentPreset?.description || '')
  const targetDescription = String(snapshot?.description || '')

  return {
    currentName,
    targetName,
    currentDescription,
    targetDescription,
    currentSettingsCount: Object.keys(currentSettings).length,
    targetSettingsCount: Object.keys(targetSettings).length,
    changedSettings,
    nameChanged: currentName !== targetName,
    descriptionChanged: currentDescription !== targetDescription,
  }
}

export default function AdminThemePresets() {
  const addToast = useAdminToast()
  const { refreshSettings, refreshThemePresets, updateLocalSettings } = useSettings()

  const [presets, setPresets] = useState([])
  const [marketplaceThemes, setMarketplaceThemes] = useState([])
  const [currentSettings, setCurrentSettings] = useState({})
  const [assignments, setAssignments] = useState({})
  const [marketplaceFavorites, setMarketplaceFavorites] = useState([])
  const [marketplaceRatings, setMarketplaceRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingMarketplace, setLoadingMarketplace] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAssignments, setSavingAssignments] = useState(false)
  const [savingMarketplacePrefs, setSavingMarketplacePrefs] = useState(false)
  const [importing, setImporting] = useState(false)
  const [marketplaceImportingSlug, setMarketplaceImportingSlug] = useState('')
  const [marketplaceCategory, setMarketplaceCategory] = useState('all')
  const [marketplaceQuery, setMarketplaceQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [applyingId, setApplyingId] = useState(null)
  const [previewingId, setPreviewingId] = useState(null)
  const [previewingLabel, setPreviewingLabel] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [presetReleasesById, setPresetReleasesById] = useState({})
  const [loadingReleasesId, setLoadingReleasesId] = useState(null)
  const [rollingBackReleaseId, setRollingBackReleaseId] = useState(null)
  const [comparingReleaseId, setComparingReleaseId] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())

  const importInputRef = useRef(null)
  const previewBaseRef = useRef(null)

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === editingId) || null,
    [presets, editingId]
  )
  const activePresetReleases = useMemo(
    () => (activePreset ? (presetReleasesById[activePreset.id] || []) : []),
    [activePreset, presetReleasesById]
  )
  const activeComparedRelease = useMemo(
    () =>
      activePresetReleases.find(
        (release) => Number.parseInt(String(release?.id ?? ''), 10) === comparingReleaseId
      ) || null,
    [activePresetReleases, comparingReleaseId]
  )
  const activeReleaseComparison = useMemo(
    () => buildThemeReleaseComparison(activePreset, activeComparedRelease),
    [activePreset, activeComparedRelease]
  )

  const snapshotSettings = useMemo(
    () => pickThemeSettings(currentSettings),
    [currentSettings]
  )

  const snapshotCount = Object.keys(snapshotSettings).length
  const marketplaceFavoriteSet = useMemo(
    () => new Set(marketplaceFavorites),
    [marketplaceFavorites]
  )

  const marketplaceCategories = useMemo(() => {
    const values = new Set(
      marketplaceThemes
        .map((item) => String(item?.category || '').trim())
        .filter(Boolean)
    )
    return ['all', ...Array.from(values)]
  }, [marketplaceThemes])

  const filteredMarketplaceThemes = useMemo(() => {
    const term = marketplaceQuery.trim().toLowerCase()

    return marketplaceThemes.filter((item) => {
      if (showFavoritesOnly && !marketplaceFavoriteSet.has(item.slug)) {
        return false
      }

      if (marketplaceCategory !== 'all' && item.category !== marketplaceCategory) {
        return false
      }

      if (!term) {
        return true
      }

      const haystack = [
        item.name,
        item.shortDescription,
        item.description,
        item.category,
        item.style,
        ...(Array.isArray(item.tags) ? item.tags : []),
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')

      return haystack.includes(term)
    }).sort((a, b) => {
      const aFavorite = marketplaceFavoriteSet.has(a.slug)
      const bFavorite = marketplaceFavoriteSet.has(b.slug)

      if (aFavorite !== bFavorite) {
        return aFavorite ? -1 : 1
      }
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1
      }
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
  }, [marketplaceThemes, marketplaceCategory, marketplaceQuery, showFavoritesOnly, marketplaceFavoriteSet])

  const loadData = async () => {
    setLoading(true)
    try {
      const [presetsRes, settingsRes] = await Promise.all([getThemePresets(), getAdminSettings()])
      const nextPresets = Array.isArray(presetsRes?.data) ? presetsRes.data : []
      const nextSettings = settingsRes?.data || {}

      setPresets(nextPresets)
      setCurrentSettings(nextSettings)
      setAssignments(readAssignmentsFromSettings(nextSettings))
      setMarketplaceFavorites(readMarketplaceFavoritesFromSettings(nextSettings))
      setMarketplaceRatings(readMarketplaceRatingsFromSettings(nextSettings))
    } catch (error) {
      addToast(error.message || 'Erreur lors du chargement des presets de theme.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadMarketplace = async () => {
    setLoadingMarketplace(true)
    try {
      const response = await getThemeMarketplace()
      setMarketplaceThemes(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      addToast(error.message || 'Erreur lors du chargement du marketplace themes.', 'error')
    } finally {
      setLoadingMarketplace(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadMarketplace()
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
   * Charge l'historique de releases d'un preset.
   * @param {number|string} presetId Identifiant preset.
   * @param {{force?: boolean}} [options] Options de rechargement.
   * @returns {Promise<void>} Promise resolue apres chargement.
   */
  const loadPresetReleases = async (presetId, options = {}) => {
    const safeId = Number.parseInt(String(presetId), 10)
    if (!Number.isInteger(safeId) || safeId <= 0) return

    if (!options.force && Array.isArray(presetReleasesById[safeId])) {
      return
    }

    setLoadingReleasesId(safeId)
    try {
      const response = await getThemePresetReleases(safeId)
      const releases = Array.isArray(response?.data) ? response.data : []
      setPresetReleasesById((prev) => ({ ...prev, [safeId]: releases }))
    } catch (error) {
      addToast(error.message || 'Impossible de charger les releases du preset.', 'error')
    } finally {
      setLoadingReleasesId((current) => (current === safeId ? null : current))
    }
  }

  useEffect(() => {
    if (!activePreset?.id) return
    loadPresetReleases(activePreset.id)
  }, [activePreset?.id])

  /**
   * Passe en mode creation.
   * @returns {void}
   */
  const startCreate = () => {
    setEditingId(null)
    setForm(createEmptyForm())
    setRollingBackReleaseId(null)
    setComparingReleaseId(null)
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
    setComparingReleaseId(null)
    loadPresetReleases(preset.id)
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
  const startPreview = (preset, options = {}) => {
    const previewPatch = pickThemeSettings(preset?.settings || {})
    if (Object.keys(previewPatch).length === 0) {
      addToast('Ce preset ne contient pas de theme exploitable.', 'error')
      return
    }

    if (!previewBaseRef.current) {
      previewBaseRef.current = snapshotSettings
    }

    updateLocalSettings(previewPatch)
    setPreviewingId(options.previewId || toPresetPreviewId(preset?.id || 'unknown'))
    setPreviewingLabel(options.label || preset?.name || 'Theme')
  }

  /**
   * Arrete l'apercu live et restaure le theme initial.
   * @returns {void}
   */
  const stopPreview = () => {
    if (!previewBaseRef.current) {
      setPreviewingId(null)
      setPreviewingLabel('')
      return
    }

    updateLocalSettings(previewBaseRef.current)
    previewBaseRef.current = null
    setPreviewingId(null)
    setPreviewingLabel('')
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
      const nextSettings = fresh?.data || {}
      setCurrentSettings(nextSettings)
      setAssignments(readAssignmentsFromSettings(nextSettings))
      setMarketplaceFavorites(readMarketplaceFavoritesFromSettings(nextSettings))
      setMarketplaceRatings(readMarketplaceRatingsFromSettings(nextSettings))

      previewBaseRef.current = null
      setPreviewingId(null)
      setPreviewingLabel('')

      addToast('Preset de theme applique.', 'success')
    } catch (error) {
      addToast(error.message || "Erreur lors de l'application du preset.", 'error')
    } finally {
      setApplyingId(null)
    }
  }

  /**
   * Revient a une release precise du preset en cours d'edition.
   * @param {number|string} releaseId Identifiant release cible.
   * @returns {Promise<void>} Promise resolue apres rollback.
   */
  const handleRollbackPreset = async (releaseId) => {
    const presetId = Number.parseInt(String(activePreset?.id ?? ''), 10)
    const safeReleaseId = Number.parseInt(String(releaseId), 10)

    if (!Number.isInteger(presetId) || presetId <= 0) {
      addToast('Selectionne un preset avant de lancer un rollback.', 'error')
      return
    }
    if (!Number.isInteger(safeReleaseId) || safeReleaseId <= 0) {
      addToast('Release invalide.', 'error')
      return
    }

    setRollingBackReleaseId(safeReleaseId)
    try {
      const response = await rollbackThemePreset(presetId, safeReleaseId)
      const rolledPreset = response?.data?.preset || null

      await loadData()
      await refreshThemePresets()
      await loadPresetReleases(presetId, { force: true })

      if (rolledPreset?.id) {
        setEditingId(rolledPreset.id)
        setForm({
          name: rolledPreset.name || '',
          description: rolledPreset.description || '',
        })
      }

      addToast('Rollback du preset effectue.', 'success')
    } catch (error) {
      addToast(error.message || 'Erreur lors du rollback du preset.', 'error')
    } finally {
      setRollingBackReleaseId(null)
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
      setPresetReleasesById((prev) => {
        const next = { ...prev }
        delete next[confirmId]
        return next
      })

      if (editingId === confirmId) {
        startCreate()
      }
      if (previewingId === toPresetPreviewId(confirmId)) {
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
  const exportOnePreset = async (preset) => {
    try {
      const response = await exportThemePresetPackage(preset.id)
      const payload = response?.data

      if (!payload || typeof payload !== 'object') {
        throw new Error('Package preset invalide.')
      }

      const safeName = String(preset.name || 'preset')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      downloadJsonFile(`theme-preset-package-${safeName || 'preset'}.json`, payload)
      addToast('Package preset exporte.', 'success')
    } catch (error) {
      addToast(error.message || "Erreur pendant l'export du package preset.", 'error')
    }
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

      if (parsed?.packageType === 'theme-preset-package') {
        const response = await importThemePresetPackage(parsed)
        const action = response?.data?.action || 'created'
        await loadData()
        await refreshThemePresets()
        addToast(`Package preset importe (${action}).`, 'success')
        return
      }

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
   * Importe un theme depuis le marketplace.
   * @param {object} theme Theme marketplace cible.
   * @param {boolean} [applyAfterImport=false] Applique immediatement apres import.
   * @returns {Promise<void>} Promise d'import.
   */
  const handleImportMarketplaceTheme = async (theme, applyAfterImport = false) => {
    if (!theme?.slug) {
      addToast('Theme marketplace invalide.', 'error')
      return
    }

    setMarketplaceImportingSlug(theme.slug)
    try {
      const response = await importThemeFromMarketplace(theme.slug, {
        replaceExisting: true,
        applyAfterImport,
      })

      const result = response?.data || {}
      await Promise.all([loadData(), refreshThemePresets()])

      if (applyAfterImport) {
        await refreshSettings()
        const fresh = await getAdminSettings()
        const nextSettings = fresh?.data || {}
        setCurrentSettings(nextSettings)
        setAssignments(readAssignmentsFromSettings(nextSettings))
        setMarketplaceFavorites(readMarketplaceFavoritesFromSettings(nextSettings))
        setMarketplaceRatings(readMarketplaceRatingsFromSettings(nextSettings))
        previewBaseRef.current = null
        setPreviewingId(null)
        setPreviewingLabel('')
      }

      const actionLabel = result.action === 'updated'
        ? 'mis a jour'
        : result.action === 'skipped'
          ? 'deja present'
          : 'importe'

      addToast(
        applyAfterImport
          ? `Theme "${theme.name}" ${actionLabel} et applique.`
          : `Theme "${theme.name}" ${actionLabel}.`,
        'success'
      )
    } catch (error) {
      addToast(error.message || "Erreur lors de l'import marketplace.", 'error')
    } finally {
      setMarketplaceImportingSlug('')
    }
  }

  /**
   * Persiste les preferences marketplace (favoris + notes) dans les settings.
   * @param {string[]} nextFavorites Slugs favoris.
   * @param {Record<string, number>} nextRatings Notes par slug.
   * @returns {Promise<void>} Promise de persistance.
   */
  const saveMarketplacePreferences = async (nextFavorites, nextRatings) => {
    setSavingMarketplacePrefs(true)
    try {
      const payload = {
        [MARKETPLACE_FAVORITES_SETTING_KEY]: JSON.stringify(nextFavorites),
        [MARKETPLACE_RATINGS_SETTING_KEY]: JSON.stringify(nextRatings),
      }

      await updateSettings(payload)
      setCurrentSettings((prev) => ({
        ...prev,
        ...payload,
      }))
    } finally {
      setSavingMarketplacePrefs(false)
    }
  }

  /**
   * Ajoute/retire un theme des favoris marketplace.
   * @param {string} slug Slug du theme.
   * @returns {Promise<void>} Promise resolue apres mise a jour.
   */
  const handleToggleMarketplaceFavorite = async (slug) => {
    const safeSlug = String(slug || '').trim()
    if (!safeSlug) return

    const alreadyFavorite = marketplaceFavoriteSet.has(safeSlug)
    const nextFavorites = alreadyFavorite
      ? marketplaceFavorites.filter((item) => item !== safeSlug)
      : [...marketplaceFavorites, safeSlug]

    setMarketplaceFavorites(nextFavorites)

    try {
      await saveMarketplacePreferences(nextFavorites, marketplaceRatings)
    } catch (error) {
      setMarketplaceFavorites(marketplaceFavorites)
      addToast(error.message || 'Erreur lors de la sauvegarde des favoris.', 'error')
    }
  }

  /**
   * Definit une note (1 a 5) pour un theme marketplace.
   * Cliquer la meme note retire la notation.
   * @param {string} slug Slug du theme.
   * @param {number} rating Note cible.
   * @returns {Promise<void>} Promise resolue apres mise a jour.
   */
  const handleSetMarketplaceRating = async (slug, rating) => {
    const safeSlug = String(slug || '').trim()
    const safeRating = Number.parseInt(String(rating ?? ''), 10)
    if (!safeSlug || !Number.isInteger(safeRating) || safeRating < 1 || safeRating > 5) {
      return
    }

    const currentRating = marketplaceRatings[safeSlug] || 0
    const nextRatings = { ...marketplaceRatings }

    if (currentRating === safeRating) {
      delete nextRatings[safeSlug]
    } else {
      nextRatings[safeSlug] = safeRating
    }

    setMarketplaceRatings(nextRatings)

    try {
      await saveMarketplacePreferences(marketplaceFavorites, nextRatings)
    } catch (error) {
      setMarketplaceRatings(marketplaceRatings)
      addToast(error.message || 'Erreur lors de la sauvegarde de la note.', 'error')
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
              Apercu live actif: {previewingLabel || 'Theme'}
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
          <>
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
                    const isPreviewing = previewingId === toPresetPreviewId(preset.id)

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
                              onClick={() => (
                                isPreviewing
                                  ? stopPreview()
                                  : startPreview(preset, {
                                    previewId: toPresetPreviewId(preset.id),
                                    label: preset.name,
                                  })
                              )}
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

                {activePreset && (
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
                        onClick={() => loadPresetReleases(activePreset.id, { force: true })}
                        disabled={loadingReleasesId === activePreset.id || Boolean(rollingBackReleaseId)}
                      >
                        Rafraichir
                      </Button>
                    </div>

                    {loadingReleasesId === activePreset.id ? (
                      <div className="flex justify-center py-2">
                        <Spinner size="sm" />
                      </div>
                    ) : activePresetReleases.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Aucune release disponible pour ce preset.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {activePresetReleases.map((release) => {
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
                                onClick={() => handleRollbackPreset(releaseId)}
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

            <section
              className="rounded-xl border p-4 space-y-4"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <SparklesIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                    Marketplace de themes
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Catalogue de themes prets a importer, previsualiser et appliquer.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)_auto] gap-3 items-center">
                <select
                  value={marketplaceCategory}
                  onChange={(event) => setMarketplaceCategory(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={inputStyle}
                >
                  {marketplaceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'Toutes les categories' : category}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={marketplaceQuery}
                  onChange={(event) => setMarketplaceQuery(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={inputStyle}
                  placeholder="Rechercher un theme (nom, style, tag...)"
                />

                <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={showFavoritesOnly}
                    onChange={(event) => setShowFavoritesOnly(event.target.checked)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  Favoris uniquement
                </label>
              </div>

              {savingMarketplacePrefs && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Sauvegarde des preferences marketplace...
                </p>
              )}

              {loadingMarketplace ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : filteredMarketplaceThemes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun theme marketplace ne correspond a ce filtre.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredMarketplaceThemes.map((theme) => {
                    const isPreviewingMarketplace = previewingId === toMarketplacePreviewId(theme.slug)
                    const isImportingMarketplace = marketplaceImportingSlug === theme.slug
                    const isFavorite = marketplaceFavoriteSet.has(theme.slug)
                    const rating = marketplaceRatings[theme.slug] || 0

                    return (
                      <article
                        key={theme.slug}
                        className="rounded-lg border p-3 space-y-3"
                        style={{
                          borderColor: isPreviewingMarketplace ? 'var(--color-accent-light)' : 'var(--color-border)',
                          backgroundColor: 'var(--color-bg-primary)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {theme.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {theme.category} · {theme.style} · {theme.settingsCount} cles
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleMarketplaceFavorite(theme.slug)}
                              className="text-lg leading-none"
                              style={{ color: isFavorite ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                              aria-label={isFavorite ? `Retirer ${theme.name} des favoris` : `Ajouter ${theme.name} aux favoris`}
                              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                              {isFavorite ? '★' : '☆'}
                            </button>

                            {theme.featured && (
                              <span
                                className="text-[10px] font-semibold px-2 py-1 rounded-full border"
                                style={{
                                  borderColor: 'var(--color-accent)',
                                  color: 'var(--color-accent)',
                                  backgroundColor: 'var(--color-accent-glow)',
                                }}
                              >
                                Featured
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {theme.shortDescription || theme.description}
                        </p>

                        <div className="flex items-center gap-2">
                          <span
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: theme.preview?.dark, borderColor: 'var(--color-border)' }}
                            title="Fond sombre"
                          />
                          <span
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: theme.preview?.light, borderColor: 'var(--color-border)' }}
                            title="Fond clair"
                          />
                          <span
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: theme.preview?.accent, borderColor: 'var(--color-border)' }}
                            title="Accent"
                          />
                          <span
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: theme.preview?.accentLight, borderColor: 'var(--color-border)' }}
                            title="Accent light"
                          />
                        </div>

                        {Array.isArray(theme.tags) && theme.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {theme.tags.map((tag) => (
                              <span
                                key={`${theme.slug}-${tag}`}
                                className="text-[10px] px-2 py-1 rounded-full border"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)',
                                  backgroundColor: 'var(--color-bg-secondary)',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => {
                            const value = index + 1
                            const active = rating >= value

                            return (
                              <button
                                key={`${theme.slug}-rating-${value}`}
                                type="button"
                                onClick={() => handleSetMarketplaceRating(theme.slug, value)}
                                className="text-base leading-none"
                                style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                                aria-label={`Donner ${value} etoile(s) a ${theme.name}`}
                                title={`${value} etoile(s)`}
                              >
                                ★
                              </button>
                            )
                          })}
                          <span className="text-[10px] ml-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {rating > 0 ? `${rating}/5` : 'Non note'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Button
                            type="button"
                            variant={isPreviewingMarketplace ? 'primary' : 'ghost'}
                            onClick={() => (
                              isPreviewingMarketplace
                                ? stopPreview()
                                : startPreview(theme, {
                                  previewId: toMarketplacePreviewId(theme.slug),
                                  label: theme.name,
                                })
                            )}
                            className="justify-center"
                          >
                            {isPreviewingMarketplace ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            {isPreviewingMarketplace ? 'Stop preview' : 'Preview'}
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleImportMarketplaceTheme(theme, false)}
                            disabled={isImportingMarketplace}
                            className="justify-center"
                          >
                            {isImportingMarketplace ? <Spinner size="sm" /> : <ArrowUpTrayIcon className="h-4 w-4" />}
                            Importer
                          </Button>

                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => handleImportMarketplaceTheme(theme, true)}
                            disabled={isImportingMarketplace}
                            className="justify-center"
                          >
                            <PaintBrushIcon className="h-4 w-4" />
                            Importer + appliquer
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
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
