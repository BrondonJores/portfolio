/* Controleur HTTP securite : expose les journaux d'intrusion pour l'admin. */
const { getSecurityEvents, getSecuritySummary } = require('../services/securityEventService')

/**
 * Retourne la liste paginee des evenements securite.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse JSON.
 */
async function listSecurityEvents(req, res, next) {
  try {
    const data = await getSecurityEvents({
      limit: req.query.limit,
      offset: req.query.offset,
      eventType: req.query.event_type || req.query.eventType,
      severity: req.query.severity,
      windowHours: req.query.window_hours || req.query.windowHours,
    })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Retourne un resume securite (fenetre glissante).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse JSON.
 */
async function securitySummary(req, res, next) {
  try {
    const data = await getSecuritySummary({
      windowHours: req.query.window_hours || req.query.windowHours,
    })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listSecurityEvents,
  securitySummary,
}
