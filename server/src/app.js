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
const { logSecurityEventFromRequest } = require('./services/securityEventService')

const app = express()

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
    return process.env.NODE_ENV === 'production' ? 1 : false
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
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
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

/* Journalisation HTTP en developpement */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

/* Rate limiter global configurable (plus large en production). */
const globalLimiter = rateLimit({
  windowMs: parsePositiveInteger(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInteger(process.env.RATE_LIMIT_GLOBAL_MAX, process.env.NODE_ENV === 'production' ? 600 : 200),
  message: { error: 'Trop de requetes. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    void logSecurityEventFromRequest(req, {
      eventType: 'request.rate_limited',
      severity: 'warning',
      source: 'global_rate_limiter',
      message: 'Requete bloquee par le rate limiter global.',
    })
    res.status(429).json({ error: 'Trop de requetes. Reessayez dans 15 minutes.' })
  },
})
app.use(globalLimiter)

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
