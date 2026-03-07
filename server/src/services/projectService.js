const { Op } = require('sequelize')
const slugifyLib = require('slugify')
const { Project } = require('../models')
const { createHttpError } = require('../utils/httpError')

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function createProjectService(deps = {}) {
  const projectModel = deps.projectModel || Project
  const slugify = deps.slugify || slugifyLib
  const likeOperator = deps.likeOperator || Op.like

  async function getAllPublicProjects({ page, limit, tag, featured }) {
    const safePage = parsePositiveInt(page, 1)
    const safeLimit = parsePositiveInt(limit, 10)
    const offset = (safePage - 1) * safeLimit
    const where = { published: true }

    if (tag) {
      where.tags = { [likeOperator]: `%"${tag}"%` }
    }

    if (featured === 'true') {
      where.featured = true
    }

    const { count, rows } = await projectModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['created_at', 'DESC']],
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

  async function getPublicProjectBySlug(slug) {
    const project = await projectModel.findOne({
      where: { slug, published: true },
    })

    if (!project) {
      throw createHttpError(404, 'Projet introuvable.')
    }

    return project
  }

  async function getAllAdminProjects() {
    return projectModel.findAll({ order: [['created_at', 'DESC']] })
  }

  async function createProject(payload) {
    const { title, description, content, tags, github_url, demo_url, image_url, featured, published } = payload
    const slug = slugify(title, { lower: true, strict: true })

    return projectModel.create({
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
  }

  async function updateProject(id, payload) {
    const project = await projectModel.findByPk(id)

    if (!project) {
      throw createHttpError(404, 'Projet introuvable.')
    }

    const updates = { ...payload }
    if (updates.title && updates.title !== project.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true })
    }

    await project.update(updates)
    return project
  }

  async function deleteProject(id) {
    const project = await projectModel.findByPk(id)

    if (!project) {
      throw createHttpError(404, 'Projet introuvable.')
    }

    await project.destroy()
  }

  return {
    getAllPublicProjects,
    getPublicProjectBySlug,
    getAllAdminProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}

module.exports = {
  createProjectService,
  ...createProjectService(),
}