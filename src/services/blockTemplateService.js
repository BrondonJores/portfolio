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
 * Importe un lot de templates en JSON.
 * @param {{templates: Array<object>, replaceExisting?: boolean}} data Payload d'import.
 * @returns {Promise<{data: {created:number,updated:number,skippedCount:number}}>} Reponse API.
 */
export const importBlockTemplates = (data) => api.post('/admin/block-templates/import', data)

/**
 * Importe un package template unique.
 * @param {object} data Payload package.
 * @returns {Promise<{data: {action:string,template:object}}>} Reponse API.
 */
export const importBlockTemplatePackage = (data) => api.post('/admin/block-templates/import-package', data)

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

/**
 * Liste l'historique des releases d'un template.
 * @param {number|string} id Identifiant template.
 * @returns {Promise<{data: Array<object>}>} Reponse API.
 */
export const getBlockTemplateReleases = (id) => api.get(`/admin/block-templates/${id}/releases`)

/**
 * Rollback un template vers une release cible.
 * @param {number|string} id Identifiant template.
 * @param {number|string} releaseId Identifiant release.
 * @returns {Promise<{data: {template: object, release: object}}>} Reponse API.
 */
export const rollbackBlockTemplate = (id, releaseId) =>
  api.post(`/admin/block-templates/${id}/rollback`, { releaseId })

/**
 * Exporte un template sous forme de package versionne.
 * @param {number|string} id Identifiant template.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const exportBlockTemplatePackage = (id) => api.get(`/admin/block-templates/${id}/export-package`)
