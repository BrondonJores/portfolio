/* Service API des pages CMS (admin + public). */
import { api } from './api.js'

const CMS_PAGE_LIST_CACHE_TTL_MS = 30_000
const CMS_PAGE_DETAIL_CACHE_TTL_MS = 60_000

/**
 * Liste admin des pages CMS.
 * @param {{status?: string, q?: string, limit?: number, offset?: number}} [params] Filtres.
 * @returns {Promise<{data: {items:Array<object>,total:number,limit:number,offset:number}}>} Reponse API.
 */
export const getAdminCmsPages = (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : ''
  return api.get(`/admin/pages${query}`)
}

/**
 * Recupere une page CMS admin par identifiant.
 * @param {number|string} id Identifiant page.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const getAdminCmsPageById = (id) => api.get(`/admin/pages/${id}`)

/**
 * Cree une page CMS.
 * @param {object} payload Donnees page.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const createCmsPage = (payload) => api.post('/admin/pages', payload)

/**
 * Met a jour une page CMS.
 * @param {number|string} id Identifiant page.
 * @param {object} payload Donnees de mise a jour.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const updateCmsPage = (id, payload) => api.put(`/admin/pages/${id}`, payload)

/**
 * Publie une page CMS.
 * @param {number|string} id Identifiant page.
 * @param {{change_note?: string}} [payload] Options.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const publishCmsPage = (id, payload = {}) => api.post(`/admin/pages/${id}/publish`, payload)

/**
 * Depublie une page CMS.
 * @param {number|string} id Identifiant page.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const unpublishCmsPage = (id) => api.post(`/admin/pages/${id}/unpublish`, {})

/**
 * Supprime une page CMS.
 * @param {number|string} id Identifiant page.
 * @returns {Promise<null | object>} Reponse API.
 */
export const deleteCmsPage = (id) => api.del(`/admin/pages/${id}`)

/**
 * Liste les revisions d'une page CMS.
 * @param {number|string} id Identifiant page.
 * @returns {Promise<{data:Array<object>}>} Reponse API.
 */
export const getCmsPageRevisions = (id) => api.get(`/admin/pages/${id}/revisions`)

/**
 * Rollback une page CMS vers une revision cible.
 * @param {number|string} id Identifiant page.
 * @param {number|string} revisionId Identifiant revision.
 * @returns {Promise<{data:{page:object,revision:object}}>} Reponse API.
 */
export const rollbackCmsPage = (id, revisionId) =>
  api.post(`/admin/pages/${id}/rollback`, { revisionId })

/**
 * Liste publique des pages publiees.
 * @param {{limit?: number, offset?: number}} [params] Parametres.
 * @returns {Promise<{data:{items:Array<object>,total:number,limit:number,offset:number}}>} Reponse API.
 */
export const getPublicCmsPages = (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : ''
  return api.get(`/pages${query}`, { cacheTtlMs: CMS_PAGE_LIST_CACHE_TTL_MS })
}

/**
 * Recupere une page publique par slug.
 * @param {string} slug Slug page.
 * @returns {Promise<{data: object}>} Reponse API.
 */
export const getPublicCmsPageBySlug = (slug) =>
  api.get(`/pages/${slug}`, { cacheTtlMs: CMS_PAGE_DETAIL_CACHE_TTL_MS })
