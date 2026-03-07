/* Controleur HTTP skill : delegue le metier au service associe. */
const {
  getAllSkillsGrouped,
  createSkill,
  updateSkill,
  deleteSkill,
} = require('../services/skillService')

/**
 * Retourne les competences groupees par categorie.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des groupes.
 */
async function getAll(req, res, next) {
  try {
    const skills = await getAllSkillsGrouped()
    return res.json({ data: skills })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree une competence.
 * @param {import('express').Request} req Requete contenant le payload skill.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const skill = await createSkill(req.body)
    return res.status(201).json({ data: skill })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour une competence existante.
 * @param {import('express').Request} req Requete contenant `params.id` + payload.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const skill = await updateSkill(req.params.id, req.body)
    return res.json({ data: skill })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime une competence.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteSkill(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, create, update, remove }
