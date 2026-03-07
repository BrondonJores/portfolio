/* Controleur HTTP des templates de blocs administrables. */
const {
  getAllBlockTemplates,
  createBlockTemplate,
  updateBlockTemplate,
  deleteBlockTemplate,
} = require('../services/blockTemplateService')

/**
 * Recupere les templates de blocs (avec filtre de contexte optionnel).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAll(req, res, next) {
  try {
    const templates = await getAllBlockTemplates({
      context: req.query.context,
    })
    return res.json({ data: templates })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree un template de blocs.
 * @param {import('express').Request} req Requete avec le payload template.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const template = await createBlockTemplate(req.body)
    return res.status(201).json({ data: template })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour un template de blocs existant.
 * @param {import('express').Request} req Requete avec `params.id` et payload.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const template = await updateBlockTemplate(req.params.id, req.body)
    return res.json({ data: template })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un template par identifiant.
 * @param {import('express').Request} req Requete avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteBlockTemplate(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, create, update, remove }
