/* Controleur HTTP stats : delegue le metier au service associe. */
const { getDashboardStats } = require('../services/statsService')

/**
 * Retourne les statistiques enrichies du dashboard admin.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du snapshot stats.
 */
async function getStats(req, res, next) {
  try {
    const data = await getDashboardStats({
      periodDays: req.query.period_days || req.query.periodDays,
    })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

module.exports = { getStats }
