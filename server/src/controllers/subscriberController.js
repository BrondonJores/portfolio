/* Controleur HTTP subscriber : delegue le metier au service associe. */
const {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getAllSubscribers,
  deleteSubscriber,
} = require('../services/subscriberService')

/**
 * Abonne un email a la newsletter.
 * Retourne 201 a la creation, 200 si deja inscrit (comportement volontaire).
 * @param {import('express').Request} req Requete contenant `body.email`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse.
 */
async function subscribe(req, res, next) {
  try {
    const result = await subscribeToNewsletter(req.body.email)
    const status = result.alreadySubscribed ? 200 : 201
    return res.status(status).json({ data: { message: result.message } })
  } catch (err) {
    next(err)
  }
}

/**
 * Desabonne un utilisateur via son token de desinscription.
 * @param {import('express').Request} req Requete contenant `params.token`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de la page HTML.
 */
async function unsubscribe(req, res, next) {
  try {
    await unsubscribeFromNewsletter(req.params.token)
    return res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Desabonnement</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Vous avez ete desabonne(e).</h1><p>Vous ne recevrez plus nos newsletters.</p></body></html>')
  } catch (err) {
    next(err)
  }
}

/**
 * Liste tous les abonnes newsletter (admin).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de la liste.
 */
async function getAll(req, res, next) {
  try {
    const subscribers = await getAllSubscribers()
    return res.json({ data: subscribers })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un abonne par identifiant.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteSubscriber(req.params.id)
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

module.exports = { subscribe, unsubscribe, getAll, remove }
