/* Controleur HTTP testimonial : delegue le metier au service associe. */
const {
  getVisibleTestimonials,
  getAllTestimonialsAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../services/testimonialService')

/**
 * Recupere les temoignages visibles cote public.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des temoignages.
 */
async function getAllPublic(req, res, next) {
  try {
    const testimonials = await getVisibleTestimonials()
    return res.json({ data: testimonials })
  } catch (err) {
    next(err)
  }
}

/**
 * Recupere tous les temoignages cote administration.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de la liste.
 */
async function getAllAdmin(req, res, next) {
  try {
    const testimonials = await getAllTestimonialsAdmin()
    return res.json({ data: testimonials })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree un temoignage.
 * @param {import('express').Request} req Requete contenant le payload temoignage.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const testimonial = await createTestimonial(req.body)
    return res.status(201).json({ data: testimonial })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour un temoignage.
 * @param {import('express').Request} req Requete contenant `params.id` + payload.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const testimonial = await updateTestimonial(req.params.id, req.body)
    return res.json({ data: testimonial })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un temoignage.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteTestimonial(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getAllAdmin, create, update, remove }
