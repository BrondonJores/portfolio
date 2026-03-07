/* Routes d'authentification */
const { Router } = require('express')
const {
  login,
  verifyTwoFactor,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
  twoFactorStatus,
  refresh,
  logout,
  me,
} = require('../controllers/authController')
const { authenticate } = require('../middleware/authMiddleware')
const { requireTrustedOrigin } = require('../middleware/trustedOriginMiddleware')
const { validate } = require('../middleware/validateMiddleware')
const {
  loginValidator,
  verifyTwoFactorValidator,
  twoFactorEnableValidator,
  twoFactorDisableValidator,
  regenerateRecoveryCodesValidator,
} = require('../validators/authValidator')
const rateLimit = require('express-rate-limit')
const { logSecurityEventFromRequest } = require('../services/securityEventService')

const router = Router()

/* Rate limiter strict pour les tentatives de connexion */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    void logSecurityEventFromRequest(req, {
      eventType: 'auth.login_rate_limited',
      severity: 'critical',
      source: 'auth_limiter',
      email: req.body?.email,
      message: 'Blocage anti-bruteforce sur /auth/login.',
    })
    res.status(429).json({ error: 'Trop de tentatives de connexion. Reessayez dans 15 minutes.' })
  },
})

/* Rate limiter dedie aux routes session (refresh/logout) */
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de requetes de session. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/* Rate limiter strict pour validation 2FA login */
const verifyTwoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives 2FA. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    void logSecurityEventFromRequest(req, {
      eventType: 'auth.2fa_rate_limited',
      severity: 'critical',
      source: 'auth_limiter',
      message: 'Blocage anti-bruteforce sur /auth/verify-2fa.',
    })
    res.status(429).json({ error: 'Trop de tentatives 2FA. Reessayez dans 15 minutes.' })
  },
})

router.post('/login', requireTrustedOrigin, authLimiter, validate(loginValidator), login)
router.post('/verify-2fa', requireTrustedOrigin, verifyTwoFactorLimiter, validate(verifyTwoFactorValidator), verifyTwoFactor)
router.post('/refresh', requireTrustedOrigin, sessionLimiter, refresh)
router.post('/logout', requireTrustedOrigin, sessionLimiter, logout)
router.get('/me', authenticate, me)
router.get('/2fa/status', authenticate, twoFactorStatus)
router.post('/2fa/setup', requireTrustedOrigin, authenticate, setupTwoFactor)
router.post('/2fa/enable', requireTrustedOrigin, authenticate, validate(twoFactorEnableValidator), enableTwoFactor)
router.post('/2fa/disable', requireTrustedOrigin, authenticate, validate(twoFactorDisableValidator), disableTwoFactor)
router.post('/2fa/recovery-codes', requireTrustedOrigin, authenticate, validate(regenerateRecoveryCodesValidator), regenerateRecoveryCodes)

module.exports = router

