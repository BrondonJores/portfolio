/* Controleur des projets */
const { Op } = require('sequelize')
const slugify = require('slugify')
const { Project } = require('../models')

/* Recuperation publique des projets publies */
async function getAllPublic(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 10
    const offset = (page - 1) * limit

    const where = { published: true }

    /* Filtre optionnel par tag */
    if (req.query.tag) {
      where.tags = { [Op.like]: `%"${req.query.tag}"%` }
    }

    /* Filtre optionnel par featured */
    if (req.query.featured === 'true') {
      where.featured = true
    }

    const { count, rows } = await Project.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    })

    return res.json({
      data: rows,
      pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    next(err)
  }
}

/* Recuperation d'un projet public par son slug */
async function getBySlug(req, res, next) {
  try {
    const project = await Project.findOne({
      where: { slug: req.params.slug, published: true },
    })

    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable.' })
    }

    return res.json({ data: project })
  } catch (err) {
    next(err)
  }
}

/* Recuperation admin de tous les projets */
async function getAllAdmin(req, res, next) {
  try {
    const projects = await Project.findAll({ order: [['created_at', 'DESC']] })
    return res.json({ data: projects })
  } catch (err) {
    next(err)
  }
}

/* Creation d'un projet */
async function create(req, res, next) {
  try {
    const { title, description, content, tags, github_url, demo_url, image_url, featured, published } = req.body

    const slug = slugify(title, { lower: true, strict: true })

    const project = await Project.create({
      title,
      slug,
      description,
      content,
      tags: tags || [],
      github_url,
      demo_url,
      image_url,
      featured: featured || false,
      published: published !== undefined ? published : true,
    })

    return res.status(201).json({ data: project })
  } catch (err) {
    next(err)
  }
}

/* Mise a jour d'un projet */
async function update(req, res, next) {
  try {
    const project = await Project.findByPk(req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable.' })
    }

    const updates = { ...req.body }

    /* Regeneration du slug si le titre change */
    if (updates.title && updates.title !== project.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true })
    }

    await project.update(updates)

    return res.json({ data: project })
  } catch (err) {
    next(err)
  }
}

/* Suppression d'un projet */
async function remove(req, res, next) {
  try {
    const project = await Project.findByPk(req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable.' })
    }

    await project.destroy()

    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getBySlug, getAllAdmin, create, update, remove }
