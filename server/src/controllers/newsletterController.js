/* Controleur HTTP newsletter : delegue le metier au service associe. */
const {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
} = require('../services/newsletterService')

/**
 * Liste les campagnes newsletter (admin).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de la liste.
 */
async function getAll(req, res, next) {
  try {
    const campaigns = await getAllCampaigns()
    return res.json({ data: campaigns })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree une campagne newsletter en brouillon.
 * @param {import('express').Request} req Requete contenant le payload campagne.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const campaign = await createCampaign(req.body)
    return res.status(201).json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour une campagne existante.
 * @param {import('express').Request} req Requete contenant `params.id` et les champs a modifier.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const campaign = await updateCampaign(req.params.id, req.body)
    return res.json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime une campagne non envoyee.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteCampaign(req.params.id)
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

/**
 * Envoie une campagne newsletter a tous les abonnes confirmes.
 * Intercepte explicitement les erreurs timeout provider pour renvoyer un 502 lisible.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi ou propagation d'erreur.
 */
async function send(req, res, next) {
  try {
    const result = await sendCampaign(req.params.id)
    return res.json({ data: result.campaign, mailer: result.mailer })
  } catch (err) {
    if (err.statusCode === 502) {
      return res.status(502).json({
        error: err.message,
        details: err.details,
      })
    }

    next(err)
  }
}

module.exports = { getAll, create, update, remove, send }
