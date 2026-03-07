/* Service API des presets de theme admin. */
import { api } from './api.js'

/**
 * Recupere la liste des presets de theme.
 * @returns {Promise<{data: Array<object>}>} Reponse API.
 */
export const getThemePresets = () => api.get('/admin/theme-presets')

/**
 * Recupere la liste publique des presets de theme.
 * @returns {Promise<{data: Array<object>}>} Reponse API.
 */
export const getPublicThemePresets = () => api.get('/theme-presets')

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
