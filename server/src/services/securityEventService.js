/* Service metier securite : journalisation et lecture des evenements d'intrusion. */
const sequelizeLib = require('sequelize')
const { SecurityEvent } = require('../models')

const ALLOWED_SEVERITIES = new Set(['info', 'warning', 'critical'])
const AUTH_FAILURE_EVENT_TYPES = Object.freeze(['auth.login_failed', 'auth.2fa_failed', 'auth.invalid_token'])
const RATE_LIMIT_EVENT_TYPES = Object.freeze([
  'request.rate_limited',
  'request.rate_limited.public',
  'request.rate_limited.admin',
  'request.rate_limited.auth',
])
const MAX_WINDOW_HOURS = 24 * 30
const REDACTED_VALUE = '[REDACTED]'
const SENSITIVE_QUERY_KEYS = Object.freeze([
  'token',
  'mfa_token',
  'setup_token',
  'captcha_token',
  'recovery_code',
  'access_token',
  'refresh_token',
  'password',
])
const SENSITIVE_QUERY_PATTERN = new RegExp(
  `([?&](?:${SENSITIVE_QUERY_KEYS.join('|')})=)[^&#]*`,
  'gi'
)

/**
 * Tronque une chaine a une longueur maximale.
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Longueur max.
 * @returns {string} Valeur normalisee.
 */
function toTrimmedString(value, maxLength) {
  return String(value || '')
    .trim()
    .slice(0, maxLength)
}

/**
 * Normalise une severite (`info`, `warning`, `critical`).
 * @param {unknown} value Valeur brute.
 * @returns {'info'|'warning'|'critical'} Severite normalisee.
 */
function normalizeSeverity(value) {
  const normalized = toTrimmedString(value, 16).toLowerCase()
  if (ALLOWED_SEVERITIES.has(normalized)) {
    return normalized
  }
  return 'info'
}

/**
 * Parse un entier strictement positif.
 * @param {unknown} value Valeur brute.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier normalise.
 */
function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Normalise une fenetre horaire en bornant la valeur maximale.
 * @param {unknown} value Valeur brute.
 * @param {number|null} fallback Valeur de repli.
 * @returns {number|null} Fenetre horaire valide ou fallback.
 */
function resolveWindowHours(value, fallback) {
  const parsed = parsePositiveInteger(value, fallback)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.min(parsed, MAX_WINDOW_HOURS)
}

/**
 * Retourne la date de debut de fenetre glissante.
 * @param {Function} now Fabrique de date courante.
 * @param {number} windowHours Taille de fenetre en heures.
 * @returns {Date} Date de debut.
 */
function computeSinceDate(now, windowHours) {
  return new Date(now().getTime() - windowHours * 60 * 60 * 1000)
}

/**
 * Extrait la meilleure IP disponible depuis une requete HTTP.
 * @param {import('express').Request} req Requete HTTP.
 * @returns {string} Adresse IP normalisee.
 */
function extractClientIp(req) {
  const forwarded = req.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) {
      return first
    }
  }

  return toTrimmedString(req.ip, 64)
}

/**
 * Supprime les valeurs sensibles d'un chemin/requete URL.
 * @param {unknown} value Chemin ou URL brute.
 * @returns {string} Valeur redigee.
 */
function redactSensitiveRequestPath(value) {
  let normalized = String(value || '').trim()
  if (!normalized) {
    return ''
  }

  normalized = normalized.replace(/\/unsubscribe\/[^/?#]+/gi, `/unsubscribe/${REDACTED_VALUE}`)
  normalized = normalized.replace(SENSITIVE_QUERY_PATTERN, `$1${REDACTED_VALUE}`)
  return normalized
}

/**
 * Construit le service securite avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.securityEventModel] Modele SecurityEvent.
 * @param {object} [deps.sequelizeFns] Helpers Sequelize.
 * @param {NodeJS.ProcessEnv|object} [deps.env] Variables d'environnement.
 * @param {Function} [deps.now] Fabrique date courante.
 * @returns {object} API metier securite.
 */
function createSecurityEventService(deps = {}) {
  const securityEventModel = deps.securityEventModel || SecurityEvent
  const sequelizeFns = deps.sequelizeFns || sequelizeLib
  const env = deps.env || process.env
  const now = deps.now || (() => new Date())
  const { Op, fn, col, literal } = sequelizeFns
  const gteOperator = Op?.gte || 'gte'
  const inOperator = Op?.in || 'in'
  const notEqualOperator = Op?.ne || 'ne'

  /**
   * Construit la liste des alertes actives selon des seuils configurables.
   * @param {object} summary Resume securite.
   * @returns {Array<object>} Liste d'alertes normalisees.
   */
  function buildSecurityAlerts(summary) {
    const criticalEventsThreshold = parsePositiveInteger(env.SECURITY_ALERT_CRITICAL_EVENTS_MIN, 3)
    const authFailuresThreshold = parsePositiveInteger(env.SECURITY_ALERT_AUTH_FAILURES_MIN, 10)
    const blockedOriginsThreshold = parsePositiveInteger(env.SECURITY_ALERT_BLOCKED_ORIGINS_MIN, 5)
    const rateLimitHitsThreshold = parsePositiveInteger(env.SECURITY_ALERT_RATE_LIMIT_HITS_MIN, 30)
    const alerts = []

    if (summary.criticalEvents >= criticalEventsThreshold) {
      alerts.push({
        id: 'critical_events_spike',
        severity: 'critical',
        metric: 'criticalEvents',
        value: summary.criticalEvents,
        threshold: criticalEventsThreshold,
        message: `Pic d'evenements critiques detecte (${summary.criticalEvents}).`,
      })
    }

    if (summary.authFailures >= authFailuresThreshold) {
      alerts.push({
        id: 'auth_failures_spike',
        severity: 'warning',
        metric: 'authFailures',
        value: summary.authFailures,
        threshold: authFailuresThreshold,
        message: `Tentatives d'authentification suspectes en hausse (${summary.authFailures}).`,
      })
    }

    if (summary.blockedOrigins >= blockedOriginsThreshold) {
      alerts.push({
        id: 'blocked_origins_spike',
        severity: 'warning',
        metric: 'blockedOrigins',
        value: summary.blockedOrigins,
        threshold: blockedOriginsThreshold,
        message: `Nombre eleve d'origines bloquees (${summary.blockedOrigins}).`,
      })
    }

    if (summary.rateLimitHits >= rateLimitHitsThreshold) {
      alerts.push({
        id: 'rate_limit_hits_spike',
        severity: 'info',
        metric: 'rateLimitHits',
        value: summary.rateLimitHits,
        threshold: rateLimitHitsThreshold,
        message: `Volume de rate-limit inhabituel (${summary.rateLimitHits}).`,
      })
    }

    return alerts
  }

  /**
   * Journalise un evenement de securite (operation safe: ne jette jamais).
   * @param {object} payload Donnees de l'evenement.
   * @returns {Promise<object|null>} Evenement cree ou `null` en echec.
   */
  async function logSecurityEvent(payload) {
    try {
      const metadataValue =
        payload?.metadata && typeof payload.metadata === 'object'
          ? payload.metadata
          : null

      const event = await securityEventModel.create({
        event_type: toTrimmedString(payload?.eventType, 120) || 'security.unknown',
        severity: normalizeSeverity(payload?.severity),
        source: toTrimmedString(payload?.source, 60) || 'server',
        message: toTrimmedString(payload?.message, 2000) || 'Evenement de securite.',
        ip_address: toTrimmedString(payload?.ipAddress, 64) || null,
        user_agent: toTrimmedString(payload?.userAgent, 1500) || null,
        request_path: toTrimmedString(redactSensitiveRequestPath(payload?.requestPath), 255) || null,
        http_method: toTrimmedString(payload?.httpMethod, 16) || null,
        origin: toTrimmedString(payload?.origin, 255) || null,
        email: toTrimmedString(payload?.email, 160) || null,
        admin_id: Number.isInteger(Number(payload?.adminId)) ? Number(payload.adminId) : null,
        metadata: metadataValue,
      })

      return event
    } catch {
      return null
    }
  }

  /**
   * Journalise un evenement de securite a partir d'une requete HTTP.
   * @param {import('express').Request} req Requete HTTP source.
   * @param {object} payload Donnees metier supplementaires.
   * @returns {Promise<object|null>} Evenement cree ou `null`.
   */
  async function logSecurityEventFromRequest(req, payload = {}) {
    return logSecurityEvent({
      ...payload,
      ipAddress: payload.ipAddress || extractClientIp(req),
      userAgent: payload.userAgent || req.get('user-agent'),
      requestPath: payload.requestPath || req.originalUrl || req.path,
      httpMethod: payload.httpMethod || req.method,
      origin: payload.origin || req.get('origin'),
      adminId: payload.adminId || req.user?.id,
    })
  }

  /**
   * Retourne la liste paginee des evenements de securite.
   * @param {object} [options={}] Options de filtrage.
   * @param {number|string} [options.limit=100] Taille max de page.
   * @param {number|string} [options.offset=0] Offset de pagination.
   * @param {string} [options.eventType] Filtre exact event_type.
   * @param {string} [options.severity] Filtre severite.
   * @returns {Promise<{items:Array,total:number,limit:number,offset:number}>} Page d'evenements.
   */
  async function getSecurityEvents(options = {}) {
    const limit = Math.min(parsePositiveInteger(options.limit, 100), 500)
    const offset = Math.max(Number(options.offset) || 0, 0)
    const where = {}

    const eventType = toTrimmedString(options.eventType, 120)
    if (eventType) {
      where.event_type = eventType
    }

    const rawSeverity = toTrimmedString(options.severity, 16).toLowerCase()
    if (rawSeverity && ALLOWED_SEVERITIES.has(rawSeverity)) {
      where.severity = rawSeverity
    }

    const windowHours = resolveWindowHours(options.windowHours, null)
    if (windowHours) {
      where.created_at = { [gteOperator]: computeSinceDate(now, windowHours) }
    }

    const result = await securityEventModel.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    return {
      items: result.rows || [],
      total: Number(result.count || 0),
      limit,
      offset,
    }
  }

  /**
   * Retourne un resume securite (24h par defaut) pour le dashboard admin.
   * @param {object} [options={}] Options de synthese.
   * @param {number|string} [options.windowHours=24] Fenetre glissante en heures.
   * @returns {Promise<object>} KPIs securite + top IPs.
   */
  async function getSecuritySummary(options = {}) {
    const windowHours = resolveWindowHours(options.windowHours, 24)
    const since = computeSinceDate(now, windowHours)
    const whereSince = { created_at: { [gteOperator]: since } }

    const [
      total,
      critical,
      warning,
      authFailures,
      blockedOrigins,
      rateLimitHits,
      rateLimitPublicHits,
      rateLimitAdminHits,
      rateLimitAuthHits,
      rateLimitLegacyHits,
      uniqueIpCount,
      topIpsRaw,
      topEventTypesRaw,
      recentEvents,
    ] =
      await Promise.all([
        securityEventModel.count({ where: whereSince }),
        securityEventModel.count({ where: { ...whereSince, severity: 'critical' } }),
        securityEventModel.count({ where: { ...whereSince, severity: 'warning' } }),
        securityEventModel.count({
          where: {
            ...whereSince,
            event_type: { [inOperator]: AUTH_FAILURE_EVENT_TYPES },
          },
        }),
        securityEventModel.count({
          where: {
            ...whereSince,
            event_type: 'request.untrusted_origin',
          },
        }),
        securityEventModel.count({
          where: {
            ...whereSince,
            event_type: { [inOperator]: RATE_LIMIT_EVENT_TYPES },
          },
        }),
        securityEventModel.count({
          where: {
            ...whereSince,
            event_type: { [inOperator]: ['request.rate_limited.public'] },
          },
        }),
        securityEventModel.count({
          where: {
            ...whereSince,
            event_type: { [inOperator]: ['request.rate_limited.admin'] },
          },
        }),
        securityEventModel.count({
          where: {
            ...whereSince,
            event_type: { [inOperator]: ['request.rate_limited.auth'] },
          },
        }),
        securityEventModel.count({
          where: {
            ...whereSince,
            event_type: { [inOperator]: ['request.rate_limited'] },
          },
        }),
        securityEventModel.count({
          distinct: true,
          col: 'ip_address',
          where: {
            ...whereSince,
            ip_address: { [notEqualOperator]: null },
          },
        }),
        securityEventModel.findAll({
          attributes: ['ip_address', [fn('COUNT', col('id')), 'count']],
          where: {
            ...whereSince,
            ip_address: { [notEqualOperator]: null },
          },
          group: ['ip_address'],
          order: [[literal('count'), 'DESC']],
          limit: 5,
          raw: true,
        }),
        securityEventModel.findAll({
          attributes: ['event_type', [fn('COUNT', col('id')), 'count']],
          where: whereSince,
          group: ['event_type'],
          order: [[literal('count'), 'DESC']],
          limit: 6,
          raw: true,
        }),
        securityEventModel.findAll({
          where: whereSince,
          order: [['created_at', 'DESC']],
          limit: 8,
        }),
      ])

    const summary = {
      windowHours,
      totalEvents: Number(total || 0),
      criticalEvents: Number(critical || 0),
      warningEvents: Number(warning || 0),
      authFailures: Number(authFailures || 0),
      blockedOrigins: Number(blockedOrigins || 0),
      rateLimitHits: Number(rateLimitHits || 0),
      rateLimitPublicHits: Number(rateLimitPublicHits || 0),
      rateLimitAdminHits: Number(rateLimitAdminHits || 0),
      rateLimitAuthHits: Number(rateLimitAuthHits || 0),
      rateLimitLegacyHits: Number(rateLimitLegacyHits || 0),
      uniqueIpCount: Number(uniqueIpCount || 0),
      topIps: (topIpsRaw || []).map((entry) => ({
        ip: entry.ip_address,
        count: Number(entry.count || 0),
      })),
      topEventTypes: (topEventTypesRaw || []).map((entry) => ({
        eventType: toTrimmedString(entry.event_type, 120),
        count: Number(entry.count || 0),
      })),
      recentEvents: recentEvents || [],
    }

    const alerts = buildSecurityAlerts(summary)
    return {
      ...summary,
      alerts,
      hasActiveAlerts: alerts.length > 0,
    }
  }

  return {
    logSecurityEvent,
    logSecurityEventFromRequest,
    getSecurityEvents,
    getSecuritySummary,
  }
}

module.exports = {
  createSecurityEventService,
  ...createSecurityEventService(),
}
