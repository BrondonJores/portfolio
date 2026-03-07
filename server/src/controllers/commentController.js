/* Controleur HTTP comment : delegue le metier au service associe. */
const {
  getApprovedCommentsByArticle,
  createComment,
  getAllComments,
  approveComment,
  deleteComment,
} = require('../services/commentService')

/**
 * Recupere les commentaires approuves associes a un article public.
 * @param {import('express').Request} req Requete contenant `params.articleId`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des commentaires.
 */
async function getByArticleId(req, res, next) {
  try {
    const comments = await getApprovedCommentsByArticle(req.params.articleId)
    return res.json({ data: comments })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree un nouveau commentaire en attente de moderation.
 * @param {import('express').Request} req Requete contenant les donnees du commentaire.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const comment = await createComment(req.body)
    return res.status(201).json({ data: comment })
  } catch (err) {
    next(err)
  }
}

/**
 * Recupere l'ensemble des commentaires pour le back-office.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres serialisation JSON.
 */
async function getAll(req, res, next) {
  try {
    const comments = await getAllComments()
    return res.json({ data: comments })
  } catch (err) {
    next(err)
  }
}

/**
 * Approuve un commentaire pour publication.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function approve(req, res, next) {
  try {
    const comment = await approveComment(req.params.id)
    return res.json({ data: comment })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un commentaire par identifiant.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteComment(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getByArticleId, create, getAll, approve, remove }
