/* Service metier des presets de theme (CRUD + application). */
const { ThemePreset, Setting } = require('../models')
const { createHttpError } = require('../utils/httpError')

/**
 * Normalise un texte avec longueur maximale.
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Taille max.
 * @param {string} [fallback=''] Valeur fallback.
 * @returns {string} Texte normalise.
 */
function sanitizeText(value, maxLength, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, maxLength)
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

  const entries = Object.entries(value).slice(0, 500)
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
 * Construit le service des presets de theme avec dependances injectables.
 * @param {object} [deps={}] Dependances optionnelles.
 * @param {object} [deps.themePresetModel] Modele theme preset.
 * @param {object} [deps.settingModel] Modele setting.
 * @param {Function} [deps.now] Fabrique de date.
 * @returns {object} API metier des presets de theme.
 */
function createThemePresetService(deps = {}) {
  const themePresetModel = deps.themePresetModel || ThemePreset
  const settingModel = deps.settingModel || Setting
  const now = deps.now || (() => new Date())

  /**
   * Recupere tous les presets de theme.
   * @returns {Promise<Array<object>>} Liste ordonnee des presets.
   */
  async function getAllThemePresets() {
    return themePresetModel.findAll({
      order: [
        ['updated_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
    })
  }

  /**
   * Cree un preset de theme.
   * @param {object} payload Donnees du preset.
   * @returns {Promise<object>} Preset cree.
   * @throws {Error} Erreur 422 si aucun setting valide.
   */
  async function createThemePreset(payload) {
    const settings = sanitizeSettingsMap(payload.settings)
    if (Object.keys(settings).length === 0) {
      throw createHttpError(422, 'Le preset doit contenir des settings valides.')
    }

    return themePresetModel.create({
      name: sanitizeText(payload.name, 120),
      description: sanitizeText(payload.description, 2000, ''),
      settings,
    })
  }

  /**
   * Met a jour un preset de theme existant.
   * @param {number|string} id Identifiant preset.
   * @param {object} payload Champs a modifier.
   * @returns {Promise<object>} Preset mis a jour.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function updateThemePreset(id, payload) {
    const preset = await themePresetModel.findByPk(id)
    if (!preset) {
      throw createHttpError(404, 'Preset de theme introuvable.')
    }

    const updates = {}

    if (payload.name !== undefined) {
      updates.name = sanitizeText(payload.name, 120)
    }

    if (payload.description !== undefined) {
      updates.description = sanitizeText(payload.description, 2000, '')
    }

    if (payload.settings !== undefined) {
      const settings = sanitizeSettingsMap(payload.settings)
      if (Object.keys(settings).length === 0) {
        throw createHttpError(422, 'Le preset doit contenir des settings valides.')
      }
      updates.settings = settings
    }

    await preset.update(updates)
    return preset
  }

  /**
   * Supprime un preset de theme.
   * @param {number|string} id Identifiant preset.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function deleteThemePreset(id) {
    const preset = await themePresetModel.findByPk(id)
    if (!preset) {
      throw createHttpError(404, 'Preset de theme introuvable.')
    }

    await preset.destroy()
  }

  /**
   * Applique un preset de theme aux settings globaux.
   * @param {number|string} id Identifiant preset.
   * @returns {Promise<object>} Preset applique.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function applyThemePreset(id) {
    const preset = await themePresetModel.findByPk(id)
    if (!preset) {
      throw createHttpError(404, 'Preset de theme introuvable.')
    }

    const settings = sanitizeSettingsMap(preset.settings)
    const entries = Object.entries(settings)

    await Promise.all(
      entries.map(([key, value]) => settingModel.upsert({ key, value, updated_at: now() }))
    )

    return preset
  }

  return {
    getAllThemePresets,
    createThemePreset,
    updateThemePreset,
    deleteThemePreset,
    applyThemePreset,
  }
}

module.exports = {
  createThemePresetService,
  ...createThemePresetService(),
}
