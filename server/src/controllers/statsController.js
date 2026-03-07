/* Controleur HTTP stats : delegue le metier au service associe. */
const { getDashboardStats } = require('../services/statsService')

/**
 * Retourne les statistiques du dashboard admin (serie mensuelle).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des statistiques.
 */
async function getStats(req, res, next) {
  try {
    const data = await getDashboardStats()
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

module.exports = { getStats }
