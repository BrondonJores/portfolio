/* Controleur des articles de blog */
const slugify = require('slugify')
const { Article } = require('../models')

/* Recuperation publique des articles publies */
async function getAllPublic(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10
    const page = parseInt(req.query.page, 10) || 1
    const offset = (page - 1) * limit

    const { count, rows } = await Article.findAndCountAll({
      where: { published: true },
      limit,
      offset,
      order: [['published_at', 'DESC']],
    })

    return res.json({
      data: rows,
      pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    next(err)
  }
}

/* Recuperation d'un article public par son slug */
async function getBySlug(req, res, next) {
  try {
    const article = await Article.findOne({
      where: { slug: req.params.slug, published: true },
    })

    if (!article) {
      return res.status(404).json({ error: 'Article introuvable.' })
    }

    return res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

/* Recuperation admin de tous les articles */
async function getAllAdmin(req, res, next) {
  try {
    const articles = await Article.findAll({ order: [['created_at', 'DESC']] })
    return res.json({ data: articles })
  } catch (err) {
    next(err)
  }
}

/* Creation d'un article */
async function create(req, res, next) {
  try {
    const { title, excerpt, content, cover_image, tags, published } = req.body

    const slug = slugify(title, { lower: true, strict: true })

    const article = await Article.create({
      title,
      slug,
      excerpt,
      content,
      cover_image,
      tags: tags || [],
      published: published || false,
      published_at: published ? new Date() : null,
    })

    return res.status(201).json({ data: article })
  } catch (err) {
    next(err)
  }
}

/* Mise a jour d'un article */
async function update(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id)

    if (!article) {
      return res.status(404).json({ error: 'Article introuvable.' })
    }

    const updates = { ...req.body }

    /* Regeneration du slug si le titre change */
    if (updates.title && updates.title !== article.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true })
    }

    /* Remplissage automatique de published_at lors de la premiere publication */
    if (updates.published === true && !article.published_at) {
      updates.published_at = new Date()
    }

    await article.update(updates)

    return res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

/* Suppression d'un article */
async function remove(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id)

    if (!article) {
      return res.status(404).json({ error: 'Article introuvable.' })
    }

    await article.destroy()

    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getBySlug, getAllAdmin, create, update, remove }
