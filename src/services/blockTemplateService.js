/* Service de gestion des templates de blocs (admin). */
import { api } from './api.js'

/**
 * Recupere les templates admin, avec filtre optionnel sur le contexte.
 * @param {{context?: string}} [params] Parametres de filtre.
 * @returns {Promise<{data: Array<object>}>} Reponse API.
 */
export const getAdminBlockTemplates = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/block-templates${query}`)
}

/**
 * Cree un template de blocs.
 * @param {object} data Payload du template.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const createBlockTemplate = (data) => api.post('/admin/block-templates', data)

/**
 * Met a jour un template existant.
 * @param {number|string} id Identifiant du template.
 * @param {object} data Champs a mettre a jour.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const updateBlockTemplate = (id, data) => api.put(`/admin/block-templates/${id}`, data)

/**
 * Supprime un template.
 * @param {number|string} id Identifiant du template.
 * @returns {Promise<null | object>} Reponse API.
 */
export const deleteBlockTemplate = (id) => api.del(`/admin/block-templates/${id}`)
