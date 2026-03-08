/* Service API du visual builder admin (persistance serveur des brouillons). */
import { api } from './api.js'

/**
 * Construit une query string `entity+channel`.
 * @param {{entity: string, channel: string}} params Parametres builder.
 * @returns {string} Query string URL encodee.
 */
function toBuilderQuery(params) {
  const query = new URLSearchParams({
    entity: String(params?.entity || ''),
    channel: String(params?.channel || ''),
  })
  return query.toString()
}

/**
 * Charge le brouillon courant du visual builder depuis le serveur.
 * @param {{entity: string, channel: string}} params Parametres builder.
 * @returns {Promise<{data: object | null}>} Brouillon courant ou `null`.
 */
export const getCurrentVisualBuilderDraft = (params) =>
  api.get(`/admin/visual-builder/current?${toBuilderQuery(params)}`)

/**
 * Sauvegarde (upsert) le brouillon courant sur le serveur.
 * @param {{entity: string, channel: string, title?: string, blocks?: Array<object>}} payload Donnees builder.
 * @returns {Promise<{data: object, meta: {changed: boolean, created: boolean}}>} Brouillon persiste.
 */
export const upsertCurrentVisualBuilderDraft = (payload) =>
  api.put('/admin/visual-builder/current', payload)

/**
 * Supprime le brouillon courant (optionnel apres publication finale).
 * @param {{entity: string, channel: string}} params Parametres builder.
 * @returns {Promise<{data: {deleted: boolean}}>} Statut de suppression.
 */
export const deleteCurrentVisualBuilderDraft = (params) =>
  api.del(`/admin/visual-builder/current?${toBuilderQuery(params)}`)
