/* Service metier comment : regles applicatives et acces donnees. */
const { Comment } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

/**
 * Construit le service commentaire avec dependances injectables.
 * @param {object} [deps={}] Dependances a surcharger (tests).
 * @param {object} [deps.commentModel] Modele commentaire.
 * @returns {object} API metier commentaire.
 */
function createCommentService(deps = {}) {
  const commentModel = deps.commentModel || Comment

  /**
   * Recupere les commentaires approuves d'un article.
   * @param {number|string} articleId Identifiant article.
   * @returns {Promise<Array>} Liste des commentaires visibles.
   */
  async function getApprovedCommentsByArticle(articleId) {
    return commentModel.findAll({
      where: { article_id: articleId, approved: true },
      order: [['created_at', 'ASC']],
    })
  }

  /**
   * Cree un commentaire en statut non approuve.
   * @param {{author_name:string,content:string,article_id:number|string}} payload Donnees commentaire.
   * @returns {Promise<object>} Commentaire cree.
   */
  async function createComment(payload) {
    const { author_name, content, article_id } = payload
    return commentModel.create({ author_name, content, article_id, approved: false })
  }

  /**
   * Recupere tous les commentaires pour moderation.
   * @returns {Promise<Array>} Liste complete triee du plus recent au plus ancien.
   */
  async function getAllComments(params = {}) {
    const { limit, offset } = resolveLimitOffsetPagination(params, {
      defaultLimit: 25,
      maxLimit: 200,
    })

    const result = await commentModel.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    return buildPaginatedPayload({
      items: result.rows,
      total: result.count,
      limit,
      offset,
    })
  }

  /**
   * Approuve un commentaire.
   * @param {number|string} id Identifiant commentaire.
   * @returns {Promise<object>} Commentaire approuve.
   * @throws {Error} Erreur 404 si commentaire inexistant.
   */
  async function approveComment(id) {
    const comment = await commentModel.findByPk(id)
    if (!comment) {
      throw createHttpError(404, 'Commentaire introuvable.')
    }

    await comment.update({ approved: true })
    return comment
  }

  /**
   * Supprime un commentaire.
   * @param {number|string} id Identifiant commentaire.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si commentaire inexistant.
   */
  async function deleteComment(id) {
    const comment = await commentModel.findByPk(id)
    if (!comment) {
      throw createHttpError(404, 'Commentaire introuvable.')
    }

    await comment.destroy()
  }

  return {
    getApprovedCommentsByArticle,
    createComment,
    getAllComments,
    approveComment,
    deleteComment,
  }
}

module.exports = {
  createCommentService,
  ...createCommentService(),
}
