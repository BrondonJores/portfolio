/* Controleur HTTP setting : delegue le metier au service associe. */
const { getSettingsMap, getPublicSettingsMap, upsertSettings } = require('../services/settingService')

/**
 * Recupere les parametres globaux sous forme de map { key: value }.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des settings.
 */
async function getAll(req, res, next) {
  try {
    const settings = await getSettingsMap()
    return res.json({ data: settings })
  } catch (err) {
    next(err)
  }
}

/**
 * Recupere uniquement les parametres publics (frontend visiteur).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des settings publics.
 */
async function getPublic(req, res, next) {
  try {
    const settings = await getPublicSettingsMap()
    return res.json({ data: settings })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour/insere un lot de parametres.
 * @param {import('express').Request} req Requete contenant l'objet de settings.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres operation d'upsert.
 */
async function upsert(req, res, next) {
  try {
    await upsertSettings(req.body)
    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getPublic, upsert }
