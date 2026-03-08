/* Utilitaires partages de pagination offset/limit pour les listes admin/public. */

/**
 * Parse un entier strictement positif.
 * @param {unknown} value Valeur brute.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier positif valide.
 */
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

/**
 * Parse un entier positif ou nul.
 * @param {unknown} value Valeur brute.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier >= 0.
 */
function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }
  return parsed
}

/**
 * Normalise un couple limit/offset avec bornes.
 * @param {object} [params={}] Parametres bruts.
 * @param {unknown} [params.limit] Taille de page.
 * @param {unknown} [params.offset] Offset.
 * @param {object} [options={}] Options de normalisation.
 * @param {number} [options.defaultLimit=20] Limite par defaut.
 * @param {number} [options.maxLimit=200] Limite max autorisee.
 * @param {number} [options.defaultOffset=0] Offset par defaut.
 * @returns {{limit:number,offset:number}} Pagination normalisee.
 */
function resolveLimitOffsetPagination(params = {}, options = {}) {
  const defaultLimit = parsePositiveInt(options.defaultLimit, 20)
  const maxLimit = Math.max(parsePositiveInt(options.maxLimit, 200), defaultLimit)
  const defaultOffset = parseNonNegativeInt(options.defaultOffset, 0)

  const rawLimit = parsePositiveInt(params.limit, defaultLimit)
  const limit = Math.min(rawLimit, maxLimit)
  const offset = parseNonNegativeInt(params.offset, defaultOffset)

  return { limit, offset }
}

/**
 * Construit un payload de pagination API standard.
 * @param {object} params Parametres source.
 * @param {Array<object>} params.items Elements pagines.
 * @param {number|string} params.total Total global.
 * @param {number} params.limit Taille page.
 * @param {number} params.offset Offset courant.
 * @returns {{items:Array<object>,total:number,limit:number,offset:number}} Payload standardise.
 */
function buildPaginatedPayload({ items, total, limit, offset }) {
  return {
    items: Array.isArray(items) ? items : [],
    total: Number.parseInt(String(total || 0), 10) || 0,
    limit: parsePositiveInt(limit, 20),
    offset: parseNonNegativeInt(offset, 0),
  }
}

module.exports = {
  parsePositiveInt,
  parseNonNegativeInt,
  resolveLimitOffsetPagination,
  buildPaginatedPayload,
}
