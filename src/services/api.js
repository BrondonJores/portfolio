/* Service API central avec gestion des tokens et rafraichissement automatique */

/* Base URL : vide en dev (proxy Vite), URL absolue en prod */
const API_BASE = import.meta.env.VITE_API_URL || ''

/* Stockage en memoire du token d'acces et du callback de logout */
let _accessToken = null
let _refreshTokenFn = null
let _logoutFn = null
let _refreshInFlight = null
let _pendingGetRequests = new Map()
let _cachedGetResponses = new Map()
let _cacheGeneration = 0
let _isAuthenticatedScope = false

/**
 * Invalide toutes les optimisations GET (dedup + cache TTL).
 * @returns {void}
 */
function invalidateGetOptimizations() {
  _cacheGeneration += 1
  _pendingGetRequests.clear()
  _cachedGetResponses.clear()
}

/**
 * Normalise une TTL de cache en millisecondes.
 * @param {unknown} cacheTtlMs Valeur candidate.
 * @returns {number} TTL valide (>= 0).
 */
function sanitizeCacheTtl(cacheTtlMs) {
  const ttl = Number(cacheTtlMs)
  if (!Number.isFinite(ttl) || ttl <= 0) {
    return 0
  }
  return Math.floor(ttl)
}

/**
 * Realise un clone defensif d'un payload JSON.
 * @param {unknown} payload Donnee a cloner.
 * @returns {unknown} Copie du payload.
 */
function clonePayload(payload) {
  if (payload === null || payload === undefined) {
    return payload
  }

  if (typeof payload !== 'object') {
    return payload
  }

  try {
    return structuredClone(payload)
  } catch {
    try {
      return JSON.parse(JSON.stringify(payload))
    } catch {
      return payload
    }
  }
}

/**
 * Lit le cache GET et nettoie les entrees expirees.
 * @param {string} cacheKey Cle de cache.
 * @returns {{hit:boolean,payload:unknown}} Resultat de lecture.
 */
function readCachedGetPayload(cacheKey) {
  const entry = _cachedGetResponses.get(cacheKey)
  if (!entry) {
    return { hit: false, payload: null }
  }

  if (entry.expiresAt <= Date.now()) {
    _cachedGetResponses.delete(cacheKey)
    return { hit: false, payload: null }
  }

  return { hit: true, payload: clonePayload(entry.payload) }
}

/**
 * Ecrit une reponse GET dans le cache TTL si la generation est toujours courante.
 * @param {string} cacheKey Cle de cache.
 * @param {unknown} payload Reponse API.
 * @param {number} ttlMs TTL en millisecondes.
 * @param {number} generationAtStart Generation capturee au lancement.
 * @returns {void}
 */
function writeCachedGetPayload(cacheKey, payload, ttlMs, generationAtStart) {
  if (ttlMs <= 0 || generationAtStart !== _cacheGeneration) {
    return
  }

  _cachedGetResponses.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    payload: clonePayload(payload),
  })
}

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
  const nextAuthScope = Boolean(accessToken)
  if (nextAuthScope !== _isAuthenticatedScope) {
    invalidateGetOptimizations()
  }
  _isAuthenticatedScope = nextAuthScope

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

/* Execute une requete HTTP brute avec gestion du rafraichissement automatique en cas de 401. */
async function executeRequest(method, path, body, retried = false) {
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
      return executeRequest(method, path, body, true)
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

/*
 * Point d'entree des appels API.
 * Optimisation non-cassante:
 * - deduplication des GET concurrents sur la meme route.
 *   => si deux composants demandent simultanement le meme endpoint,
 *      un seul aller-retour reseau est effectue.
 */
function request(method, path, body, options = {}) {
  const normalizedOptions = options && typeof options === 'object' ? options : {}
  const cacheTtlMs = sanitizeCacheTtl(normalizedOptions.cacheTtlMs)
  const isGet = method === 'GET' && body === undefined

  if (!isGet) {
    return executeRequest(method, path, body).then((payload) => {
      invalidateGetOptimizations()
      return payload
    })
  }

  const cacheKey = path
  if (cacheTtlMs > 0) {
    const cached = readCachedGetPayload(cacheKey)
    if (cached.hit) {
      return Promise.resolve(cached.payload)
    }
  }

  const pending = _pendingGetRequests.get(cacheKey)
  if (pending) {
    return cacheTtlMs > 0 ? pending.then((payload) => clonePayload(payload)) : pending
  }

  const generationAtStart = _cacheGeneration
  const requestPromise = executeRequest(method, path, body)
    .then((payload) => {
      if (cacheTtlMs > 0) {
        writeCachedGetPayload(cacheKey, payload, cacheTtlMs, generationAtStart)
      }
      return payload
    })
    .finally(() => {
      const current = _pendingGetRequests.get(cacheKey)
      if (current === requestPromise) {
        _pendingGetRequests.delete(cacheKey)
      }
    })

  _pendingGetRequests.set(cacheKey, requestPromise)
  return cacheTtlMs > 0 ? requestPromise.then((payload) => clonePayload(payload)) : requestPromise
}

export const api = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
}
