/* Middleware de verification reCAPTCHA pour les endpoints publics sensibles. */
const recaptchaService = require('../services/recaptchaService')
const { createHttpError } = require('../utils/httpError')

/**
 * Extrait l'adresse IP source la plus pertinente.
 * @param {import('express').Request} req Requete HTTP.
 * @returns {string|undefined} IP candidate.
 */
function getClientIp(req) {
  const forwarded = req.get('x-forwarded-for')
  if (forwarded) {
    const firstForwardedIp = forwarded.split(',')[0].trim()
    if (firstForwardedIp) {
      return firstForwardedIp
    }
  }

  return req.ip
}

/**
 * Construit un middleware de garde reCAPTCHA.
 * @param {object} options Options de verification.
 * @param {string} options.action Action attendue pour le token v3.
 * @param {string} [options.tokenField='captcha_token'] Champ body contenant le token.
 * @param {object} [options.recaptcha] Service reCAPTCHA injectable (tests).
 * @returns {import('express').RequestHandler} Middleware Express.
 */
function createRecaptchaGuard(options) {
  const action = String(options?.action || '').trim()
  const tokenField = String(options?.tokenField || 'captcha_token').trim()
  const recaptcha = options?.recaptcha || recaptchaService

  if (!action) {
    throw createHttpError(500, 'Action reCAPTCHA middleware manquante.')
  }

  /**
   * Valide le token reCAPTCHA et attache le resultat a `req.recaptcha`.
   * @param {import('express').Request} req Requete HTTP.
   * @param {import('express').Response} _res Reponse HTTP.
   * @param {import('express').NextFunction} next Middleware suivant.
   * @returns {Promise<void>} Promise resolue si verification OK.
   */
  return async function recaptchaGuard(req, _res, next) {
    try {
      const bodyToken = req.body?.[tokenField]
      const headerToken = req.get('x-recaptcha-token')
      const token = bodyToken || headerToken

      if (token !== undefined && typeof token !== 'string') {
        throw createHttpError(400, 'Token reCAPTCHA invalide.')
      }

      const verification = await recaptcha.verifyToken({
        token,
        remoteIp: getClientIp(req),
        expectedAction: action,
      })

      req.recaptcha = verification
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = {
  createRecaptchaGuard,
}

