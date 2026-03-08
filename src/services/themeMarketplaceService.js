/* Service API du marketplace de themes. */
import { api } from './api.js'

const THEME_MARKETPLACE_CACHE_TTL_MS = 30_000

/**
 * Recupere la liste des themes marketplace cote admin.
 * @param {{q?: string, category?: string}} [params] Filtres optionnels.
 * @returns {Promise<{data:Array<object>}>} Reponse API.
 */
export const getThemeMarketplace = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/theme-marketplace${query}`, {
    cacheTtlMs: THEME_MARKETPLACE_CACHE_TTL_MS,
  })
}

/**
 * Importe un theme marketplace dans les presets.
 * @param {string} slug Slug du theme marketplace.
 * @param {{replaceExisting?: boolean, applyAfterImport?: boolean}} payload Options import.
 * @returns {Promise<{data:{action:string,applied:boolean,preset:object}}>} Reponse API.
 */
export const importThemeFromMarketplace = (slug, payload = {}) =>
  api.post(`/admin/theme-marketplace/${encodeURIComponent(slug)}/import`, payload)
