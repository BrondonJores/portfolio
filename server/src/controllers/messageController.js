/* Controleur HTTP message : delegue le metier au service associe. */
const {
  createContactMessage,
  getAllMessages,
  markMessageAsRead,
} = require('../services/messageService')

/**
 * Cree un message de contact depuis la page publique.
 * @param {import('express').Request} req Requete contenant nom, email et message.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    await createContactMessage(req.body)
    return res.status(201).json({ message: 'Message envoye avec succes.' })
  } catch (err) {
    next(err)
  }
}

/**
 * Liste tous les messages de contact pour l'administration.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse JSON.
 */
async function getAll(req, res, next) {
  try {
    const messages = await getAllMessages()
    return res.json({ data: messages })
  } catch (err) {
    next(err)
  }
}

/**
 * Marque un message comme lu.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function markAsRead(req, res, next) {
  try {
    const message = await markMessageAsRead(req.params.id)
    return res.json({ data: message })
  } catch (err) {
    next(err)
  }
}

module.exports = { create, getAll, markAsRead }
