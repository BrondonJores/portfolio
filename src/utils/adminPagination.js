/* Helpers pagination cote admin (normalisation API). */

/**
 * Normalise une reponse liste admin vers un payload pagine.
 * Supporte:
 * - Array brut (legacy)
 * - Objet {items,total,limit,offset}
 * @param {unknown} payload Donnees `data` de l'API.
 * @param {{defaultLimit?:number,requestedOffset?:number}} [options] Options.
 * @returns {{items:Array<object>,total:number,limit:number,offset:number}} Payload pagine.
 */
export function normalizeAdminPagePayload(payload, options = {}) {
  const defaultLimit = Number.isInteger(options.defaultLimit) && options.defaultLimit > 0
    ? options.defaultLimit
    : 20
  const requestedOffset = Number.isInteger(options.requestedOffset) && options.requestedOffset >= 0
    ? options.requestedOffset
    : 0

  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      limit: defaultLimit,
      offset: requestedOffset,
    }
  }

  if (payload && typeof payload === 'object') {
    const safeItems = Array.isArray(payload.items) ? payload.items : []
    const safeTotal = Number.isFinite(Number(payload.total)) ? Number(payload.total) : safeItems.length
    const safeLimit =
      Number.isFinite(Number(payload.limit)) && Number(payload.limit) > 0
        ? Number(payload.limit)
        : defaultLimit
    const safeOffset =
      Number.isFinite(Number(payload.offset)) && Number(payload.offset) >= 0
        ? Number(payload.offset)
        : requestedOffset

    return {
      items: safeItems,
      total: safeTotal,
      limit: safeLimit,
      offset: safeOffset,
    }
  }

  return {
    items: [],
    total: 0,
    limit: defaultLimit,
    offset: requestedOffset,
  }
}

/**
 * Convertit un numero de page (1-based) en offset.
 * @param {number} page Numero de page.
 * @param {number} limit Taille de page.
 * @returns {number} Offset calcule.
 */
export function toOffsetFromPage(page, limit) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20
  return (safePage - 1) * safeLimit
}
