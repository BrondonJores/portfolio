/* Service API central avec gestion des tokens et rafraichissement automatique */

/* Base URL : vide en dev (proxy Vite), URL absolue en prod */
const API_BASE = import.meta.env.VITE_API_URL || ''

/* Stockage en memoire du token d'acces et du callback de logout */
let _accessToken = null
let _refreshTokenFn = null
let _logoutFn = null
let _refreshInFlight = null

/**
 * Extrait les messages de validation d'un payload API.
 * @param {unknown} payload Reponse d'erreur potentielle.
 * @returns {string[]} Liste de messages utilisateur.
 */
function extractValidationMessages(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.errors)) {
    return []
  }

  return Array.from(
    new Set(
      payload.errors
        .map((item) => String(item?.msg || '').trim())
        .filter(Boolean)
    )
  )
}

/**
 * Construit une erreur applicative lisible a partir d'une reponse HTTP non OK.
 * @param {number} status Code HTTP.
 * @param {unknown} payload Corps JSON parse (si disponible).
 * @returns {Error} Erreur enrichie.
 */
function buildApiError(status, payload) {
  const validationMessages = extractValidationMessages(payload)
  const payloadMessage =
    payload && typeof payload === 'object' ? String(payload.error || '').trim() : ''
  const message =
    payloadMessage ||
    (validationMessages.length > 0 ? validationMessages.join(' ') : `Erreur ${status}`)

  const error = new Error(message)
  error.status = status
  if (validationMessages.length > 0) {
    error.validationErrors = validationMessages
  }
  if (payload && typeof payload === 'object') {
    error.payload = payload
  }
  return error
}

/* Injection des dependances d'authentification depuis le contexte */
export function configureApi({ accessToken, refreshToken, logout }) {
  _accessToken = accessToken
  _refreshTokenFn = refreshToken
  _logoutFn = logout
}

/* Mutualise les rafraichissements pour eviter une rafale de /auth/refresh en parallele. */
async function getFreshAccessToken() {
  if (typeof _refreshTokenFn !== 'function') {
    throw new Error('Session expiree. Reconnexion requise.')
  }

  if (!_refreshInFlight) {
    _refreshInFlight = _refreshTokenFn()
      .then((newToken) => {
        _accessToken = newToken
        return newToken
      })
      .finally(() => {
        _refreshInFlight = null
      })
  }

  return _refreshInFlight
}

/* Construction des en-tetes avec autorisation Bearer si token disponible */
function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }
  return headers
}

/* Effectue une requete avec gestion du rafraichissement automatique en cas de 401 */
async function request(method, path, body, retried = false) {
  const options = {
    method,
    headers: buildHeaders(),
    credentials: 'include',
  }

  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}/api${path}`, options)

  /* Tentative de rafraichissement du token si 401 et non encore retente */
  if (response.status === 401 && !retried && _refreshTokenFn) {
    try {
      await getFreshAccessToken()
      return request(method, path, body, true)
    } catch {
      /* Rafraichissement echoue : deconnexion et redirection */
      if (_logoutFn) _logoutFn()
      window.location.href = '/admin/login'
      throw new Error('Session expiree. Reconnexion requise.')
    }
  }

  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      /* Impossible de parser le JSON: fallback sur le statut HTTP. */
    }
    throw buildApiError(response.status, payload)
  }

  /* Retourne null pour les reponses 204 sans corps */
  if (response.status === 204) return null

  return response.json()
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
}
