/* Middleware d'authentification JWT */
const jwt = require('jsonwebtoken')
const { logSecurityEventFromRequest } = require('../services/securityEventService')

/**
 * Verifie le token JWT dans le header Authorization.
 * Attache req.user si le token est valide.
 */
function authenticate(req, res, next) {
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
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    req.user = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      twoFactorEnabled: payload.twoFactorEnabled === true,
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

module.exports = { authenticate }
