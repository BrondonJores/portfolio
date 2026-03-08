/* Service metier des presets de theme (CRUD + releases + package + rollback). */
const { ThemePreset, Setting, ThemePresetRelease } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { withOptionalTransaction } = require('../utils/transaction')
const { ANIMATION_CORE_SETTING_KEY_SET } = require('../constants/animationSettingKeys')

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
 * Convertit une valeur vers booleen permissif.
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

  const entries = Object.entries(value).slice(0, 500)
  const next = {}

  for (const [rawKey, rawVal] of entries) {
    const key = sanitizeText(rawKey, 120)
    if (!key) continue
    if (key.startsWith('anim_') && !ANIMATION_CORE_SETTING_KEY_SET.has(key)) continue

    const valueType = typeof rawVal
    if (rawVal === null || valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      next[key] = rawVal
    }
  }

  return next
}

/**
 * Verifie que le repository de releases expose les methodes minimales.
 * @param {unknown} repository Repository potentiel.
 * @returns {boolean} True si le repository est exploitable.
 */
function canUseThemePresetReleaseRepository(repository) {
  return Boolean(
    repository &&
      typeof repository.create === 'function' &&
      typeof repository.findAll === 'function' &&
      typeof repository.findOne === 'function'
  )
}

/**
 * Construit un snapshot de preset serialisable.
 * @param {object} preset Preset source.
 * @returns {{name:string,description:string,settings:Record<string, unknown>}} Snapshot normalise.
 */
function buildThemePresetSnapshot(preset) {
  return {
    name: sanitizeText(preset?.name, 120),
    description: sanitizeText(preset?.description, 2000, ''),
    settings: sanitizeSettingsMap(preset?.settings || {}),
  }
}

/**
 * Extrait un snapshot de preset depuis un payload package.
 * @param {unknown} payload Payload brut.
 * @returns {{snapshot: object, changeNote: string}|null} Donnees package normalisees.
 */
function extractThemePresetPackagePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const packagePreset =
    payload.preset && typeof payload.preset === 'object'
      ? payload.preset
      : payload

  const snapshot = {
    name: sanitizeText(packagePreset?.name, 120),
    description: sanitizeText(packagePreset?.description, 2000, ''),
    settings: sanitizeSettingsMap(packagePreset?.settings || {}),
  }

  if (!snapshot.name || Object.keys(snapshot.settings).length === 0) {
    return null
  }

  const changeNote = sanitizeText(
    payload?.manifest?.changeNote || payload?.change_note,
    255,
    'Import package'
  )

  return {
    snapshot,
    changeNote,
  }
}

/**
 * Construit le service des presets de theme avec dependances injectables.
 * @param {object} [deps={}] Dependances optionnelles.
 * @param {object} [deps.themePresetModel] Modele theme preset.
 * @param {object} [deps.settingModel] Modele setting.
 * @param {object} [deps.themePresetReleaseModel] Modele releases preset.
 * @param {Function} [deps.now] Fabrique de date.
 * @returns {object} API metier des presets de theme.
 */
function createThemePresetService(deps = {}) {
  const themePresetModel = deps.themePresetModel || ThemePreset
  const settingModel = deps.settingModel || Setting
  const themePresetReleaseModel =
    deps.themePresetReleaseModel !== undefined
      ? deps.themePresetReleaseModel
      : deps.themePresetModel
        ? null
        : ThemePresetRelease
  const releaseRepositoryEnabled = canUseThemePresetReleaseRepository(themePresetReleaseModel)
  const now = deps.now || (() => new Date())
  const transactionProvider = deps.transactionProvider

  /**
   * Charge un preset par id ou leve 404.
   * @param {number|string} id Identifiant preset.
   * @returns {Promise<object>} Preset charge.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function ensureThemePresetById(id, transaction = null) {
    const preset = await themePresetModel.findByPk(
      id,
      transaction ? { transaction } : undefined
    )
    if (!preset) {
      throw createHttpError(404, 'Preset de theme introuvable.')
    }
    return preset
  }

  /**
   * Calcule le prochain numero de version release pour un preset.
   * @param {number|string} presetId Identifiant preset.
   * @returns {Promise<number>} Prochaine version.
   */
  async function getNextThemePresetReleaseVersion(presetId, transaction = null) {
    if (!releaseRepositoryEnabled) return 1

    const latest = await themePresetReleaseModel.findOne(
      transaction
        ? {
            where: { theme_preset_id: presetId },
            order: [['version_number', 'DESC']],
            transaction,
          }
        : {
            where: { theme_preset_id: presetId },
            order: [['version_number', 'DESC']],
          }
    )

    const currentVersion = Number.parseInt(String(latest?.version_number ?? 0), 10)
    return (Number.isFinite(currentVersion) ? currentVersion : 0) + 1
  }

  /**
   * Cree une release historisee du preset courant.
   * @param {object} preset Preset source.
   * @param {string} [changeNote=''] Note de release.
   * @returns {Promise<object|null>} Release creee ou null si repository indisponible.
   */
  async function createThemePresetReleaseEntry(preset, changeNote = '', transaction = null) {
    if (!releaseRepositoryEnabled) return null

    const snapshot = buildThemePresetSnapshot(preset)
    if (!snapshot.name || Object.keys(snapshot.settings).length === 0) {
      return null
    }

    const versionNumber = await getNextThemePresetReleaseVersion(preset.id, transaction)

    return themePresetReleaseModel.create(
      {
        theme_preset_id: preset.id,
        version_number: versionNumber,
        change_note: sanitizeText(changeNote, 255, '') || null,
        snapshot,
      },
      transaction ? { transaction } : undefined
    )
  }

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

    return withOptionalTransaction(
      { model: themePresetModel, transactionProvider },
      async (transaction) => {
        const preset = await themePresetModel.create(
          {
            name: sanitizeText(payload.name, 120),
            description: sanitizeText(payload.description, 2000, ''),
            settings,
          },
          transaction ? { transaction } : undefined
        )

        await createThemePresetReleaseEntry(
          preset,
          sanitizeText(payload?.change_note, 255, 'Creation du preset'),
          transaction
        )

        return preset
      }
    )
  }

  /**
   * Met a jour un preset de theme existant.
   * @param {number|string} id Identifiant preset.
   * @param {object} payload Champs a modifier.
   * @returns {Promise<object>} Preset mis a jour.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function updateThemePreset(id, payload) {
    return withOptionalTransaction(
      { model: themePresetModel, transactionProvider },
      async (transaction) => {
        const preset = await ensureThemePresetById(id, transaction)

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

        await preset.update(updates, transaction ? { transaction } : undefined)
        await createThemePresetReleaseEntry(
          preset,
          sanitizeText(payload?.change_note, 255, 'Mise a jour du preset'),
          transaction
        )

        return preset
      }
    )
  }

  /**
   * Supprime un preset de theme.
   * @param {number|string} id Identifiant preset.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function deleteThemePreset(id) {
    const preset = await ensureThemePresetById(id)
    await preset.destroy()
  }

  /**
   * Applique un preset de theme aux settings globaux.
   * @param {number|string} id Identifiant preset.
   * @returns {Promise<object>} Preset applique.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function applyThemePreset(id) {
    return withOptionalTransaction(
      { model: themePresetModel, transactionProvider },
      async (transaction) => {
        const preset = await ensureThemePresetById(id, transaction)

        const settings = sanitizeSettingsMap(preset.settings)
        const entries = Object.entries(settings)

        await Promise.all(
          entries.map(([key, value]) =>
            settingModel.upsert(
              { key, value, updated_at: now() },
              transaction ? { transaction } : undefined
            )
          )
        )

        return preset
      }
    )
  }

  /**
   * Liste les releases d'un preset de theme.
   * @param {number|string} id Identifiant preset.
   * @returns {Promise<Array<object>>} Historique releases (desc).
   */
  async function getThemePresetReleases(id) {
    const preset = await ensureThemePresetById(id)
    if (!releaseRepositoryEnabled) return []

    return themePresetReleaseModel.findAll({
      where: { theme_preset_id: preset.id },
      order: [
        ['version_number', 'DESC'],
        ['created_at', 'DESC'],
      ],
    })
  }

  /**
   * Revient a une release precise d'un preset.
   * @param {number|string} id Identifiant preset.
   * @param {number|string} releaseId Identifiant release cible.
   * @returns {Promise<{preset: object, release: object}>} Preset restaure + release cible.
   * @throws {Error} Erreur 404/422 selon le cas.
   */
  async function rollbackThemePreset(id, releaseId) {
    if (!releaseRepositoryEnabled) {
      throw createHttpError(422, 'Historique des releases indisponible.')
    }

    return withOptionalTransaction(
      { model: themePresetModel, transactionProvider },
      async (transaction) => {
        const preset = await ensureThemePresetById(id, transaction)
        const safeReleaseId = Number.parseInt(String(releaseId), 10)
        if (!Number.isFinite(safeReleaseId) || safeReleaseId <= 0) {
          throw createHttpError(422, 'releaseId invalide.')
        }

        const release = await themePresetReleaseModel.findOne(
          transaction
            ? {
                where: {
                  id: safeReleaseId,
                  theme_preset_id: preset.id,
                },
                transaction,
              }
            : {
                where: {
                  id: safeReleaseId,
                  theme_preset_id: preset.id,
                },
              }
        )

        if (!release) {
          throw createHttpError(404, 'Release introuvable.')
        }

        const snapshot = buildThemePresetSnapshot(release.snapshot || {})
        if (!snapshot.name || Object.keys(snapshot.settings).length === 0) {
          throw createHttpError(422, 'Snapshot release invalide.')
        }

        await preset.update(snapshot, transaction ? { transaction } : undefined)
        await createThemePresetReleaseEntry(
          preset,
          `Rollback vers v${release.version_number}`,
          transaction
        )

        return {
          preset,
          release,
        }
      }
    )
  }

  /**
   * Exporte un preset au format package versionne.
   * @param {number|string} id Identifiant preset.
   * @returns {Promise<object>} Package JSON complet.
   */
  async function exportThemePresetPackage(id) {
    const preset = await ensureThemePresetById(id)
    const releases = releaseRepositoryEnabled
      ? await themePresetReleaseModel.findAll({
        where: { theme_preset_id: preset.id },
        order: [['version_number', 'ASC']],
      })
      : []

    const currentVersion = releases.length > 0
      ? Number.parseInt(String(releases[releases.length - 1]?.version_number ?? 1), 10) || 1
      : 1

    return {
      packageType: 'theme-preset-package',
      packageVersion: 1,
      exportedAt: now().toISOString(),
      manifest: {
        itemType: 'theme',
        source: 'admin',
        name: sanitizeText(preset.name, 160),
        slug: `theme-preset-${preset.id}`,
        currentVersion,
        releaseCount: releases.length,
      },
      preset: buildThemePresetSnapshot(preset),
      releases: releases.map((release) => ({
        id: release.id,
        versionNumber: release.version_number,
        changeNote: release.change_note || '',
        createdAt: release.created_at,
      })),
    }
  }

  /**
   * Importe un package de preset de theme (create/update).
   * @param {object} payload Package JSON entrant.
   * @returns {Promise<{action:string,preset:object}>} Resultat d'import.
   * @throws {Error} Erreur 422 si package invalide.
   */
  async function importThemePresetPackage(payload) {
    const normalized = extractThemePresetPackagePayload(payload)
    if (!normalized) {
      throw createHttpError(422, 'Package preset invalide.')
    }

    const replaceExisting = toBoolean(payload?.replaceExisting, true)
    const { snapshot, changeNote } = normalized

    return withOptionalTransaction(
      { model: themePresetModel, transactionProvider },
      async (transaction) => {
        const allPresets = await themePresetModel.findAll(
          transaction ? { transaction } : undefined
        )
        const existing = allPresets.find(
          (preset) => sanitizeText(preset?.name, 120).toLowerCase() === snapshot.name.toLowerCase()
        )

        let preset = existing
        let action = 'created'

        if (preset) {
          if (!replaceExisting) {
            action = 'skipped'
          } else {
            await preset.update(snapshot, transaction ? { transaction } : undefined)
            action = 'updated'
          }
        } else {
          preset = await themePresetModel.create(
            snapshot,
            transaction ? { transaction } : undefined
          )
          action = 'created'
        }

        if (action !== 'skipped') {
          await createThemePresetReleaseEntry(
            preset,
            changeNote || 'Import package',
            transaction
          )
        }

        return {
          action,
          preset,
        }
      }
    )
  }

  return {
    getAllThemePresets,
    createThemePreset,
    updateThemePreset,
    deleteThemePreset,
    applyThemePreset,
    getThemePresetReleases,
    rollbackThemePreset,
    exportThemePresetPackage,
    importThemePresetPackage,
  }
}

module.exports = {
  createThemePresetService,
  ...createThemePresetService(),
}
