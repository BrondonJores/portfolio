/* Validateurs des routes securite admin (logs + resume intrusion). */
const { query } = require('express-validator')

const SECURITY_SEVERITIES = ['info', 'warning', 'critical']
const MAX_WINDOW_HOURS = 24 * 30

/**
 * Validation de la liste des evenements securite.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const listSecurityEventsValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('limit doit etre un entier entre 1 et 500.'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset doit etre un entier superieur ou egal a 0.'),
  query('severity')
    .optional()
    .isIn(SECURITY_SEVERITIES)
    .withMessage('severity doit etre info, warning ou critical.'),
  query('event_type')
    .optional()
    .isString()
    .withMessage('event_type doit etre une chaine.')
    .isLength({ max: 120 })
    .withMessage('event_type ne peut pas depasser 120 caracteres.'),
  query('eventType')
    .optional()
    .isString()
    .withMessage('eventType doit etre une chaine.')
    .isLength({ max: 120 })
    .withMessage('eventType ne peut pas depasser 120 caracteres.'),
  query('window_hours')
    .optional()
    .isInt({ min: 1, max: MAX_WINDOW_HOURS })
    .withMessage(`window_hours doit etre un entier entre 1 et ${MAX_WINDOW_HOURS}.`),
  query('windowHours')
    .optional()
    .isInt({ min: 1, max: MAX_WINDOW_HOURS })
    .withMessage(`windowHours doit etre un entier entre 1 et ${MAX_WINDOW_HOURS}.`),
]

/**
 * Validation du resume securite.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const securitySummaryValidator = [
  query('window_hours')
    .optional()
    .isInt({ min: 1, max: MAX_WINDOW_HOURS })
    .withMessage(`window_hours doit etre un entier entre 1 et ${MAX_WINDOW_HOURS}.`),
  query('windowHours')
    .optional()
    .isInt({ min: 1, max: MAX_WINDOW_HOURS })
    .withMessage(`windowHours doit etre un entier entre 1 et ${MAX_WINDOW_HOURS}.`),
]

module.exports = {
  listSecurityEventsValidator,
  securitySummaryValidator,
}
