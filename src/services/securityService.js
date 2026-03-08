/* Service admin securite : resume et liste des evenements d'intrusion. */
import { api } from './api.js'

/**
 * Retourne le resume securite du dashboard.
 * @param {{windowHours?:number}} [params] Parametres optionnels.
 * @returns {Promise<object>} Resume securite.
 */
export const getSecuritySummary = (params = {}) => {
  const windowHours = Number(params.windowHours)
  const query = Number.isInteger(windowHours) && windowHours > 0 ? `?window_hours=${windowHours}` : ''
  return api.get(`/admin/security/summary${query}`)
}

/**
 * Retourne la liste paginee des evenements securite.
 * @param {{limit?:number,offset?:number,severity?:string,eventType?:string,windowHours?:number}} [params] Filtres.
 * @returns {Promise<object>} Page d'evenements.
 */
export const getSecurityEvents = (params = {}) => {
  const query = new URLSearchParams()
  if (Number.isInteger(Number(params.limit)) && Number(params.limit) > 0) {
    query.set('limit', String(Number(params.limit)))
  }
  if (Number.isInteger(Number(params.offset)) && Number(params.offset) >= 0) {
    query.set('offset', String(Number(params.offset)))
  }
  if (params.severity) {
    query.set('severity', String(params.severity))
  }
  if (params.eventType) {
    query.set('event_type', String(params.eventType))
  }
  if (Number.isInteger(Number(params.windowHours)) && Number(params.windowHours) > 0) {
    query.set('window_hours', String(Number(params.windowHours)))
  }

  const suffix = query.toString() ? `?${query.toString()}` : ''
  return api.get(`/admin/security/events${suffix}`)
}
