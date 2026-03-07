const {
  getApprovedCommentsByArticle,
  createComment,
  getAllComments,
  approveComment,
  deleteComment,
} = require('../services/commentService')

async function getByArticleId(req, res, next) {
  try {
    const comments = await getApprovedCommentsByArticle(req.params.articleId)
    return res.json({ data: comments })
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const comment = await createComment(req.body)
    return res.status(201).json({ data: comment })
  } catch (err) {
    next(err)
  }
}

async function getAll(req, res, next) {
  try {
    const comments = await getAllComments()
    return res.json({ data: comments })
  } catch (err) {
    next(err)
  }
}

async function approve(req, res, next) {
  try {
    const comment = await approveComment(req.params.id)
    return res.json({ data: comment })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    await deleteComment(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getByArticleId, create, getAll, approve, remove }