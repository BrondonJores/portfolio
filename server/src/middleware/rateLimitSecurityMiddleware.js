const { logSecurityEventFromRequest: logSecurityEventFromRequestLib } = require('../services/securityEventService')

/**
 * Construit un builder de handler express-rate-limit avec journalisation securite.
 * @param {object} [deps={}] Dependances injectables.
 * @param {Function} [deps.logSecurityEventFromRequest] Logger securite.
 * @returns {Function} Builder de handler rate-limit.
 */
function createRateLimitSecurityHandler(deps = {}) {
  const logSecurityEventFromRequest = deps.logSecurityEventFromRequest || logSecurityEventFromRequestLib

  return function buildRateLimitSecurityHandler(options = {}) {
    const statusCode = Number.isInteger(options.statusCode) ? options.statusCode : 429
    const responseBody =
      options.responseBody && typeof options.responseBody === 'object'
        ? options.responseBody
        : { error: 'Trop de requetes. Reessayez plus tard.' }
    const resolveLogPayload =
      typeof options.logPayload === 'function' ? options.logPayload : () => options.logPayload

    return function rateLimitSecurityHandler(req, res) {
      const logPayload = resolveLogPayload(req, res)

      if (logPayload) {
        Promise.resolve(logSecurityEventFromRequest(req, logPayload)).catch(() => null)
      }

      return res.status(statusCode).json(responseBody)
    }
  }
}

module.exports = {
  createRateLimitSecurityHandler,
  buildRateLimitSecurityHandler: createRateLimitSecurityHandler(),
}
