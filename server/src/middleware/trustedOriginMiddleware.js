/* Middleware de verification d'origine pour les endpoints sensibles bases cookie. */
const { logSecurityEventFromRequest } = require('../services/securityEventService')

/**
 * Normalise une origine pour comparaison stricte.
 * @param {string | undefined | null} value Origine brute.
 * @returns {string} Origine normalisee (sans slash final) ou chaine vide.
 */
function normalizeOrigin(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
}

/**
 * Parse une liste d'origines CSV.
 * @param {string | undefined} raw Valeur brute (ex: "https://a.com,https://b.com").
 * @returns {string[]} Origines normalisees.
 */
function parseCsvOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean)
}

/**
 * Extrait l'origine a partir d'un header Referer.
 * @param {string | undefined} referer Header referer brut.
 * @returns {string} Origine extraite ou chaine vide.
 */
function extractOriginFromReferer(referer) {
  try {
    return normalizeOrigin(new URL(String(referer || '')).origin)
  } catch {
    return ''
  }
}

/**
 * Construit la liste des origines autorisees (front principal + liste complementaire).
 * @param {NodeJS.ProcessEnv | object} env Variables d'environnement.
 * @returns {Set<string>} Ensemble d'origines de confiance.
 */
function getTrustedOrigins(env) {
  const origins = new Set()

  for (const origin of parseCsvOrigins(env.FRONTEND_URL)) {
    origins.add(origin)
  }

  for (const origin of parseCsvOrigins(env.CORS_ORIGINS)) {
    origins.add(origin)
  }

  for (const origin of parseCsvOrigins(env.TRUSTED_ORIGINS)) {
    origins.add(origin)
  }

  if (env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000')
    origins.add('http://127.0.0.1:3000')
  }

  return origins
}

/**
 * Autorise uniquement les requetes avec une origine front approuvee.
 * Si Origin/Referer sont absents (curl, script serveur), la requete est acceptee.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware suivant.
 * @returns {void}
 */
function requireTrustedOrigin(req, res, next) {
  const originHeader = normalizeOrigin(req.get('origin'))
  const refererHeader = req.get('referer')

  if (!originHeader && !refererHeader) {
    next()
    return
  }

  const requestOrigin = originHeader || extractOriginFromReferer(refererHeader)
  const trustedOrigins = getTrustedOrigins(process.env)

  if (trustedOrigins.size === 0) {
    next()
    return
  }

  if (!requestOrigin || !trustedOrigins.has(requestOrigin)) {
    void logSecurityEventFromRequest(req, {
      eventType: 'request.untrusted_origin',
      severity: 'critical',
      source: 'trusted_origin_middleware',
      message: 'Requete bloquee: origine non autorisee.',
      metadata: {
        requestOrigin,
      },
    })
    res.status(403).json({ error: 'Origine non autorisee.' })
    return
  }

  next()
}

module.exports = {
  requireTrustedOrigin,
}
