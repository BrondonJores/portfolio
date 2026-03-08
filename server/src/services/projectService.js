/* Service metier project : regles applicatives et acces donnees. */
const { Op } = require('sequelize')
const slugifyLib = require('slugify')
const { Project } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

/**
 * Convertit une valeur en entier strictement positif.
 * @param {unknown} value Valeur source.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier positif valide.
 */
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

/**
 * Construit le service projet avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.projectModel] Modele projet.
 * @param {Function} [deps.slugify] Fonction de slugification.
 * @param {symbol|string} [deps.likeOperator] Operateur SQL LIKE.
 * @returns {object} API metier projet.
 */
function createProjectService(deps = {}) {
  const projectModel = deps.projectModel || Project
  const slugify = deps.slugify || slugifyLib
  const likeOperator = deps.likeOperator || Op.like

  /**
   * Liste les projets publics avec filtres et pagination.
   * @param {object} params Parametres de recherche.
   * @param {string|number|undefined} params.page Numero de page.
   * @param {string|number|undefined} params.limit Taille de page.
   * @param {string|undefined} params.tag Filtre tag.
   * @param {string|undefined} params.featured Filtre featured.
   * @returns {Promise<{data:Array,pagination:{total:number,page:number,limit:number,pages:number}}>} Resultat pagine.
   */
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

  /**
   * Recupere un projet public par slug.
   * @param {string} slug Slug projet.
   * @returns {Promise<object>} Projet trouve.
   * @throws {Error} Erreur 404 si projet introuvable.
   */
  async function getPublicProjectBySlug(slug) {
    const project = await projectModel.findOne({
      where: { slug, published: true },
    })

    if (!project) {
      throw createHttpError(404, 'Projet introuvable.')
    }

    return project
  }

  /**
   * Liste tous les projets (admin).
   * @returns {Promise<Array>} Liste complete.
   */
  async function getAllAdminProjects(params = {}) {
    const { limit, offset } = resolveLimitOffsetPagination(params, {
      defaultLimit: 20,
      maxLimit: 200,
    })

    const result = await projectModel.findAndCountAll({
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
   * Recupere un projet admin par identifiant.
   * @param {number|string} id Identifiant projet.
   * @returns {Promise<object>} Projet trouve.
   * @throws {Error} Erreur 404 si projet introuvable.
   */
  async function getAdminProjectById(id) {
    const project = await projectModel.findByPk(id)
    if (!project) {
      throw createHttpError(404, 'Projet introuvable.')
    }
    return project
  }

  /**
   * Cree un nouveau projet et calcule son slug.
   * @param {object} payload Donnees projet valides.
   * @returns {Promise<object>} Projet cree.
   */
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

  /**
   * Met a jour un projet et regenere le slug si le titre change.
   * @param {number|string} id Identifiant projet.
   * @param {object} payload Champs a mettre a jour.
   * @returns {Promise<object>} Projet mis a jour.
   * @throws {Error} Erreur 404 si projet introuvable.
   */
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

  /**
   * Supprime un projet.
   * @param {number|string} id Identifiant projet.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si projet introuvable.
   */
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
    getAdminProjectById,
    createProject,
    updateProject,
    deleteProject,
  }
}

module.exports = {
  createProjectService,
  ...createProjectService(),
}
