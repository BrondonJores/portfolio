/* Service metier du marketplace de themes (catalogue + import vers presets). */
const { ThemePreset, Setting } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { THEME_MARKETPLACE_CATALOG } = require('../constants/themeMarketplaceCatalog')

const MARKETPLACE_SLUG_PATTERN = /^[a-z0-9-]{2,80}$/

/**
 * Tronque/normalise une valeur texte.
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Taille max.
 * @param {string} [fallback=''] Fallback.
 * @returns {string} Texte nettoye.
 */
function sanitizeText(value, maxLength, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, maxLength)
}

/**
 * Convertit une valeur brute en booleen permissif.
 * @param {unknown} value Valeur brute.
 * @param {boolean} [fallback=false] Valeur de repli.
 * @returns {boolean} Booleen normalise.
 */
function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

/**
 * Filtre un objet settings vers une map cle/valeur serialisable.
 * @param {unknown} value Objet brut.
 * @returns {Record<string, string | number | boolean | null>} Objet settings nettoye.
 */
function sanitizeSettingsMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const entries = Object.entries(value).slice(0, 600)
  const next = {}

  for (const [rawKey, rawVal] of entries) {
    const key = sanitizeText(rawKey, 120)
    if (!key) continue

    const valueType = typeof rawVal
    if (rawVal === null || valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      next[key] = rawVal
    }
  }

  return next
}

/**
 * Normalise un slug marketplace.
 * @param {unknown} value Slug brut.
 * @returns {string} Slug normalise.
 */
function sanitizeMarketplaceSlug(value) {
  const slug = sanitizeText(value, 80).toLowerCase()
  return MARKETPLACE_SLUG_PATTERN.test(slug) ? slug : ''
}

/**
 * Extrait un apercu palette depuis les settings d'un theme.
 * @param {Record<string, unknown>} settings Map settings theme.
 * @returns {{dark:string,light:string,accent:string,accentLight:string}} Mini preview.
 */
function extractPreview(settings = {}) {
  return {
    dark: sanitizeText(settings.theme_dark_bg_primary, 20, '#060b0f'),
    light: sanitizeText(settings.theme_light_bg_primary, 20, '#f0faf8'),
    accent: sanitizeText(settings.theme_dark_accent, 20, '#00d4a8'),
    accentLight: sanitizeText(settings.theme_dark_accent_light, 20, '#4df5d0'),
  }
}

/**
 * Construit le service marketplace de themes avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {Array<object>} [deps.catalog] Catalogue source.
 * @param {object} [deps.themePresetModel] Modele presets de theme.
 * @param {object} [deps.settingModel] Modele settings globaux.
 * @param {Function} [deps.now] Horloge injectee.
 * @returns {{listMarketplaceThemes:Function,importMarketplaceTheme:Function}} API marketplace.
 */
function createThemeMarketplaceService(deps = {}) {
  const catalog = Array.isArray(deps.catalog) ? deps.catalog : THEME_MARKETPLACE_CATALOG
  const themePresetModel = deps.themePresetModel || ThemePreset
  const settingModel = deps.settingModel || Setting
  const now = deps.now || (() => new Date())

  /**
   * Liste le catalogue marketplace avec filtres optionnels.
   * @param {object} [filters={}] Filtres de recherche.
   * @param {string} [filters.q] Terme texte.
   * @param {string} [filters.category] Categorie souhaitee.
   * @returns {Array<object>} Themes marketplace filtres.
   */
  function listMarketplaceThemes(filters = {}) {
    const term = sanitizeText(filters.q, 80).toLowerCase()
    const category = sanitizeText(filters.category, 40).toLowerCase()

    const filtered = catalog.filter((item) => {
      const itemCategory = sanitizeText(item.category, 40).toLowerCase()
      if (category && category !== 'all' && itemCategory !== category) {
        return false
      }

      if (!term) {
        return true
      }

      const haystack = [
        item.slug,
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
    })

    return filtered
      .map((item) => {
        const settings = sanitizeSettingsMap(item.settings)
        return {
          slug: sanitizeMarketplaceSlug(item.slug),
          name: sanitizeText(item.name, 120),
          shortDescription: sanitizeText(item.shortDescription, 240),
          description: sanitizeText(item.description, 2000),
          category: sanitizeText(item.category, 40),
          style: sanitizeText(item.style, 40),
          author: sanitizeText(item.author, 120, 'Marketplace'),
          featured: Boolean(item.featured),
          version: Number.isInteger(item.version) ? item.version : 1,
          tags: Array.isArray(item.tags)
            ? item.tags.map((tag) => sanitizeText(tag, 30)).filter(Boolean).slice(0, 8)
            : [],
          preview: extractPreview(settings),
          settingsCount: Object.keys(settings).length,
          settings,
        }
      })
      .filter((item) => item.slug && item.name && item.settingsCount > 0)
      .sort((a, b) => {
        if (a.featured !== b.featured) {
          return a.featured ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
  }

  /**
   * Retourne un theme marketplace par slug.
   * @param {string} slug Slug theme.
   * @returns {object|null} Theme trouve ou null.
   */
  function findMarketplaceThemeBySlug(slug) {
    const safeSlug = sanitizeMarketplaceSlug(slug)
    if (!safeSlug) {
      return null
    }

    const themes = listMarketplaceThemes({})
    return themes.find((item) => item.slug === safeSlug) || null
  }

  /**
   * Importe un theme marketplace vers la table des presets.
   * @param {object} payload Options d'import.
   * @param {string} payload.slug Slug du theme marketplace.
   * @param {boolean} [payload.replaceExisting=true] Met a jour le preset existant si present.
   * @param {boolean} [payload.applyAfterImport=false] Applique le preset immediatement aux settings globaux.
   * @returns {Promise<{action:string,preset:object,applied:boolean,slug:string}>} Resume import.
   */
  async function importMarketplaceTheme(payload) {
    const safeSlug = sanitizeMarketplaceSlug(payload?.slug)
    if (!safeSlug) {
      throw createHttpError(422, 'Slug marketplace invalide.')
    }

    const theme = findMarketplaceThemeBySlug(safeSlug)
    if (!theme) {
      throw createHttpError(404, 'Theme marketplace introuvable.')
    }

    const replaceExisting = toBoolean(payload?.replaceExisting, true)
    const applyAfterImport = toBoolean(payload?.applyAfterImport, false)
    const settings = sanitizeSettingsMap({
      ...theme.settings,
      marketplace_source: 'official',
      marketplace_slug: safeSlug,
      marketplace_version: theme.version,
    })

    const existingPresets = await themePresetModel.findAll()
    const matchedPreset = existingPresets.find((preset) => {
      const sourceSlug = sanitizeText(preset?.settings?.marketplace_slug, 80).toLowerCase()
      const nameMatch = sanitizeText(preset?.name, 120).toLowerCase() === theme.name.toLowerCase()
      return sourceSlug === safeSlug || nameMatch
    })

    let preset = matchedPreset
    let action = 'created'

    if (preset) {
      if (!replaceExisting) {
        action = 'skipped'
      } else {
        await preset.update({
          name: theme.name,
          description: theme.description,
          settings,
        })
        action = 'updated'
      }
    } else {
      preset = await themePresetModel.create({
        name: theme.name,
        description: theme.description,
        settings,
      })
      action = 'created'
    }

    let applied = false
    if (applyAfterImport) {
      const settingsToApply = action === 'skipped'
        ? sanitizeSettingsMap(preset?.settings || {})
        : settings
      const entries = Object.entries(settingsToApply)
      await Promise.all(
        entries.map(([key, value]) => settingModel.upsert({ key, value, updated_at: now() }))
      )
      applied = true
    }

    return {
      slug: safeSlug,
      action,
      applied,
      preset,
    }
  }

  return {
    listMarketplaceThemes,
    importMarketplaceTheme,
  }
}

module.exports = {
  createThemeMarketplaceService,
  ...createThemeMarketplaceService(),
}
