/* Service metier securite : journalisation et lecture des evenements d'intrusion. */
const sequelizeLib = require('sequelize')
const { SecurityEvent } = require('../models')

const ALLOWED_SEVERITIES = new Set(['info', 'warning', 'critical'])

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
 * Construit le service securite avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.securityEventModel] Modele SecurityEvent.
 * @param {object} [deps.sequelizeFns] Helpers Sequelize.
 * @param {Function} [deps.now] Fabrique date courante.
 * @returns {object} API metier securite.
 */
function createSecurityEventService(deps = {}) {
  const securityEventModel = deps.securityEventModel || SecurityEvent
  const sequelizeFns = deps.sequelizeFns || sequelizeLib
  const now = deps.now || (() => new Date())
  const { Op, fn, col, literal } = sequelizeFns

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
        request_path: toTrimmedString(payload?.requestPath, 255) || null,
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

    const severity = normalizeSeverity(options.severity)
    if (toTrimmedString(options.severity, 16)) {
      where.severity = severity
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
    const windowHours = Math.min(parsePositiveInteger(options.windowHours, 24), 24 * 30)
    const since = new Date(now().getTime() - windowHours * 60 * 60 * 1000)

    const [total, critical, warning, authFailures, blockedOrigins, rateLimitHits, topIpsRaw, recentEvents] =
      await Promise.all([
        securityEventModel.count({ where: { created_at: { [Op.gte]: since } } }),
        securityEventModel.count({ where: { created_at: { [Op.gte]: since }, severity: 'critical' } }),
        securityEventModel.count({ where: { created_at: { [Op.gte]: since }, severity: 'warning' } }),
        securityEventModel.count({
          where: {
            created_at: { [Op.gte]: since },
            event_type: { [Op.in]: ['auth.login_failed', 'auth.2fa_failed', 'auth.invalid_token'] },
          },
        }),
        securityEventModel.count({
          where: {
            created_at: { [Op.gte]: since },
            event_type: 'request.untrusted_origin',
          },
        }),
        securityEventModel.count({
          where: {
            created_at: { [Op.gte]: since },
            event_type: 'request.rate_limited',
          },
        }),
        securityEventModel.findAll({
          attributes: ['ip_address', [fn('COUNT', col('id')), 'count']],
          where: {
            created_at: { [Op.gte]: since },
            ip_address: { [Op.ne]: null },
          },
          group: ['ip_address'],
          order: [[literal('count'), 'DESC']],
          limit: 5,
          raw: true,
        }),
        securityEventModel.findAll({
          where: { created_at: { [Op.gte]: since } },
          order: [['created_at', 'DESC']],
          limit: 8,
        }),
      ])

    return {
      windowHours,
      totalEvents: Number(total || 0),
      criticalEvents: Number(critical || 0),
      warningEvents: Number(warning || 0),
      authFailures: Number(authFailures || 0),
      blockedOrigins: Number(blockedOrigins || 0),
      rateLimitHits: Number(rateLimitHits || 0),
      topIps: (topIpsRaw || []).map((entry) => ({
        ip: entry.ip_address,
        count: Number(entry.count || 0),
      })),
      recentEvents: recentEvents || [],
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
