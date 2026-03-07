/* Routes d'authentification */
const { Router } = require('express')
const { login, refresh, logout, me } = require('../controllers/authController')
const { authenticate } = require('../middleware/authMiddleware')
const { requireTrustedOrigin } = require('../middleware/trustedOriginMiddleware')
const { validate } = require('../middleware/validateMiddleware')
const { loginValidator } = require('../validators/authValidator')
const rateLimit = require('express-rate-limit')

const router = Router()

/* Rate limiter strict pour les tentatives de connexion */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/* Rate limiter dedie aux routes session (refresh/logout) */
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de requetes de session. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/login', requireTrustedOrigin, authLimiter, validate(loginValidator), login)
router.post('/refresh', requireTrustedOrigin, sessionLimiter, refresh)
router.post('/logout', requireTrustedOrigin, sessionLimiter, logout)
router.get('/me', authenticate, me)

module.exports = router
