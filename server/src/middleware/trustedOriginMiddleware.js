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
 * Indique si le serveur tourne en production.
 * @param {NodeJS.ProcessEnv | object} env Variables d'environnement.
 * @returns {boolean} true en production.
 */
function isProductionEnv(env) {
  return String(env?.NODE_ENV || '').toLowerCase() === 'production'
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
 * En production, l'absence de Origin/Referer est bloquante (mode fail-closed).
 * En developpement, ce cas reste autorise pour faciliter les scripts locaux.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware suivant.
 * @returns {void}
 */
function requireTrustedOrigin(req, res, next) {
  const originHeader = normalizeOrigin(req.get('origin'))
  const refererHeader = req.get('referer')
  const isProduction = isProductionEnv(process.env)

  /**
   * Bloque la requete et journalise la raison.
   * @param {string} eventType Type d'evenement securite.
   * @param {string} message Message humain.
   * @param {object} [metadata={}] Metadata associees.
   * @returns {void}
   */
  function deny(eventType, message, metadata = {}) {
    void logSecurityEventFromRequest(req, {
      eventType,
      severity: 'critical',
      source: 'trusted_origin_middleware',
      message,
      metadata,
    })
    res.status(403).json({ error: 'Origine non autorisee.' })
  }

  if (!originHeader && !refererHeader) {
    if (isProduction) {
      deny(
        'request.missing_origin',
        'Requete bloquee: en-tete Origin/Referer manquant sur endpoint sensible.'
      )
      return
    }

    next()
    return
  }

  const requestOrigin = originHeader || extractOriginFromReferer(refererHeader)
  const trustedOrigins = getTrustedOrigins(process.env)

  if (trustedOrigins.size === 0) {
    if (isProduction) {
      deny(
        'request.trusted_origin_misconfigured',
        'Requete bloquee: aucune origine de confiance configuree en production.'
      )
      return
    }

    next()
    return
  }

  if (!requestOrigin || !trustedOrigins.has(requestOrigin)) {
    deny('request.untrusted_origin', 'Requete bloquee: origine non autorisee.', {
      requestOrigin,
    })
    return
  }

  next()
}

module.exports = {
  requireTrustedOrigin,
}
