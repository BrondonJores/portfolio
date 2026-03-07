const { Comment } = require('../models')
const { createHttpError } = require('../utils/httpError')

function createCommentService(deps = {}) {
  const commentModel = deps.commentModel || Comment

  async function getApprovedCommentsByArticle(articleId) {
    return commentModel.findAll({
      where: { article_id: articleId, approved: true },
      order: [['created_at', 'ASC']],
    })
  }

  async function createComment(payload) {
    const { author_name, content, article_id } = payload
    return commentModel.create({ author_name, content, article_id, approved: false })
  }

  async function getAllComments() {
    return commentModel.findAll({ order: [['created_at', 'DESC']] })
  }

  async function approveComment(id) {
    const comment = await commentModel.findByPk(id)
    if (!comment) {
      throw createHttpError(404, 'Commentaire introuvable.')
    }

    await comment.update({ approved: true })
    return comment
  }

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