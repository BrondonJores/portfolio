/* Controleur HTTP article : delegue le metier au service associe. */
const {
  getAllPublicArticles,
  getPublicArticleBySlug,
  getAllAdminArticles,
  createArticle,
  updateArticle,
  deleteArticle,
} = require('../services/articleService')

/**
 * Recupere la liste publique des articles publies avec pagination.
 * La logique de filtrage/pagination est centralisee dans le service.
 * @param {import('express').Request} req Requete HTTP entrante.
 * @param {import('express').Response} res Reponse HTTP sortante.
 * @param {import('express').NextFunction} next Middleware de propagation d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de la reponse.
 */
async function getAllPublic(req, res, next) {
  try {
    const result = await getAllPublicArticles({
      page: req.query.page,
      limit: req.query.limit,
    })
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Recupere un article public par son slug.
 * Retourne 404 si le slug ne correspond a aucun article publie.
 * @param {import('express').Request} req Requete contenant `params.slug`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres serialisation JSON.
 */
async function getBySlug(req, res, next) {
  try {
    const article = await getPublicArticleBySlug(req.params.slug)
    return res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

/**
 * Recupere la liste complete des articles pour l'administration.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue lorsque la reponse est envoyee.
 */
async function getAllAdmin(req, res, next) {
  try {
    const articles = await getAllAdminArticles()
    return res.json({ data: articles })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree un nouvel article de blog a partir du corps de requete.
 * @param {import('express').Request} req Requete contenant les champs article.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const article = await createArticle(req.body)
    return res.status(201).json({ data: article })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour un article existant.
 * @param {import('express').Request} req Requete contenant `params.id` et les champs a modifier.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const article = await updateArticle(req.params.id, req.body)
    return res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un article par identifiant.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteArticle(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getBySlug, getAllAdmin, create, update, remove }
