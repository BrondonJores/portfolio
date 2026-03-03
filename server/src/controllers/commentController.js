/* Controleur des commentaires */
const { Comment } = require('../models')

/* Recuperation publique des commentaires approuves pour un article */
async function getByArticleId(req, res, next) {
  try {
    const comments = await Comment.findAll({
      where: { article_id: req.params.articleId, approved: true },
      order: [['created_at', 'ASC']],
    })
    return res.json({ data: comments })
  } catch (err) {
    next(err)
  }
}

/* Creation d'un commentaire (en attente de moderation) */
async function create(req, res, next) {
  try {
    const { author_name, content, article_id } = req.body
    const comment = await Comment.create({ author_name, content, article_id, approved: false })
    return res.status(201).json({ data: comment })
  } catch (err) {
    next(err)
  }
}

/* Recuperation admin de tous les commentaires */
async function getAll(req, res, next) {
  try {
    const comments = await Comment.findAll({ order: [['created_at', 'DESC']] })
    return res.json({ data: comments })
  } catch (err) {
    next(err)
  }
}

/* Approbation d'un commentaire */
async function approve(req, res, next) {
  try {
    const comment = await Comment.findByPk(req.params.id)
    if (!comment) return res.status(404).json({ error: 'Commentaire introuvable.' })
    await comment.update({ approved: true })
    return res.json({ data: comment })
  } catch (err) {
    next(err)
  }
}

/* Suppression d'un commentaire */
async function remove(req, res, next) {
  try {
    const comment = await Comment.findByPk(req.params.id)
    if (!comment) return res.status(404).json({ error: 'Commentaire introuvable.' })
    await comment.destroy()
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getByArticleId, create, getAll, approve, remove }
