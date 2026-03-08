/* Service metier des pages CMS (draft/publish/revisions) avec approche SOLID. */
const slugify = require('slugify')
const { Op } = require('sequelize')
const { CmsPage, CmsPageRevision } = require('../models')
const { createHttpError } = require('../utils/httpError')

const ALLOWED_STATUSES = new Set(['draft', 'published', 'archived'])
const ALLOWED_BLOCK_TYPES = new Set(['paragraph', 'heading', 'image', 'code', 'quote', 'list'])
const MAX_BLOCKS = 250

/**
 * Tronque et normalise une chaine.
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Longueur max.
 * @param {string} [fallback=''] Valeur de repli.
 * @returns {string} Texte normalise.
 */
function sanitizeText(value, maxLength, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, maxLength)
}

/**
 * Convertit une valeur vers booleen permissif.
 * @param {unknown} value Valeur brute.
 * @param {boolean} [fallback=false] Valeur de repli.
 * @returns {boolean} Booleen normalise.
 */
function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

/**
 * Parse un entier strictement positif.
 * @param {unknown} value Valeur brute.
 * @returns {number|null} Entier valide ou `null`.
 */
function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

/**
 * Nettoie un identifiant technique.
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Taille max.
 * @returns {string} Identifiant normalise.
 */
function sanitizeIdentifier(value, maxLength) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

/**
 * Normalise le statut page.
 * @param {unknown} value Valeur brute.
 * @param {string} [fallback='draft'] Valeur de repli.
 * @returns {'draft'|'published'|'archived'} Statut valide.
 */
function sanitizeStatus(value, fallback = 'draft') {
  const normalized = sanitizeIdentifier(value, 20)
  if (ALLOWED_STATUSES.has(normalized)) {
    return normalized
  }
  return fallback
}

/**
 * Construit un slug stable depuis une valeur utilisateur.
 * @param {unknown} value Valeur brute.
 * @returns {string} Slug normalise.
 */
function sanitizeSlug(value) {
  const normalized = slugify(String(value || ''), {
    lower: true,
    strict: true,
    trim: true,
    locale: 'fr',
  }).slice(0, 160)

  return normalizeSlugWithFallback(normalized)
}

/**
 * Garantit une valeur de slug minimum apres nettoyage.
 * @param {string} value Slug potentiellement vide.
 * @returns {string} Slug final.
 */
function normalizeSlugWithFallback(value) {
  const cleaned = sanitizeIdentifier(value, 160)
  return cleaned || 'page'
}

/**
 * Nettoie recursivement des items de liste.
 * @param {unknown} items Liste brute.
 * @param {number} [depth=0] Profondeur courante.
 * @returns {Array<string | {content: string, items: Array}>} Liste nettoyee.
 */
function sanitizeListItems(items, depth = 0) {
  if (!Array.isArray(items)) return ['']

  if (depth >= 3) {
    const flatItems = items
      .map((item) => (typeof item === 'string' ? sanitizeText(item, 500) : sanitizeText(item?.content, 500)))
      .filter(Boolean)

    return flatItems.length > 0 ? flatItems.slice(0, 80) : ['']
  }

  const sanitized = items
    .slice(0, 80)
    .map((item) => {
      if (typeof item === 'string') {
        return sanitizeText(item, 500)
      }

      if (!item || typeof item !== 'object') {
        return ''
      }

      return {
        content: sanitizeText(item.content, 500),
        items: sanitizeListItems(item.items, depth + 1),
      }
    })
    .filter((item) => {
      if (typeof item === 'string') return item.length > 0
      return Boolean(item?.content || (Array.isArray(item?.items) && item.items.length > 0))
    })

  return sanitized.length > 0 ? sanitized : ['']
}

/**
 * Nettoie un bloc de layout.
 * @param {unknown} block Bloc brut.
 * @returns {object|null} Bloc normalise ou `null`.
 */
function sanitizeBlock(block) {
  if (!block || typeof block !== 'object') return null

  const type = sanitizeIdentifier(block.type, 20)
  if (!ALLOWED_BLOCK_TYPES.has(type)) return null

  const common = {
    id: sanitizeIdentifier(block.id, 64) || null,
    type,
  }

  switch (type) {
    case 'heading':
      return {
        ...common,
        level: Number(block.level) === 3 ? 3 : 2,
        content: sanitizeText(block.content, 2000),
      }
    case 'image':
      return {
        ...common,
        url: sanitizeText(block.url, 2000),
        caption: sanitizeText(block.caption, 500),
      }
    case 'code':
      return {
        ...common,
        language: sanitizeText(block.language, 40, 'js') || 'js',
        content: sanitizeText(block.content, 200000),
      }
    case 'quote':
      return {
        ...common,
        content: sanitizeText(block.content, 4000),
        author: sanitizeText(block.author, 200),
      }
    case 'list':
      return {
        ...common,
        items: sanitizeListItems(block.items),
      }
    case 'paragraph':
    default:
      return {
        ...common,
        content: sanitizeText(block.content, 8000),
      }
  }
}

/**
 * Nettoie une collection de blocs.
 * @param {unknown} layout Layout brut.
 * @returns {Array<object>} Layout normalise.
 */
function sanitizeLayout(layout) {
  if (!Array.isArray(layout)) return []
  return layout
    .slice(0, MAX_BLOCKS)
    .map((block) => sanitizeBlock(block))
    .filter(Boolean)
}

/**
 * Extrait la collection de blocs depuis payload (`blocks` ou `layout`).
 * @param {unknown} payload Payload brut.
 * @returns {Array<object>|null} Blocs normalises ou `null` si absent.
 */
function resolvePayloadLayout(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (Array.isArray(payload.blocks)) return sanitizeLayout(payload.blocks)
  if (Array.isArray(payload.layout)) return sanitizeLayout(payload.layout)
  if (payload.layout && typeof payload.layout === 'object' && Array.isArray(payload.layout.blocks)) {
    return sanitizeLayout(payload.layout.blocks)
  }
  return null
}

/**
 * Nettoie un objet SEO.
 * @param {unknown} value Objet brut.
 * @returns {object} SEO normalise.
 */
function sanitizeSeo(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const rawKeywords = Array.isArray(value.keywords)
    ? value.keywords
    : String(value.keywords || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  return {
    title: sanitizeText(value.title, 180),
    description: sanitizeText(value.description, 320),
    ogImage: sanitizeText(value.ogImage, 2000),
    canonicalUrl: sanitizeText(value.canonicalUrl, 2000),
    noindex: toBoolean(value.noindex, false),
    nofollow: toBoolean(value.nofollow, false),
    keywords: rawKeywords
      .slice(0, 20)
      .map((item) => sanitizeText(item, 40))
      .filter(Boolean),
  }
}

/**
 * Nettoie un identifiant admin.
 * @param {unknown} adminId Identifiant brut.
 * @returns {number|null} Identifiant admin valide.
 */
function sanitizeAdminId(adminId) {
  return parsePositiveInteger(adminId)
}

/**
 * Verifie que le repository revisions expose les methodes minimales.
 * @param {unknown} repository Repository potentiel.
 * @returns {boolean} True si exploitable.
 */
function canUseRevisionRepository(repository) {
  return Boolean(
    repository &&
      typeof repository.create === 'function' &&
      typeof repository.findAll === 'function' &&
      typeof repository.findOne === 'function'
  )
}

/**
 * Transforme un modele page vers DTO admin.
 * @param {object} page Modele page.
 * @returns {object} DTO admin.
 */
function mapCmsPageForAdmin(page) {
  return {
    id: page.id,
    slug: page.slug,
    status: page.status,
    draft: {
      title: page.draft_title || '',
      layout: Array.isArray(page.draft_layout) ? page.draft_layout : [],
      seo: page.draft_seo && typeof page.draft_seo === 'object' ? page.draft_seo : {},
    },
    published: page.published_title
      ? {
          title: page.published_title,
          layout: Array.isArray(page.published_layout) ? page.published_layout : [],
          seo: page.published_seo && typeof page.published_seo === 'object' ? page.published_seo : {},
          publishedAt: page.published_at,
          publishedByAdminId: page.published_by_admin_id || null,
        }
      : null,
    createdByAdminId: page.created_by_admin_id || null,
    updatedByAdminId: page.updated_by_admin_id || null,
    createdAt: page.created_at,
    updatedAt: page.updated_at,
  }
}

/**
 * Transforme un modele page vers DTO public.
 * @param {object} page Modele page.
 * @returns {object} DTO public.
 */
function mapCmsPageForPublic(page) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.published_title || '',
    layout: Array.isArray(page.published_layout) ? page.published_layout : [],
    seo: page.published_seo && typeof page.published_seo === 'object' ? page.published_seo : {},
    publishedAt: page.published_at,
  }
}

/**
 * Construit un snapshot de page a stocker en revision.
 * @param {object} page Modele page.
 * @returns {object} Snapshot serialisable.
 */
function buildCmsPageSnapshot(page) {
  return {
    slug: sanitizeSlug(page?.slug || 'page'),
    status: sanitizeStatus(page?.status, 'draft'),
    draft: {
      title: sanitizeText(page?.draft_title, 180),
      layout: sanitizeLayout(page?.draft_layout),
      seo: sanitizeSeo(page?.draft_seo || {}),
    },
    published: page?.published_title
      ? {
          title: sanitizeText(page.published_title, 180),
          layout: sanitizeLayout(page.published_layout),
          seo: sanitizeSeo(page.published_seo || {}),
          publishedAt: page.published_at || null,
          publishedByAdminId: sanitizeAdminId(page.published_by_admin_id),
        }
      : null,
  }
}

/**
 * Nettoie un snapshot revision en vue d'un rollback.
 * @param {unknown} snapshot Snapshot brut.
 * @returns {object|null} Snapshot normalise ou `null`.
 */
function sanitizeRevisionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null

  const slug = sanitizeSlug(snapshot.slug)
  const status = sanitizeStatus(snapshot.status, 'draft')
  const draftTitle = sanitizeText(snapshot?.draft?.title, 180)
  const draftLayout = sanitizeLayout(snapshot?.draft?.layout)
  const draftSeo = sanitizeSeo(snapshot?.draft?.seo || {})
  const hasPublished = Boolean(snapshot?.published && typeof snapshot.published === 'object')

  return {
    slug,
    status,
    draft_title: draftTitle,
    draft_layout: draftLayout,
    draft_seo: draftSeo,
    published_title: hasPublished ? sanitizeText(snapshot?.published?.title, 180) || null : null,
    published_layout: hasPublished ? sanitizeLayout(snapshot?.published?.layout) : null,
    published_seo: hasPublished ? sanitizeSeo(snapshot?.published?.seo || {}) : null,
    published_at: hasPublished && snapshot?.published?.publishedAt ? new Date(snapshot.published.publishedAt) : null,
    published_by_admin_id: hasPublished ? sanitizeAdminId(snapshot?.published?.publishedByAdminId) : null,
  }
}

/**
 * Construit le service des pages CMS avec dependances injectables.
 * @param {object} [deps={}] Dependances optionnelles.
 * @param {object} [deps.cmsPageModel] Modele page.
 * @param {object} [deps.cmsPageRevisionModel] Modele revision.
 * @param {Function} [deps.now] Fabrique de date.
 * @param {symbol|string} [deps.likeOperator] Operateur SQL LIKE.
 * @param {symbol|string} [deps.notEqualOperator] Operateur SQL !=.
 * @returns {object} API metier des pages.
 */
function createCmsPageService(deps = {}) {
  const cmsPageModel = deps.cmsPageModel || CmsPage
  const cmsPageRevisionModel =
    deps.cmsPageRevisionModel !== undefined
      ? deps.cmsPageRevisionModel
      : deps.cmsPageModel
        ? null
        : CmsPageRevision
  const now = deps.now || (() => new Date())
  const likeOperator = deps.likeOperator || Op.iLike
  const notEqualOperator = deps.notEqualOperator || Op.ne
  const revisionRepositoryEnabled = canUseRevisionRepository(cmsPageRevisionModel)

  /**
   * Charge une page par id ou leve 404.
   * @param {number|string} id Identifiant page.
   * @returns {Promise<object>} Page trouvee.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function ensureCmsPageById(id) {
    const page = await cmsPageModel.findByPk(id)
    if (!page) {
      throw createHttpError(404, 'Page introuvable.')
    }
    return page
  }

  /**
   * Verifie qu'un slug reste unique.
   * @param {string} slug Slug cible.
   * @param {number|string|null} [ignoreId=null] Id page a ignorer.
   * @returns {Promise<void>} Promise resolue si unique.
   * @throws {Error} Erreur 409 si collision.
   */
  async function ensureCmsPageSlugUnique(slug, ignoreId = null) {
    const where = { slug }
    const safeIgnoreId = parsePositiveInteger(ignoreId)
    if (safeIgnoreId) {
      where.id = { [notEqualOperator]: safeIgnoreId }
    }

    const existing = await cmsPageModel.findOne({ where })
    if (existing) {
      throw createHttpError(409, 'Ce slug est deja utilise par une autre page.')
    }
  }

  /**
   * Retourne le prochain numero de revision pour une page.
   * @param {number|string} pageId Id page.
   * @returns {Promise<number>} Prochain numero de revision.
   */
  async function getNextRevisionVersion(pageId) {
    if (!revisionRepositoryEnabled) return 1

    const latest = await cmsPageRevisionModel.findOne({
      where: { page_id: pageId },
      order: [['version_number', 'DESC']],
    })

    const current = parsePositiveInteger(latest?.version_number) || 0
    return current + 1
  }

  /**
   * Cree une entree de revision.
   * @param {object} page Page source.
   * @param {'draft'|'published'|'rollback'} stage Etape metier.
   * @param {string} changeNote Note de changement.
   * @param {number|null} adminId Id admin auteur.
   * @returns {Promise<object|null>} Revision creee ou `null`.
   */
  async function createRevisionEntry(page, stage, changeNote, adminId) {
    if (!revisionRepositoryEnabled) return null

    const versionNumber = await getNextRevisionVersion(page.id)
    const snapshot = buildCmsPageSnapshot(page)
    return cmsPageRevisionModel.create({
      page_id: page.id,
      version_number: versionNumber,
      stage,
      change_note: sanitizeText(changeNote, 255) || null,
      snapshot,
      created_by_admin_id: adminId,
    })
  }

  /**
   * Liste les pages CMS cote admin.
   * @param {object} [params={}] Filtres.
   * @param {string} [params.status] Filtre statut.
   * @param {string} [params.q] Recherche sur slug/titre draft.
   * @param {number|string} [params.limit=50] Taille de page.
   * @param {number|string} [params.offset=0] Offset de pagination.
   * @returns {Promise<{items:Array<object>,total:number,limit:number,offset:number}>} Resultat pagine.
   */
  async function getAllAdminCmsPages(params = {}) {
    const limit = Math.min(parsePositiveInteger(params.limit) || 50, 200)
    const offset = Math.max(Number(params.offset) || 0, 0)
    const where = {}

    const status = sanitizeStatus(params.status, '')
    if (status) {
      where.status = status
    }

    const query = sanitizeText(params.q, 120)
    if (query) {
      where[Op.or] = [
        { slug: { [likeOperator]: `%${query}%` } },
        { draft_title: { [likeOperator]: `%${query}%` } },
      ]
    }

    const result = await cmsPageModel.findAndCountAll({
      where,
      order: [
        ['updated_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
      offset,
    })

    return {
      items: (result.rows || []).map((entry) => mapCmsPageForAdmin(entry)),
      total: Number(result.count || 0),
      limit,
      offset,
    }
  }

  /**
   * Retourne une page admin par id.
   * @param {number|string} id Identifiant page.
   * @returns {Promise<object>} DTO page admin.
   */
  async function getAdminCmsPageById(id) {
    const page = await ensureCmsPageById(id)
    return mapCmsPageForAdmin(page)
  }

  /**
   * Cree une nouvelle page CMS en mode draft.
   * @param {object} payload Payload page.
   * @param {number|string} [adminId] Admin createur.
   * @returns {Promise<object>} DTO page admin.
   */
  async function createCmsPage(payload, adminId) {
    const safeAdminId = sanitizeAdminId(adminId)
    const draftTitle = sanitizeText(payload?.title, 180)
    if (!draftTitle) {
      throw createHttpError(422, 'Le titre de la page est obligatoire.')
    }

    const slug = sanitizeSlug(payload?.slug || draftTitle)
    if (!slug) {
      throw createHttpError(422, 'Le slug de la page est invalide.')
    }

    await ensureCmsPageSlugUnique(slug)

    const draftLayout = resolvePayloadLayout(payload) || []
    const draftSeo = sanitizeSeo(payload?.seo || {})

    const page = await cmsPageModel.create({
      slug,
      status: 'draft',
      draft_title: draftTitle,
      draft_layout: draftLayout,
      draft_seo: draftSeo,
      created_by_admin_id: safeAdminId,
      updated_by_admin_id: safeAdminId,
    })

    await createRevisionEntry(
      page,
      'draft',
      sanitizeText(payload?.change_note, 255, 'Creation de la page'),
      safeAdminId
    )

    return mapCmsPageForAdmin(page)
  }

  /**
   * Met a jour le draft d'une page CMS.
   * @param {number|string} id Identifiant page.
   * @param {object} payload Payload de modification.
   * @param {number|string} [adminId] Admin auteur.
   * @returns {Promise<object>} DTO page admin.
   */
  async function updateCmsPage(id, payload, adminId) {
    const page = await ensureCmsPageById(id)
    const safeAdminId = sanitizeAdminId(adminId)
    const updates = {}

    if (payload?.slug !== undefined) {
      const slug = sanitizeSlug(payload.slug)
      if (!slug) {
        throw createHttpError(422, 'Le slug de la page est invalide.')
      }
      await ensureCmsPageSlugUnique(slug, page.id)
      updates.slug = slug
    }

    if (payload?.title !== undefined) {
      const title = sanitizeText(payload.title, 180)
      if (!title) {
        throw createHttpError(422, 'Le titre de la page est obligatoire.')
      }
      updates.draft_title = title
    }

    const layout = resolvePayloadLayout(payload)
    if (layout !== null) {
      updates.draft_layout = layout
    }

    if (payload?.seo !== undefined) {
      updates.draft_seo = sanitizeSeo(payload.seo)
    }

    if (payload?.status !== undefined) {
      updates.status = sanitizeStatus(payload.status, page.status)
    }

    updates.updated_by_admin_id = safeAdminId

    await page.update(updates)
    await createRevisionEntry(
      page,
      'draft',
      sanitizeText(payload?.change_note, 255, 'Mise a jour de la page'),
      safeAdminId
    )

    return mapCmsPageForAdmin(page)
  }

  /**
   * Publie une page (copie du draft vers la version live).
   * @param {number|string} id Identifiant page.
   * @param {object} [payload={}] Options de publication.
   * @param {number|string} [adminId] Admin auteur.
   * @returns {Promise<object>} DTO page admin.
   */
  async function publishCmsPage(id, payload = {}, adminId) {
    const page = await ensureCmsPageById(id)
    const safeAdminId = sanitizeAdminId(adminId)

    const draftTitle = sanitizeText(page.draft_title, 180)
    if (!draftTitle) {
      throw createHttpError(422, 'Le draft doit contenir un titre avant publication.')
    }

    const draftLayout = sanitizeLayout(page.draft_layout)
    if (draftLayout.length === 0) {
      throw createHttpError(422, 'Le draft doit contenir au moins un bloc avant publication.')
    }

    await page.update({
      status: 'published',
      published_title: draftTitle,
      published_layout: draftLayout,
      published_seo: sanitizeSeo(page.draft_seo || {}),
      published_at: now(),
      published_by_admin_id: safeAdminId,
      updated_by_admin_id: safeAdminId,
    })

    await createRevisionEntry(
      page,
      'published',
      sanitizeText(payload?.change_note, 255, 'Publication de la page'),
      safeAdminId
    )

    return mapCmsPageForAdmin(page)
  }

  /**
   * Depublie une page (non visible publiquement).
   * @param {number|string} id Identifiant page.
   * @param {number|string} [adminId] Admin auteur.
   * @returns {Promise<object>} DTO page admin.
   */
  async function unpublishCmsPage(id, adminId) {
    const page = await ensureCmsPageById(id)
    const safeAdminId = sanitizeAdminId(adminId)

    await page.update({
      status: 'draft',
      updated_by_admin_id: safeAdminId,
    })

    await createRevisionEntry(page, 'draft', 'Depublication de la page', safeAdminId)
    return mapCmsPageForAdmin(page)
  }

  /**
   * Liste les revisions d'une page.
   * @param {number|string} id Identifiant page.
   * @returns {Promise<Array<object>>} Revisions ordonnees.
   */
  async function getCmsPageRevisions(id) {
    const page = await ensureCmsPageById(id)
    if (!revisionRepositoryEnabled) return []

    const revisions = await cmsPageRevisionModel.findAll({
      where: { page_id: page.id },
      order: [
        ['version_number', 'DESC'],
        ['created_at', 'DESC'],
      ],
    })

    return revisions
  }

  /**
   * Rollback une page vers une revision precise.
   * @param {number|string} id Identifiant page.
   * @param {number|string} revisionId Identifiant revision cible.
   * @param {number|string} [adminId] Admin auteur.
   * @returns {Promise<{page: object, revision: object}>} Page restauree + revision source.
   */
  async function rollbackCmsPage(id, revisionId, adminId) {
    if (!revisionRepositoryEnabled) {
      throw createHttpError(422, 'Historique des revisions indisponible.')
    }

    const page = await ensureCmsPageById(id)
    const safeRevisionId = parsePositiveInteger(revisionId)
    if (!safeRevisionId) {
      throw createHttpError(422, 'revisionId invalide.')
    }

    const revision = await cmsPageRevisionModel.findOne({
      where: {
        id: safeRevisionId,
        page_id: page.id,
      },
    })

    if (!revision) {
      throw createHttpError(404, 'Revision introuvable.')
    }

    const snapshot = sanitizeRevisionSnapshot(revision.snapshot)
    if (!snapshot) {
      throw createHttpError(422, 'Snapshot de revision invalide.')
    }

    const safeAdminId = sanitizeAdminId(adminId)
    await page.update({
      ...snapshot,
      updated_by_admin_id: safeAdminId,
    })

    await createRevisionEntry(
      page,
      'rollback',
      `Rollback vers revision #${revision.id}`,
      safeAdminId
    )

    return {
      page: mapCmsPageForAdmin(page),
      revision,
    }
  }

  /**
   * Supprime definitivement une page CMS.
   * @param {number|string} id Identifiant page.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  async function deleteCmsPage(id) {
    const page = await ensureCmsPageById(id)
    await page.destroy()
  }

  /**
   * Liste les pages publiees (API publique).
   * @param {object} [params={}] Parametres de pagination.
   * @param {number|string} [params.limit=50] Taille max.
   * @param {number|string} [params.offset=0] Offset.
   * @returns {Promise<{items:Array<object>,total:number,limit:number,offset:number}>} Resultat pagine.
   */
  async function getAllPublicCmsPages(params = {}) {
    const limit = Math.min(parsePositiveInteger(params.limit) || 50, 100)
    const offset = Math.max(Number(params.offset) || 0, 0)

    const result = await cmsPageModel.findAndCountAll({
      where: { status: 'published' },
      order: [['published_at', 'DESC']],
      limit,
      offset,
    })

    return {
      items: (result.rows || []).map((entry) => mapCmsPageForPublic(entry)),
      total: Number(result.count || 0),
      limit,
      offset,
    }
  }

  /**
   * Retourne une page publiee par slug (API publique).
   * @param {string} slug Slug page.
   * @returns {Promise<object>} DTO page public.
   * @throws {Error} Erreur 404 si non publiee.
   */
  async function getPublicCmsPageBySlug(slug) {
    const safeSlug = sanitizeSlug(slug)
    const page = await cmsPageModel.findOne({
      where: {
        slug: safeSlug,
        status: 'published',
      },
    })

    if (!page) {
      throw createHttpError(404, 'Page publiee introuvable.')
    }

    return mapCmsPageForPublic(page)
  }

  return {
    getAllAdminCmsPages,
    getAdminCmsPageById,
    createCmsPage,
    updateCmsPage,
    publishCmsPage,
    unpublishCmsPage,
    deleteCmsPage,
    getCmsPageRevisions,
    rollbackCmsPage,
    getAllPublicCmsPages,
    getPublicCmsPageBySlug,
  }
}

module.exports = {
  createCmsPageService,
  ...createCmsPageService(),
}
