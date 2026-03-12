/* Application Express principale */
require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const routes = require('./routes')
const { errorHandler } = require('./middleware/errorMiddleware')
const { getSitemapXml } = require('./controllers/sitemapController')
const { logSecurityEventFromRequest } = require('./services/securityEventService')
const { getRateLimitCommonOptions } = require('./utils/rateLimitConfig')

const app = express()
const CLOUDINARY_ASSET_ORIGIN = 'https://res.cloudinary.com'

/**
 * Parse une valeur booleenne style env (`true`, `1`, `yes`, `on`).
 * @param {unknown} value Valeur brute.
 * @param {boolean} [fallback=false] Valeur de repli.
 * @returns {boolean} Booleen normalise.
 */
function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

/**
 * Parse une valeur entiere positive.
 * @param {unknown} value Valeur brute.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier normalise.
 */
function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Parse la valeur trust proxy Express.
 * @param {unknown} value Valeur brute env.
 * @returns {boolean|number} Configuration trust proxy.
 */
function parseTrustProxy(value) {
  if (value === undefined || value === null || value === '') {
    return false
  }

  const trimmed = String(value).trim().toLowerCase()
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  return parseBooleanEnv(trimmed, false)
}

/**
 * Parse une liste CSV d'origines.
 * @param {string | undefined} raw Valeur brute.
 * @returns {string[]} Liste d'origines propres.
 */
function parseOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

/**
 * Retourne la liste des origines CORS autorisees.
 * @returns {string[]} Liste d'origines.
 */
function getAllowedOrigins() {
  const origins = new Set()

  for (const origin of parseOrigins(process.env.FRONTEND_URL)) {
    origins.add(origin)
  }

  for (const origin of parseOrigins(process.env.CORS_ORIGINS)) {
    origins.add(origin)
  }

  for (const origin of parseOrigins(process.env.TRUSTED_ORIGINS)) {
    origins.add(origin)
  }

  if (origins.size === 0) {
    origins.add('http://localhost:3000')
  }

  return Array.from(origins)
}

/**
 * Normalise un chemin API pour les comparaisons de categories.
 * @param {unknown} value Valeur brute de chemin.
 * @returns {string} Chemin normalise en minuscule.
 */
function normalizeApiPath(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

/**
 * Indique si un chemin appartient a la zone `/api/auth`.
 * @param {string} path Chemin API normalise.
 * @returns {boolean} True si endpoint auth.
 */
function isAuthPath(path) {
  return path === '/auth' || path.startsWith('/auth/')
}

/**
 * Indique si un chemin appartient a la zone `/api/admin`.
 * @param {string} path Chemin API normalise.
 * @returns {boolean} True si endpoint admin.
 */
function isAdminPath(path) {
  return path === '/admin' || path.startsWith('/admin/')
}

/**
 * Construit un rate limiter segmente avec journalisation securite.
 * @param {object} options Configuration limiter.
 * @param {number} options.windowMs Duree fenetre.
 * @param {number} options.max Nombre max de requetes.
 * @param {string} options.eventType Type d'evenement securite.
 * @param {string} options.source Source metier.
 * @param {string} options.errorMessage Message utilisateur.
 * @param {(req: import('express').Request) => boolean} [options.skip] Regle de bypass.
 * @returns {import('express').RequestHandler} Middleware rate limiter.
 */
function createScopedRateLimiter(options) {
  return rateLimit({
    ...getRateLimitCommonOptions(options.namespace || options.source || 'api'),
    windowMs: options.windowMs,
    max: options.max,
    message: { error: options.errorMessage },
    skip: options.skip,
    handler(req, res) {
      void logSecurityEventFromRequest(req, {
        eventType: options.eventType,
        severity: 'warning',
        source: options.source,
        message: options.errorMessage,
      })
      res.status(429).json({ error: options.errorMessage })
    },
  })
}

/* Rend la detection IP compatible Render/Reverse proxy pour le rate limit. */
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY))

/* En-tetes de securite HTTP */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        scriptSrc: [
          "'self'",
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://www.recaptcha.net',
        ],
        frameSrc: [
          "'self'",
          'https://www.google.com',
          'https://recaptcha.google.com',
          'https://www.recaptcha.net',
        ],
        connectSrc: [
          "'self'",
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://www.recaptcha.net',
          CLOUDINARY_ASSET_ORIGIN,
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
        ],
        mediaSrc: [
          "'self'",
          'data:',
          'blob:',
          CLOUDINARY_ASSET_ORIGIN,
        ],
        workerSrc: [
          "'self'",
          'blob:',
        ],
      },
    },
  })
)

/* Configuration CORS restrictive */
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = getAllowedOrigins()

      if (!origin) {
        callback(null, true)
        return
      }

      const normalizedOrigin = String(origin).replace(/\/+$/, '')
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true)
        return
      }

      callback(null, false)
    },
    credentials: true,
  })
)

/* Parseur de cookies pour les tokens HTTP-only */
app.use(cookieParser())

/* Parseur JSON limite a 10 Mo */
app.use(express.json({ limit: '10mb' }))
/* Parseur formulaires URL-encoded (utilise pour confirmations unsubscribe HTML). */
app.use(express.urlencoded({ extended: false, limit: '10mb' }))

/* Journalisation HTTP en developpement */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

/* Rate limiting segmente par zone API pour eviter les 429 en cascade. */
const rateLimitWindowMs = parsePositiveInteger(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 15 * 60 * 1000)
const publicRateLimitMax = parsePositiveInteger(
  process.env.RATE_LIMIT_PUBLIC_MAX,
  parsePositiveInteger(process.env.RATE_LIMIT_GLOBAL_MAX, process.env.NODE_ENV === 'production' ? 1200 : 400)
)
const adminRateLimitMax = parsePositiveInteger(
  process.env.RATE_LIMIT_ADMIN_MAX,
  process.env.NODE_ENV === 'production' ? 900 : 300
)
const authRateLimitMax = parsePositiveInteger(
  process.env.RATE_LIMIT_AUTH_MAX,
  process.env.NODE_ENV === 'production' ? 240 : 100
)

const publicApiLimiter = createScopedRateLimiter({
  windowMs: rateLimitWindowMs,
  max: publicRateLimitMax,
  namespace: 'api_public',
  eventType: 'request.rate_limited.public',
  source: 'public_rate_limiter',
  errorMessage: 'Trop de requetes publiques. Reessayez dans 15 minutes.',
  skip(req) {
    const path = normalizeApiPath(req.path)
    return isAuthPath(path) || isAdminPath(path)
  },
})

const adminApiLimiter = createScopedRateLimiter({
  windowMs: rateLimitWindowMs,
  max: adminRateLimitMax,
  namespace: 'api_admin',
  eventType: 'request.rate_limited.admin',
  source: 'admin_rate_limiter',
  errorMessage: 'Trop de requetes admin. Reessayez dans 15 minutes.',
})

const authApiLimiter = createScopedRateLimiter({
  windowMs: rateLimitWindowMs,
  max: authRateLimitMax,
  namespace: 'api_auth',
  eventType: 'request.rate_limited.auth',
  source: 'auth_rate_limiter',
  errorMessage: "Trop de requetes d'authentification. Reessayez dans 15 minutes.",
})

app.use('/api/auth', authApiLimiter)
app.use('/api/admin', adminApiLimiter)
app.use('/api', publicApiLimiter)

/* Endpoint sitemap XML public pour les robots SEO. */
app.get('/sitemap.xml', getSitemapXml)

/* Montage des routes sur /api */
app.use('/api', routes)

/* Middleware de gestion des erreurs globales */
app.use(errorHandler)

/* Demarrage serveur (extrait pour faciliter les tests smoke) */
function startServer(port = process.env.PORT || 5000) {
  const server = app.listen(port, () => {
    const address = server.address()
    const effectivePort = typeof address === 'object' && address ? address.port : port
    console.log(`Serveur demarre sur le port ${effectivePort}`)
  })
  return server
}

if (require.main === module) {
  startServer()
}

module.exports = { app, startServer }
