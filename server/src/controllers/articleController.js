const {
  getAllPublicArticles,
  getPublicArticleBySlug,
  getAllAdminArticles,
  createArticle,
  updateArticle,
  deleteArticle,
} = require('../services/articleService')

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

async function getBySlug(req, res, next) {
  try {
    const article = await getPublicArticleBySlug(req.params.slug)
    return res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

async function getAllAdmin(req, res, next) {
  try {
    const articles = await getAllAdminArticles()
    return res.json({ data: articles })
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const article = await createArticle(req.body)
    return res.status(201).json({ data: article })
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const article = await updateArticle(req.params.id, req.body)
    return res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    await deleteArticle(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getBySlug, getAllAdmin, create, update, remove }