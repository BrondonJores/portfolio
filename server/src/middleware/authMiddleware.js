/* Middleware d'authentification JWT */
const jwtLib = require('jsonwebtoken')
const { Admin } = require('../models')
const { logSecurityEventFromRequest } = require('../services/securityEventService')

/**
 * Valide la structure minimale d'un access token.
 * @param {unknown} payload Charge utile JWT decodee.
 * @returns {payload is {id:number,username:string,email:string,twoFactorEnabled?:boolean,typ:string}}
 */
function isValidAccessPayload(payload) {
  const userId = Number(payload?.id)
  const tokenVersion = Number(payload?.rtv)
  return (
    payload?.typ === 'access' &&
    Number.isInteger(userId) &&
    userId > 0 &&
    Number.isInteger(tokenVersion) &&
    tokenVersion >= 0
  )
}

/**
 * Construit le middleware d'authentification JWT.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.jwt] Librairie JWT.
 * @param {object} [deps.adminModel] Modele admin.
 * @param {NodeJS.ProcessEnv|object} [deps.env] Variables d'environnement.
 * @returns {import('express').RequestHandler} Middleware Express.
 */
function createAuthenticateMiddleware(deps = {}) {
  const jwt = deps.jwt || jwtLib
  const adminModel = deps.adminModel || Admin
  const env = deps.env || process.env

  /**
   * Verifie le token JWT dans le header Authorization.
   * Attache req.user si le token est valide et que la session reste courante.
   */
  return async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      void logSecurityEventFromRequest(req, {
        eventType: 'auth.missing_token',
        severity: 'warning',
        source: 'auth_middleware',
        message: "Acces refuse: token d'authentification manquant.",
      })
      return res.status(401).json({ error: 'Token d\'authentification manquant.' })
    }

    const token = authHeader.slice(7)

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
      if (!isValidAccessPayload(payload)) {
        throw new Error('invalid access token payload')
      }

      const userId = Number(payload.id)
      const admin = await adminModel.findByPk(userId)
      const currentTokenVersion = Number(admin?.refresh_token_version)

      if (!admin || !Number.isInteger(currentTokenVersion) || currentTokenVersion !== Number(payload.rtv)) {
        throw new Error('stale access token')
      }

      req.user = {
        id: userId,
        username: admin.username,
        email: admin.email,
        twoFactorEnabled: admin.two_factor_enabled === true,
      }
      next()
    } catch {
      /* Ne jamais exposer le detail de l'erreur JWT en production */
      void logSecurityEventFromRequest(req, {
        eventType: 'auth.invalid_token',
        severity: 'warning',
        source: 'auth_middleware',
        message: "Acces refuse: token d'authentification invalide ou expire.",
      })
      return res.status(401).json({ error: 'Token invalide ou expire.' })
    }
  }
}

module.exports = {
  createAuthenticateMiddleware,
  authenticate: createAuthenticateMiddleware(),
}
