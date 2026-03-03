/* Service API central avec gestion des tokens et rafraichissement automatique */

/* Base URL : vide en dev (proxy Vite), URL absolue en prod */
const API_BASE = import.meta.env.VITE_API_URL || ''

/* Stockage en memoire du token d'acces et du callback de logout */
let _accessToken = null
let _refreshTokenFn = null
let _logoutFn = null

/* Injection des dependances d'authentification depuis le contexte */
export function configureApi({ accessToken, refreshToken, logout }) {
  _accessToken = accessToken
  _refreshTokenFn = refreshToken
  _logoutFn = logout
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
      const newToken = await _refreshTokenFn()
      _accessToken = newToken
      return request(method, path, body, true)
    } catch {
      /* Rafraichissement echoue : deconnexion et redirection */
      if (_logoutFn) _logoutFn()
      window.location.href = '/admin/login'
      throw new Error('Session expiree. Reconnexion requise.')
    }
  }

  if (!response.ok) {
    let errorMessage = `Erreur ${response.status}`
    try {
      const data = await response.json()
      errorMessage = data.error || errorMessage
    } catch {
      /* Impossible de parser le JSON */
    }
    throw new Error(errorMessage)
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
