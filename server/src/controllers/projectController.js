/* Controleur HTTP project : delegue le metier au service associe. */
const {
  getAllPublicProjects,
  getPublicProjectBySlug,
  getAllAdminProjects,
  getAdminProjectById,
  createProject,
  updateProject,
  deleteProject,
  importProjects,
} = require('../services/projectService')

/**
 * Recupere les projets publics avec filtres optionnels et pagination.
 * @param {import('express').Request} req Requete (query: page, limit, tag, featured).
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du resultat.
 */
async function getAllPublic(req, res, next) {
  try {
    const result = await getAllPublicProjects({
      page: req.query.page,
      limit: req.query.limit,
      tag: req.query.tag,
      type: req.query.type,
      stack: req.query.stack,
      technology: req.query.technology,
      domain: req.query.domain,
      label: req.query.label,
      featured: req.query.featured,
    })

    return res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Recupere le detail d'un projet public par slug.
 * @param {import('express').Request} req Requete contenant `params.slug`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres serialisation JSON.
 */
async function getBySlug(req, res, next) {
  try {
    const project = await getPublicProjectBySlug(req.params.slug)
    return res.json({ data: project })
  } catch (err) {
    next(err)
  }
}

/**
 * Liste tous les projets en contexte administration.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des donnees.
 */
async function getAllAdmin(req, res, next) {
  try {
    const projects = await getAllAdminProjects({
      limit: req.query.limit,
      offset: req.query.offset,
    })
    return res.json({ data: projects })
  } catch (err) {
    next(err)
  }
}

/**
 * Recupere un projet admin par identifiant.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres serialisation JSON.
 */
async function getByIdAdmin(req, res, next) {
  try {
    const project = await getAdminProjectById(req.params.id)
    return res.json({ data: project })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree un nouveau projet.
 * @param {import('express').Request} req Requete contenant le payload projet.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const project = await createProject(req.body)
    return res.status(201).json({ data: project })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour un projet existant.
 * @param {import('express').Request} req Requete contenant `params.id` + payload.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const project = await updateProject(req.params.id, req.body)
    return res.json({ data: project })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un projet.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteProject(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

/**
 * Importe un lot de projets JSON.
 * @param {import('express').Request} req Requete avec `body.projects`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres import.
 */
async function importMany(req, res, next) {
  try {
    const result = await importProjects(req.body)
    return res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getBySlug, getAllAdmin, getByIdAdmin, create, update, remove, importMany }
