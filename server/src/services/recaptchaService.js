/* Service metier reCAPTCHA : verification anti-bot centralisee. */
const { createHttpError } = require('../utils/httpError')

const GOOGLE_RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

/**
 * Parse une variable booleenne type env (`true`, `1`, `yes`, `on`).
 * @param {unknown} value Valeur brute a interpreter.
 * @param {boolean} [fallback=false] Valeur de repli si absente.
 * @returns {boolean} Booleen calcule.
 */
function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

/**
 * Parse une liste CSV d'hotes.
 * @param {unknown} value Valeur brute CSV.
 * @returns {string[]} Liste des hotes normalises.
 */
function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Parse le score minimal attendu pour reCAPTCHA v3.
 * @param {unknown} value Valeur brute.
 * @param {number} [fallback=0.5] Valeur par defaut.
 * @returns {number} Score min borne entre 0 et 1.
 */
function parseScoreThreshold(value, fallback = 0.5) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  if (parsed < 0) return 0
  if (parsed > 1) return 1
  return parsed
}

/**
 * Construit le service reCAPTCHA avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {NodeJS.ProcessEnv|object} [deps.env] Variables d'environnement cible.
 * @param {Function} [deps.fetch] Implementation fetch.
 * @param {object} [deps.logger] Logger cible.
 * @returns {{isEnabled: Function, verifyToken: Function}} API reCAPTCHA.
 */
function createRecaptchaService(deps = {}) {
  const env = deps.env || process.env
  const fetchFn = deps.fetch || global.fetch
  const logger = deps.logger || console

  /**
   * Indique si la verification reCAPTCHA doit etre appliquee.
   * - En production : active par defaut.
   * - En dev/test : inactive par defaut (sauf override explicite).
   * @returns {boolean} true si reCAPTCHA est active.
   */
  function isEnabled() {
    if (env.RECAPTCHA_ENABLED !== undefined) {
      return parseBooleanEnv(env.RECAPTCHA_ENABLED, false)
    }

    return env.NODE_ENV === 'production'
  }

  /**
   * Verifie qu'un secret reCAPTCHA est configure.
   * @returns {string} Secret reCAPTCHA.
   * @throws {Error} Erreur 500 si la configuration est invalide.
   */
  function requireSecretKey() {
    const secret = String(env.RECAPTCHA_SECRET_KEY || '').trim()
    if (!secret) {
      throw createHttpError(500, 'Configuration reCAPTCHA manquante.')
    }
    return secret
  }

  /**
   * Execute l'appel HTTP vers l'endpoint Google reCAPTCHA.
   * @param {{secret:string,token:string,remoteIp?:string}} params Parametres de verification.
   * @returns {Promise<object>} Reponse JSON du provider.
   * @throws {Error} Erreur 502 si provider indisponible.
   */
  async function callGoogleVerifyApi({ secret, token, remoteIp }) {
    if (typeof fetchFn !== 'function') {
      throw createHttpError(500, 'fetch indisponible pour la verification reCAPTCHA.')
    }

    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    if (remoteIp) {
      body.set('remoteip', remoteIp)
    }

    let response
    try {
      response = await fetchFn(GOOGLE_RECAPTCHA_VERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
    } catch (err) {
      logger.error('[recaptcha] Echec reseau vers Google:', err?.message || err)
      throw createHttpError(502, 'Service reCAPTCHA indisponible.')
    }

    if (!response.ok) {
      throw createHttpError(502, 'Service reCAPTCHA indisponible.')
    }

    const payload = await response.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      throw createHttpError(502, 'Reponse reCAPTCHA invalide.')
    }

    return payload
  }

  /**
   * Verifie la validite d'un token reCAPTCHA.
   * @param {object} params Parametres de verification.
   * @param {string|undefined} params.token Token reCAPTCHA fourni par le client.
   * @param {string|undefined} [params.remoteIp] IP source optionnelle.
   * @param {string|undefined} [params.expectedAction] Action attendue (reCAPTCHA v3).
   * @returns {Promise<object>} Resume de verification.
   * @throws {Error} Erreur HTTP 400/500/502 selon le cas.
   */
  async function verifyToken({ token, remoteIp, expectedAction }) {
    if (!isEnabled()) {
      return {
        enabled: false,
        skipped: true,
      }
    }

    const cleanToken = String(token || '').trim()
    if (!cleanToken) {
      throw createHttpError(400, 'Verification anti-bot requise.')
    }

    const secret = requireSecretKey()
    const assessment = await callGoogleVerifyApi({
      secret,
      token: cleanToken,
      remoteIp,
    })

    if (!assessment.success) {
      throw createHttpError(400, 'Verification anti-bot invalide.')
    }

    if (expectedAction && assessment.action && assessment.action !== expectedAction) {
      throw createHttpError(400, 'Action reCAPTCHA invalide.')
    }

    const minScore = parseScoreThreshold(env.RECAPTCHA_MIN_SCORE, 0.5)
    if (typeof assessment.score === 'number' && assessment.score < minScore) {
      throw createHttpError(400, 'Score anti-bot insuffisant.')
    }

    const allowedHostnames = parseCsvList(env.RECAPTCHA_ALLOWED_HOSTNAMES)
    if (allowedHostnames.length > 0) {
      const hostname = String(assessment.hostname || '').toLowerCase()
      if (!hostname || !allowedHostnames.includes(hostname)) {
        throw createHttpError(400, 'Hote reCAPTCHA non autorise.')
      }
    }

    return {
      enabled: true,
      skipped: false,
      success: true,
      score: typeof assessment.score === 'number' ? assessment.score : null,
      action: assessment.action || null,
      hostname: assessment.hostname || null,
      challengeTs: assessment.challenge_ts || null,
    }
  }

  return {
    isEnabled,
    verifyToken,
  }
}

module.exports = {
  createRecaptchaService,
  ...createRecaptchaService(),
}

