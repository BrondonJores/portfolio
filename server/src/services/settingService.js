/* Service metier setting : regles applicatives et acces donnees. */
const { Setting } = require('../models')
const { createHttpError } = require('../utils/httpError')

const SETTINGS_KEY_PATTERN = /^[a-zA-Z0-9._:-]{1,100}$/
const FORBIDDEN_SETTING_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const PUBLIC_SETTING_KEY_PATTERN = /^(theme_page_[a-z0-9_]+_preset_id)$/i
const PUBLIC_SETTING_KEYS = new Set([
  'about_photo_badge',
  'about_photo_caption',
  'avatar_url',
  'bio',
  'contact_availability',
  'contact_email',
  'contact_location',
  'footer_credits',
  'footer_text',
  'github_url',
  'instagram_url',
  'linkedin_url',
  'logo_url',
  'maintenance_mode',
  'og_image_url',
  'seo_description',
  'seo_keywords',
  'seo_title',
  'site_name',
  'site_url',
  'tagline',
  'twitter_url',
  'youtube_url',
])
const PUBLIC_SETTING_PREFIXES = [
  'about_',
  'anim_',
  'contact_',
  'footer_',
  'hero_',
  'seo_',
  'site_',
  'stat_',
  'theme_',
  'ui_',
]

/**
 * Indique si une cle de setting est autorisee.
 * @param {unknown} key Cle candidate.
 * @returns {boolean} true si la cle est sure.
 */
function isSafeSettingKey(key) {
  if (typeof key !== 'string') {
    return false
  }

  if (!SETTINGS_KEY_PATTERN.test(key)) {
    return false
  }

  return !FORBIDDEN_SETTING_KEYS.has(key)
}

/**
 * Indique si une cle peut etre exposee publiquement au frontend.
 * L'approche est en "allowlist" pour eviter toute fuite de secrets.
 * @param {unknown} key Cle candidate.
 * @returns {boolean} true si la cle est publiquement exposable.
 */
function isPublicSettingKey(key) {
  if (!isSafeSettingKey(key)) {
    return false
  }

  if (PUBLIC_SETTING_KEYS.has(key)) {
    return true
  }

  if (PUBLIC_SETTING_KEY_PATTERN.test(key)) {
    return true
  }

  return PUBLIC_SETTING_PREFIXES.some((prefix) => key.startsWith(prefix))
}

/**
 * Transforme une collection de lignes `settings` en objet simple.
 * @param {Array<{key:string,value:string}>} rows Lignes provenant du modele.
 * @returns {Record<string, string>} Map des settings.
 */
function toSettingsMap(rows) {
  const map = Object.create(null)
  for (const row of rows) {
    map[row.key] = row.value
  }
  return map
}

/**
 * Transforme une collection de settings en map publique filtree.
 * @param {Array<{key:string,value:string}>} rows Lignes settings.
 * @returns {Record<string, string>} Map des cles publiques uniquement.
 */
function toPublicSettingsMap(rows) {
  const map = Object.create(null)
  for (const row of rows) {
    if (isPublicSettingKey(row?.key)) {
      map[row.key] = row.value
    }
  }
  return map
}

/**
 * Construit le service setting avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.settingModel] Modele setting.
 * @param {Function} [deps.now] Fabrique de date.
 * @returns {object} API metier setting.
 */
function createSettingService(deps = {}) {
  const settingModel = deps.settingModel || Setting
  const now = deps.now || (() => new Date())

  /**
   * Recupere l'ensemble des settings sous forme d'objet cle/valeur.
   * @returns {Promise<Record<string, string>>} Parametres globalement accessibles.
   */
  async function getSettingsMap() {
    const rows = await settingModel.findAll()
    return toSettingsMap(rows)
  }

  /**
   * Recupere uniquement les settings destinables au frontend public.
   * @returns {Promise<Record<string, string>>} Parametres non sensibles.
   */
  async function getPublicSettingsMap() {
    const rows = await settingModel.findAll()
    return toPublicSettingsMap(rows)
  }

  /**
   * Met a jour ou cree un lot de settings.
   * @param {Record<string, unknown>} payload Objet de settings a persister.
   * @returns {Promise<void>} Promise resolue une fois tous les upserts termines.
   */
  async function upsertSettings(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createHttpError(400, 'Payload settings invalide.')
    }

    const entries = Object.entries(payload)
    if (entries.length > 200) {
      throw createHttpError(400, 'Trop de settings en une seule requete.')
    }

    for (const [key] of entries) {
      if (!isSafeSettingKey(key)) {
        throw createHttpError(400, `Cle de setting invalide: ${key}`)
      }
    }

    await Promise.all(
      entries.map(([key, value]) =>
        settingModel.upsert({ key, value, updated_at: now() })
      )
    )
  }

  return {
    getSettingsMap,
    getPublicSettingsMap,
    upsertSettings,
  }
}

module.exports = {
  createSettingService,
  ...createSettingService(),
}
