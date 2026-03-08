/* Service API des presets de theme admin. */
import { api } from './api.js'

const THEME_PRESET_CACHE_TTL_MS = 30_000

/**
 * Recupere la liste des presets de theme.
 * @returns {Promise<{data: Array<object>}>} Reponse API.
 */
export const getThemePresets = () =>
  api.get('/admin/theme-presets', { cacheTtlMs: THEME_PRESET_CACHE_TTL_MS })

/**
 * Recupere la liste publique des presets de theme.
 * @returns {Promise<{data: Array<object>}>} Reponse API.
 */
export const getPublicThemePresets = () =>
  api.get('/theme-presets', { cacheTtlMs: THEME_PRESET_CACHE_TTL_MS })

/**
 * Cree un preset de theme.
 * @param {object} data Donnees du preset.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const createThemePreset = (data) => api.post('/admin/theme-presets', data)

/**
 * Met a jour un preset de theme.
 * @param {number|string} id Identifiant preset.
 * @param {object} data Champs a modifier.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const updateThemePreset = (id, data) => api.put(`/admin/theme-presets/${id}`, data)

/**
 * Supprime un preset de theme.
 * @param {number|string} id Identifiant preset.
 * @returns {Promise<null | object>} Reponse API.
 */
export const deleteThemePreset = (id) => api.del(`/admin/theme-presets/${id}`)

/**
 * Applique un preset sur les settings globaux.
 * @param {number|string} id Identifiant preset.
 * @returns {Promise<{data: object, success: boolean}>} Reponse API.
 */
export const applyThemePreset = (id) => api.post(`/admin/theme-presets/${id}/apply`, {})

/**
 * Liste l'historique des releases d'un preset.
 * @param {number|string} id Identifiant preset.
 * @returns {Promise<{data: Array<object>}>} Reponse API.
 */
export const getThemePresetReleases = (id) => api.get(`/admin/theme-presets/${id}/releases`)

/**
 * Rollback un preset vers une release cible.
 * @param {number|string} id Identifiant preset.
 * @param {number|string} releaseId Identifiant release.
 * @returns {Promise<{data: {preset: object, release: object}}>} Reponse API.
 */
export const rollbackThemePreset = (id, releaseId) =>
  api.post(`/admin/theme-presets/${id}/rollback`, { releaseId })

/**
 * Exporte un preset sous forme de package versionne.
 * @param {number|string} id Identifiant preset.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const exportThemePresetPackage = (id) => api.get(`/admin/theme-presets/${id}/export-package`)

/**
 * Importe un package de preset.
 * @param {object} data Payload package.
 * @returns {Promise<{data: {action:string,preset:object}}>} Reponse API.
 */
export const importThemePresetPackage = (data) => api.post('/admin/theme-presets/import-package', data)
