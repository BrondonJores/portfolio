/* Service metier setting : regles applicatives et acces donnees. */
const { Setting } = require('../models')
const { createHttpError } = require('../utils/httpError')

const SETTINGS_KEY_PATTERN = /^[a-zA-Z0-9._:-]{1,100}$/
const FORBIDDEN_SETTING_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

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
    upsertSettings,
  }
}

module.exports = {
  createSettingService,
  ...createSettingService(),
}
