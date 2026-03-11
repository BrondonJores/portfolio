/* Service metier project : regles applicatives et acces donnees. */
const { Op } = require('sequelize')
const slugifyLib = require('slugify')
const { Project } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')
const {
  normalizeProjectTaxonomy,
  buildProjectTagsFromTaxonomy,
  buildProjectFacets,
} = require('../utils/projectTaxonomy')

const MAX_IMPORT_ITEMS = 200
const FACETS_CACHE_DEFAULT_TTL_MS = 2 * 60 * 1000
const PUBLIC_PROJECT_LIST_ATTRIBUTES = Object.freeze([
  'id',
  'title',
  'slug',
  'description',
  'taxonomy',
  'tags',
  'github_url',
  'demo_url',
  'image_url',
  'featured',
  'published',
  'created_at',
  'updated_at',
])

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
 * Nettoie une liste de tags legacy.
 * @param {unknown} value Valeur source.
 * @returns {Array<string>} Liste nettoyee.
 */
function sanitizeLegacyTags(value) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((tag) => sanitizeText(tag, 80))
        .filter(Boolean)
    )
  ).slice(0, 40)
}

/**
 * Convertit un filtre query (string csv) en liste de valeurs.
 * @param {unknown} value Valeur query.
 * @param {number} maxValues Limite max de valeurs.
 * @returns {Array<string>} Liste nettoyee.
 */
function parseQueryFilterValues(value, maxValues = 8) {
  const raw = sanitizeText(value, 400)
  if (!raw) return []

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((entry) => sanitizeText(entry, 80))
        .filter(Boolean)
    )
  ).slice(0, maxValues)
}

/**
 * Rehydrate un projet avec taxonomy + tags normalises.
 * @param {unknown} project Projet modele ou plain object.
 * @returns {object} Payload normalise.
 */
function toProjectPayload(project) {
  const source = project && typeof project.toJSON === 'function' ? project.toJSON() : project || {}
  const legacyTags = sanitizeLegacyTags(source.tags)
  const taxonomy = normalizeProjectTaxonomy(source.taxonomy, legacyTags)
  const tags = buildProjectTagsFromTaxonomy(taxonomy, legacyTags)

  return {
    ...source,
    taxonomy,
    tags,
  }
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
  const facetsCacheTtlMs = parsePositiveInt(
    process.env.PROJECT_PUBLIC_FACETS_CACHE_TTL_MS,
    FACETS_CACHE_DEFAULT_TTL_MS
  )

  let publicFacetsCache = null
  let publicFacetsExpiresAt = 0

  /**
   * Invalide le cache des facettes publiques.
   * @returns {void}
   */
  function invalidatePublicFacetsCache() {
    publicFacetsCache = null
    publicFacetsExpiresAt = 0
  }

  /**
   * Retourne les facettes publiques avec memoization TTL.
   * @returns {Promise<object>} Facettes construites.
   */
  async function getPublicProjectFacets() {
    const now = Date.now()
    if (publicFacetsCache && now < publicFacetsExpiresAt) {
      return publicFacetsCache
    }

    const facetRows = await projectModel.findAll({
      where: { published: true },
      attributes: ['taxonomy', 'tags'],
      raw: true,
    })

    publicFacetsCache = buildProjectFacets(facetRows)
    publicFacetsExpiresAt = now + facetsCacheTtlMs
    return publicFacetsCache
  }

  /**
   * Liste les projets publics avec filtres et pagination.
   * @param {object} params Parametres de recherche.
   * @param {string|number|undefined} params.page Numero de page.
   * @param {string|number|undefined} params.limit Taille de page.
   * @param {string|undefined} params.tag Filtre tag legacy.
   * @param {string|undefined} params.type Filtre type.
   * @param {string|undefined} params.stack Filtre stack.
   * @param {string|undefined} params.technology Filtre technologie.
   * @param {string|undefined} params.domain Filtre domaine.
   * @param {string|undefined} params.label Filtre label.
   * @param {string|undefined} params.includeFacets Inclut les facettes si true.
   * @param {string|undefined} params.featured Filtre featured.
   * @returns {Promise<{data:Array,pagination:{total:number,page:number,limit:number,pages:number},facets:object}>} Resultat pagine.
   */
  async function getAllPublicProjects({
    page,
    limit,
    tag,
    type,
    stack,
    technology,
    domain,
    label,
    includeFacets,
    featured,
  }) {
    const safePage = parsePositiveInt(page, 1)
    const safeLimit = parsePositiveInt(limit, 10)
    const offset = (safePage - 1) * safeLimit
    const baseWhere = { published: true }

    if (featured === 'true') {
      baseWhere.featured = true
    }

    const tagFilters = []
    const filterGroups = [
      parseQueryFilterValues(tag, 8),
      parseQueryFilterValues(type, 4),
      parseQueryFilterValues(stack, 8),
      parseQueryFilterValues(technology, 12),
      parseQueryFilterValues(domain, 8),
      parseQueryFilterValues(label, 8),
    ]

    for (const group of filterGroups) {
      if (group.length === 0) continue

      if (group.length === 1) {
        tagFilters.push({ tags: { [likeOperator]: `%"${group[0]}"%` } })
        continue
      }

      tagFilters.push({
        [Op.or]: group.map((entry) => ({ tags: { [likeOperator]: `%"${entry}"%` } })),
      })
    }

    const where = {
      ...baseWhere,
      ...(tagFilters.length > 0 ? { [Op.and]: tagFilters } : {}),
    }

    const result = await projectModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['created_at', 'DESC']],
      attributes: PUBLIC_PROJECT_LIST_ATTRIBUTES,
    })

    let facets
    if (toBoolean(includeFacets, false)) {
      facets = await getPublicProjectFacets()
    }

    return {
      data: result.rows.map(toProjectPayload),
      pagination: {
        total: result.count,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(result.count / safeLimit),
      },
      ...(facets ? { facets } : {}),
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

    return toProjectPayload(project)
  }

  /**
   * Liste tous les projets (admin).
   * @returns {Promise<object>} Liste paginee.
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

    const payload = buildPaginatedPayload({
      items: result.rows,
      total: result.count,
      limit,
      offset,
    })

    return {
      ...payload,
      items: payload.items.map(toProjectPayload),
    }
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
    return toProjectPayload(project)
  }

  /**
   * Cree un nouveau projet et calcule son slug.
   * @param {object} payload Donnees projet valides.
   * @returns {Promise<object>} Projet cree.
   */
  async function createProject(payload) {
    const title = sanitizeText(payload?.title, 150)
    if (!title) {
      throw createHttpError(422, 'Le titre est obligatoire.')
    }

    const legacyTags = sanitizeLegacyTags(payload?.tags)
    const taxonomy = normalizeProjectTaxonomy(payload?.taxonomy, legacyTags)
    const tags = buildProjectTagsFromTaxonomy(taxonomy, legacyTags)
    const slug = slugify(title, { lower: true, strict: true })

    const createdProject = await projectModel.create({
      title,
      slug,
      description: sanitizeText(payload?.description, 20000, ''),
      content: sanitizeText(payload?.content, 200000, ''),
      taxonomy,
      tags,
      github_url: sanitizeText(payload?.github_url, 255, ''),
      demo_url: sanitizeText(payload?.demo_url, 255, ''),
      image_url: sanitizeText(payload?.image_url, 255, ''),
      featured: toBoolean(payload?.featured, false),
      published: payload?.published !== undefined ? toBoolean(payload?.published, true) : true,
    })

    invalidatePublicFacetsCache()
    return toProjectPayload(createdProject)
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
    if (updates.title !== undefined) {
      updates.title = sanitizeText(updates.title, 150)
      if (!updates.title) {
        throw createHttpError(422, 'Le titre est obligatoire.')
      }
    }
    if (updates.description !== undefined) {
      updates.description = sanitizeText(updates.description, 20000, '')
    }
    if (updates.content !== undefined) {
      updates.content = sanitizeText(updates.content, 200000, '')
    }
    if (updates.github_url !== undefined) {
      updates.github_url = sanitizeText(updates.github_url, 255, '')
    }
    if (updates.demo_url !== undefined) {
      updates.demo_url = sanitizeText(updates.demo_url, 255, '')
    }
    if (updates.image_url !== undefined) {
      updates.image_url = sanitizeText(updates.image_url, 255, '')
    }
    if (updates.featured !== undefined) {
      updates.featured = toBoolean(updates.featured, Boolean(project.featured))
    }
    if (updates.published !== undefined) {
      updates.published = toBoolean(updates.published, Boolean(project.published))
    }

    const hasTaxonomyUpdate = Object.prototype.hasOwnProperty.call(payload || {}, 'taxonomy')
    const hasTagsUpdate = Object.prototype.hasOwnProperty.call(payload || {}, 'tags')
    if (hasTaxonomyUpdate) {
      const sourceTags = hasTagsUpdate ? sanitizeLegacyTags(payload?.tags) : []
      const taxonomy = normalizeProjectTaxonomy(payload?.taxonomy, sourceTags)
      updates.taxonomy = taxonomy
      updates.tags = buildProjectTagsFromTaxonomy(taxonomy, sourceTags)
    } else if (hasTagsUpdate) {
      const sourceTags = sanitizeLegacyTags(payload?.tags)
      const taxonomy = normalizeProjectTaxonomy(project.taxonomy, sourceTags)
      updates.taxonomy = taxonomy
      updates.tags = buildProjectTagsFromTaxonomy(taxonomy, sourceTags)
    } else {
      delete updates.taxonomy
      delete updates.tags
    }

    if (updates.title && updates.title !== project.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true })
    }

    await project.update(updates)
    invalidatePublicFacetsCache()
    return toProjectPayload(project)
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
    invalidatePublicFacetsCache()
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

      const legacyTags = sanitizeLegacyTags(candidate?.tags)
      const taxonomy = normalizeProjectTaxonomy(candidate?.taxonomy, legacyTags)
      const tags = buildProjectTagsFromTaxonomy(taxonomy, legacyTags)

      const normalizedProject = {
        title,
        slug: slugCandidate,
        description: sanitizeText(candidate?.description, 20000, ''),
        content: sanitizeText(candidate?.content, 200000, ''),
        taxonomy,
        tags,
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
          taxonomy: normalizedProject.taxonomy,
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
        items.push(toProjectPayload(existing))
        continue
      }

      const createdProject = await projectModel.create(normalizedProject)
      created += 1
      items.push(toProjectPayload(createdProject))
    }

    if (created === 0 && updated === 0) {
      throw createHttpError(422, 'Import termine sans ajout ni mise a jour.')
    }

    invalidatePublicFacetsCache()
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
