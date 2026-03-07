const slugifyLib = require('slugify')
const { Article } = require('../models')
const { createHttpError } = require('../utils/httpError')

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function createArticleService(deps = {}) {
  const articleModel = deps.articleModel || Article
  const slugify = deps.slugify || slugifyLib
  const now = deps.now || (() => new Date())

  async function getAllPublicArticles({ page, limit }) {
    const safePage = parsePositiveInt(page, 1)
    const safeLimit = parsePositiveInt(limit, 10)
    const offset = (safePage - 1) * safeLimit

    const { count, rows } = await articleModel.findAndCountAll({
      where: { published: true },
      limit: safeLimit,
      offset,
      order: [['published_at', 'DESC']],
    })

    return {
      data: rows,
      pagination: {
        total: count,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(count / safeLimit),
      },
    }
  }

  async function getPublicArticleBySlug(slug) {
    const article = await articleModel.findOne({
      where: { slug, published: true },
    })

    if (!article) {
      throw createHttpError(404, 'Article introuvable.')
    }

    return article
  }

  async function getAllAdminArticles() {
    return articleModel.findAll({ order: [['created_at', 'DESC']] })
  }

  async function createArticle(payload) {
    const { title, excerpt, content, cover_image, tags, published } = payload
    const slug = slugify(title, { lower: true, strict: true })
    const shouldPublish = published === true

    return articleModel.create({
      title,
      slug,
      excerpt,
      content,
      cover_image,
      tags: tags || [],
      published: shouldPublish,
      published_at: shouldPublish ? now() : null,
    })
  }

  async function updateArticle(id, payload) {
    const article = await articleModel.findByPk(id)

    if (!article) {
      throw createHttpError(404, 'Article introuvable.')
    }

    const updates = { ...payload }

    if (updates.title && updates.title !== article.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true })
    }

    if (updates.published === true && !article.published_at) {
      updates.published_at = now()
    }

    await article.update(updates)
    return article
  }

  async function deleteArticle(id) {
    const article = await articleModel.findByPk(id)

    if (!article) {
      throw createHttpError(404, 'Article introuvable.')
    }

    await article.destroy()
  }

  return {
    getAllPublicArticles,
    getPublicArticleBySlug,
    getAllAdminArticles,
    createArticle,
    updateArticle,
    deleteArticle,
  }
}

module.exports = {
  createArticleService,
  ...createArticleService(),
}