/* Configuration partagee des rate-limiters (memoire par defaut, Redis optionnel). */

const { RedisStore } = require('rate-limit-redis')
const { createClient } = require('redis')

let initialized = false
let redisClient = null
let redisEnabled = false
let basePrefix = 'rate-limit:'
let passOnStoreError = true
const storesByNamespace = new Map()

/**
 * Parse une variable booleenne type env (`true`, `1`, `yes`, `on`).
 * @param {unknown} value Valeur brute.
 * @param {boolean} fallback Valeur de repli.
 * @returns {boolean} Booleen normalise.
 */
function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

/**
 * Nettoie un namespace de limiter pour la cle Redis.
 * @param {unknown} namespace Valeur brute.
 * @returns {string} Namespace normalise.
 */
function normalizeNamespace(namespace) {
  const safe = String(namespace || 'global')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
  return safe || 'global'
}

/**
 * Initialise le client Redis si une URL est configuree.
 * L'absence d'URL conserve le comportement memoire d'express-rate-limit.
 * @param {NodeJS.ProcessEnv|object} env Variables d'environnement.
 * @param {Console} logger Logger.
 * @returns {void}
 */
function initializeRedisIfNeeded(env, logger) {
  if (initialized) {
    return
  }

  initialized = true
  basePrefix = String(env.RATE_LIMIT_REDIS_PREFIX || 'rate-limit:').trim() || 'rate-limit:'
  passOnStoreError = parseBooleanEnv(env.RATE_LIMIT_PASS_ON_STORE_ERROR, true)

  const redisUrl = String(env.RATE_LIMIT_REDIS_URL || env.REDIS_URL || '').trim()
  if (!redisUrl) {
    redisEnabled = false
    return
  }

  try {
    redisClient = createClient({ url: redisUrl })
    redisClient.on('error', (err) => {
      logger.error('[rate-limit] Redis error:', err?.message || err)
    })

    // Connexion non bloquante: en cas d'echec, le limiter reste en mode pass-on-store-error.
    void redisClient.connect().catch((err) => {
      logger.error('[rate-limit] Redis connect error:', err?.message || err)
    })

    redisEnabled = true
    logger.log('[rate-limit] Redis store active.')
  } catch (err) {
    redisEnabled = false
    logger.error('[rate-limit] Redis disabled, fallback memory store:', err?.message || err)
  }
}

/**
 * Retourne (et met en cache) un store Redis par namespace.
 * @param {string} namespace Namespace du limiter.
 * @returns {object|null} Store Redis ou null.
 */
function getRedisStore(namespace) {
  if (!redisEnabled || !redisClient) {
    return null
  }

  const safeNamespace = normalizeNamespace(namespace)
  const cached = storesByNamespace.get(safeNamespace)
  if (cached) {
    return cached
  }

  const store = new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: `${basePrefix}${safeNamespace}:`,
  })
  storesByNamespace.set(safeNamespace, store)
  return store
}

/**
 * Construit les options communes rate-limit pour un namespace.
 * @param {string} namespace Namespace logique (`auth_login`, `public_comments`, ...).
 * @param {object} [deps={}] Dependances injectables.
 * @param {NodeJS.ProcessEnv|object} [deps.env] Environnement cible.
 * @param {Console} [deps.logger] Logger cible.
 * @returns {object} Options communes pour express-rate-limit.
 */
function getRateLimitCommonOptions(namespace, deps = {}) {
  const env = deps.env || process.env
  const logger = deps.logger || console

  initializeRedisIfNeeded(env, logger)
  const store = getRedisStore(namespace)

  return {
    standardHeaders: true,
    legacyHeaders: false,
    ...(store ? { store, passOnStoreError } : {}),
  }
}

module.exports = {
  getRateLimitCommonOptions,
}
