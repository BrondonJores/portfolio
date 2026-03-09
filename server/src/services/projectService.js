/* Service metier project : regles applicatives et acces donnees. */
const { Op } = require('sequelize')
const slugifyLib = require('slugify')
const { Project } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

const MAX_IMPORT_ITEMS = 200

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
 * Convertit une valeur vers booleen permissif.
 * @param {unknown} value Valeur source.
 * @param {boolean} fallback Valeur par defaut.
 * @returns {boolean} Booleen normalise.
 */
function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

/**
 * Normalise un texte avec taille maximale.
 * @param {unknown} value Valeur source.
 * @param {number} maxLength Taille maximale.
 * @param {string} [fallback=''] Valeur de repli.
 * @returns {string} Texte nettoye.
 */
function sanitizeText(value, maxLength, fallback = '') {
  if (value === undefined || value === null) {
    return fallback
  }
  return String(value).trim().slice(0, maxLength)
}

/**
 * Normalise une liste de tags.
 * @param {unknown} value Valeur source.
 * @returns {Array<string>} Liste nettoyee.
 */
function sanitizeTags(value) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((tag) => sanitizeText(tag, 40))
        .filter(Boolean)
    )
  ).slice(0, 30)
}

/**
 * Derive le slug de reference depuis le payload (slug explicite ou titre).
 * @param {object} payload Donnees projet importees.
 * @param {Function} slugify Fonction de slugification.
 * @returns {string} Slug derive.
 */
function resolveImportedProjectSlug(payload, slugify) {
  const explicitSlug = sanitizeText(payload?.slug, 150)
  if (explicitSlug) {
    return slugify(explicitSlug, { lower: true, strict: true })
  }
  const title = sanitizeText(payload?.title, 150)
  return slugify(title, { lower: true, strict: true })
}

/**
 * Extrait les projets candidats depuis un payload d'import.
 * Accepte:
 * - { projects: [...] }
 * - [...]
 * - { title, ... } (projet unique)
 * @param {unknown} payload Payload brut.
 * @returns {Array<object>} Collection candidate.
 */
function resolveProjectsToImport(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.projects)) return payload.projects
  if (payload.title !== undefined || payload.slug !== undefined) return [payload]
  return []
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

  /**
   * Importe un lot de projets JSON en base.
   * Si `replaceExisting=true`, met a jour les projets existants (match slug ou titre).
   * Sinon, les doublons sont ignores.
   * @param {object|Array<object>} payload Payload d'import.
   * @returns {Promise<{created:number,updated:number,skippedCount:number,skipped:Array<object>,items:Array<object>}>} Resume import.
   * @throws {Error} Erreur 422 si payload invalide ou aucun item applique.
   */
  async function importProjects(payload) {
    const candidates = resolveProjectsToImport(payload)
    if (candidates.length === 0) {
      throw createHttpError(422, "Aucun projet a importer. Format attendu: { projects: [...] }.")
    }
    if (candidates.length > MAX_IMPORT_ITEMS) {
      throw createHttpError(422, `L'import est limite a ${MAX_IMPORT_ITEMS} projets par operation.`)
    }

    const replaceExisting = toBoolean(payload?.replaceExisting, false)
    let created = 0
    let updated = 0
    const skipped = []
    const items = []

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index]
      const title = sanitizeText(candidate?.title, 150)
      if (!title) {
        skipped.push({ index, reason: 'Titre manquant.' })
        continue
      }

      const slugCandidate = resolveImportedProjectSlug(candidate, slugify)
      if (!slugCandidate) {
        skipped.push({ index, title, reason: 'Slug invalide.' })
        continue
      }

      const normalizedProject = {
        title,
        slug: slugCandidate,
        description: sanitizeText(candidate?.description, 20000, ''),
        content: sanitizeText(candidate?.content, 200000, ''),
        tags: sanitizeTags(candidate?.tags),
        github_url: sanitizeText(candidate?.github_url, 255, ''),
        demo_url: sanitizeText(candidate?.demo_url, 255, ''),
        image_url: sanitizeText(candidate?.image_url, 255, ''),
        featured: toBoolean(candidate?.featured, false),
        published: toBoolean(candidate?.published, true),
      }

      const hasExplicitSlug = Boolean(sanitizeText(candidate?.slug, 150))
      let existing = await projectModel.findOne({ where: { slug: normalizedProject.slug } })

      if (!existing && !hasExplicitSlug) {
        existing = await projectModel.findOne({ where: { title: normalizedProject.title } })
      }

      if (existing) {
        if (!replaceExisting) {
          skipped.push({ index, title: normalizedProject.title, reason: 'Projet deja existant.' })
          continue
        }

        const updates = {
          title: normalizedProject.title,
          description: normalizedProject.description,
          content: normalizedProject.content,
          tags: normalizedProject.tags,
          github_url: normalizedProject.github_url,
          demo_url: normalizedProject.demo_url,
          image_url: normalizedProject.image_url,
          featured: normalizedProject.featured,
          published: normalizedProject.published,
        }

        if (hasExplicitSlug && normalizedProject.slug !== existing.slug) {
          const slugConflict = await projectModel.findOne({ where: { slug: normalizedProject.slug } })
          const conflictId = Number.parseInt(String(slugConflict?.id ?? ''), 10)
          const existingId = Number.parseInt(String(existing.id), 10)
          if (slugConflict && conflictId !== existingId) {
            skipped.push({
              index,
              title: normalizedProject.title,
              reason: `Slug deja utilise: ${normalizedProject.slug}.`,
            })
            continue
          }
          updates.slug = normalizedProject.slug
        }

        await existing.update(updates)
        updated += 1
        items.push(existing)
        continue
      }

      const createdProject = await projectModel.create(normalizedProject)
      created += 1
      items.push(createdProject)
    }

    if (created === 0 && updated === 0) {
      throw createHttpError(422, 'Import termine sans ajout ni mise a jour.')
    }

    return {
      created,
      updated,
      skippedCount: skipped.length,
      skipped: skipped.slice(0, 30),
      items,
    }
  }

  return {
    getAllPublicProjects,
    getPublicProjectBySlug,
    getAllAdminProjects,
    getAdminProjectById,
    createProject,
    updateProject,
    deleteProject,
    importProjects,
  }
}

module.exports = {
  createProjectService,
  ...createProjectService(),
}
