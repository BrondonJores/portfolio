/* Controleur HTTP certification : delegue le metier au service associe. */
const {
  getAllPublicCertifications,
  getAllAdminCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
} = require('../services/certificationService')

/**
 * Retourne la liste publique des certifications.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAllPublic(req, res, next) {
  try {
    const certifications = await getAllPublicCertifications()
    return res.json({ data: certifications })
  } catch (err) {
    next(err)
  }
}

/**
 * Retourne la liste admin des certifications avec pagination.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAllAdmin(req, res, next) {
  try {
    const certifications = await getAllAdminCertifications({
      limit: req.query.limit,
      offset: req.query.offset,
    })
    return res.json({ data: certifications })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree une certification.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const certification = await createCertification(req.body)
    return res.status(201).json({ data: certification })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour une certification existante.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const certification = await updateCertification(req.params.id, req.body)
    return res.json({ data: certification })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime une certification.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteCertification(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAllPublic,
  getAllAdmin,
  create,
  update,
  remove,
}
