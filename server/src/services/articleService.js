/* Service metier article : regles applicatives et acces donnees. */
const slugifyLib = require('slugify')
const { Article } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

const MAX_IMPORT_ITEMS = 200

/**
 * Convertit une valeur en entier strictement positif.
 * Utilise une valeur de repli si la conversion est invalide.
 * @param {unknown} value Valeur a convertir.
 * @param {number} fallback Valeur par defaut.
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
 * Parse une date importee et retourne null si invalide.
 * @param {unknown} value Valeur source.
 * @returns {Date|null} Date parsee ou null.
 */
function parseDateOrNull(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Convertit un nombre en entier >= 0.
 * @param {unknown} value Valeur source.
 * @param {number} fallback Valeur par defaut.
 * @returns {number} Entier non negatif.
 */
function parseNonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }
  return parsed
}

/**
 * Normalise une liste de tags.
 * @param {unknown} value Valeur source.
 * @returns {Array<string>} Tags nettoyes.
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
 * @param {object} payload Donnees article importees.
 * @param {Function} slugify Fonction de slugification.
 * @returns {string} Slug derive.
 */
function resolveImportedArticleSlug(payload, slugify) {
  const explicitSlug = sanitizeText(payload?.slug, 200)
  if (explicitSlug) {
    return slugify(explicitSlug, { lower: true, strict: true })
  }
  const title = sanitizeText(payload?.title, 200)
  return slugify(title, { lower: true, strict: true })
}

/**
 * Normalise le contenu article importe.
 * Accepte:
 * - content string
 * - content object/array (serialize JSON)
 * - blocks array (serialize { blocks })
 * @param {unknown} content Contenu brut.
 * @param {unknown} blocks Tableau de blocs optionnel.
 * @returns {string} Contenu serialise.
 */
function resolveImportedArticleContent(content, blocks) {
  if (Array.isArray(blocks)) {
    return JSON.stringify({ blocks })
  }

  if (typeof content === 'string') {
    return content.trim()
  }

  if (content && typeof content === 'object') {
    return JSON.stringify(content)
  }

  if (content === undefined || content === null) {
    return ''
  }

  return String(content).trim()
}

/**
 * Extrait les articles candidats depuis un payload d'import.
 * Accepte:
 * - { articles: [...] }
 * - [...]
 * - { title, ... } (article unique)
 * @param {unknown} payload Payload brut.
 * @returns {Array<object>} Collection candidate.
 */
function resolveArticlesToImport(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.articles)) return payload.articles
  if (payload.title !== undefined || payload.slug !== undefined) return [payload]
  return []
}

/**
 * Construit une instance du service article avec dependances injectables.
 * @param {object} [deps={}] Dependances externes surchargeables pour tests/DI.
 * @param {object} [deps.articleModel] Modele Sequelize article.
 * @param {Function} [deps.slugify] Fonction de generation de slug.
 * @param {Function} [deps.now] Fabrique de date courante.
 * @returns {object} API du service article.
 */
function createArticleService(deps = {}) {
  const articleModel = deps.articleModel || Article
  const slugify = deps.slugify || slugifyLib
  const now = deps.now || (() => new Date())

  /**
   * Liste les articles publies avec pagination.
   * @param {object} params Parametres de pagination.
   * @param {string|number|undefined} params.page Numero de page.
   * @param {string|number|undefined} params.limit Taille de page.
   * @returns {Promise<{data: Array, pagination: {total:number,page:number,limit:number,pages:number}}>} Resultat pagine.
   */
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

  /**
   * Recherche un article publie par slug.
   * @param {string} slug Slug de l'article.
   * @returns {Promise<object>} Article trouve.
   * @throws {Error} Erreur 404 si article inexistant.
   */
  async function getPublicArticleBySlug(slug) {
    const article = await articleModel.findOne({
      where: { slug, published: true },
    })

    if (!article) {
      throw createHttpError(404, 'Article introuvable.')
    }

    return article
  }

  /**
   * Ajoute un like a un article public par slug.
   * @param {string} slug Slug article public.
   * @returns {Promise<{slug:string,likes:number}>} Compteur likes mis a jour.
   * @throws {Error} Erreur 404 si article introuvable.
   */
  async function likeArticleBySlug(slug) {
    const article = await getPublicArticleBySlug(slug)
    await article.increment('likes', { by: 1 })
    await article.reload()

    return {
      slug: article.slug,
      likes: Number.parseInt(String(article.likes ?? 0), 10) || 0,
    }
  }

  /**
   * Retire un like a un article public par slug (sans descendre sous 0).
   * @param {string} slug Slug article public.
   * @returns {Promise<{slug:string,likes:number}>} Compteur likes mis a jour.
   * @throws {Error} Erreur 404 si article introuvable.
   */
  async function unlikeArticleBySlug(slug) {
    const article = await getPublicArticleBySlug(slug)
    const currentLikes = Number.parseInt(String(article.likes ?? 0), 10) || 0

    if (currentLikes <= 0) {
      return {
        slug: article.slug,
        likes: 0,
      }
    }

    await article.decrement('likes', { by: 1 })
    await article.reload()

    let nextLikes = Number.parseInt(String(article.likes ?? 0), 10) || 0
    if (nextLikes < 0) {
      await article.update({ likes: 0 })
      nextLikes = 0
    }

    return {
      slug: article.slug,
      likes: nextLikes,
    }
  }

  /**
   * Recupere tous les articles pour l'administration.
   * @returns {Promise<Array>} Liste complete des articles.
   */
  async function getAllAdminArticles(params = {}) {
    const { limit, offset } = resolveLimitOffsetPagination(params, {
      defaultLimit: 20,
      maxLimit: 200,
    })

    const result = await articleModel.findAndCountAll({
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
   * Recupere un article admin par identifiant.
   * @param {number|string} id Identifiant article.
   * @returns {Promise<object>} Article trouve.
   * @throws {Error} Erreur 404 si article introuvable.
   */
  async function getAdminArticleById(id) {
    const article = await articleModel.findByPk(id)
    if (!article) {
      throw createHttpError(404, 'Article introuvable.')
    }
    return article
  }

  /**
   * Cree un article en appliquant les regles metier (slug, publication).
   * @param {object} payload Donnees article valides.
   * @returns {Promise<object>} Article cree.
   */
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

  /**
   * Met a jour un article existant et regenere le slug si le titre change.
   * @param {number|string} id Identifiant article.
   * @param {object} payload Champs a mettre a jour.
   * @returns {Promise<object>} Article mis a jour.
   * @throws {Error} Erreur 404 si article inexistant.
   */
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

  /**
   * Supprime un article existant.
   * @param {number|string} id Identifiant article.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si article inexistant.
   */
  async function deleteArticle(id) {
    const article = await articleModel.findByPk(id)

    if (!article) {
      throw createHttpError(404, 'Article introuvable.')
    }

    await article.destroy()
  }

  /**
   * Importe un lot d'articles JSON.
   * Si `replaceExisting=true`, met a jour les doublons (match slug ou titre).
   * Sinon, les doublons sont ignores.
   * @param {object|Array<object>} payload Payload d'import.
   * @returns {Promise<{created:number,updated:number,skippedCount:number,skipped:Array<object>,items:Array<object>}>} Resume import.
   * @throws {Error} Erreur 422 si payload invalide ou import sans effet.
   */
  async function importArticles(payload) {
    const candidates = resolveArticlesToImport(payload)
    if (candidates.length === 0) {
      throw createHttpError(422, "Aucun article a importer. Format attendu: { articles: [...] }.")
    }
    if (candidates.length > MAX_IMPORT_ITEMS) {
      throw createHttpError(422, `L'import est limite a ${MAX_IMPORT_ITEMS} articles par operation.`)
    }

    const replaceExisting = toBoolean(payload?.replaceExisting, false)
    let created = 0
    let updated = 0
    const skipped = []
    const items = []

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index]
      const title = sanitizeText(candidate?.title, 200)
      if (!title) {
        skipped.push({ index, reason: 'Titre manquant.' })
        continue
      }

      const content = resolveImportedArticleContent(candidate?.content, candidate?.blocks)
      if (!content) {
        skipped.push({ index, title, reason: 'Contenu manquant.' })
        continue
      }

      const slugCandidate = resolveImportedArticleSlug(candidate, slugify)
      if (!slugCandidate) {
        skipped.push({ index, title, reason: 'Slug invalide.' })
        continue
      }

      const hasExplicitSlug = Boolean(sanitizeText(candidate?.slug, 200))
      const published = toBoolean(candidate?.published, false)
      const importedPublishedAt = parseDateOrNull(candidate?.published_at)
      const normalizedArticle = {
        title,
        slug: slugCandidate,
        excerpt: sanitizeText(candidate?.excerpt, 20000, ''),
        content,
        cover_image: sanitizeText(candidate?.cover_image, 255, ''),
        likes: parseNonNegativeInt(candidate?.likes, 0),
        tags: sanitizeTags(candidate?.tags),
        published,
        published_at: published ? (importedPublishedAt || now()) : null,
      }

      let existing = await articleModel.findOne({ where: { slug: normalizedArticle.slug } })
      if (!existing && !hasExplicitSlug) {
        existing = await articleModel.findOne({ where: { title: normalizedArticle.title } })
      }

      if (existing) {
        if (!replaceExisting) {
          skipped.push({ index, title: normalizedArticle.title, reason: 'Article deja existant.' })
          continue
        }

        const updates = {
          title: normalizedArticle.title,
          excerpt: normalizedArticle.excerpt,
          content: normalizedArticle.content,
          cover_image: normalizedArticle.cover_image,
          likes: normalizedArticle.likes,
          tags: normalizedArticle.tags,
          published: normalizedArticle.published,
          published_at: normalizedArticle.published ? normalizedArticle.published_at : null,
        }

        if (hasExplicitSlug && normalizedArticle.slug !== existing.slug) {
          const slugConflict = await articleModel.findOne({ where: { slug: normalizedArticle.slug } })
          const conflictId = Number.parseInt(String(slugConflict?.id ?? ''), 10)
          const existingId = Number.parseInt(String(existing.id), 10)
          if (slugConflict && conflictId !== existingId) {
            skipped.push({
              index,
              title: normalizedArticle.title,
              reason: `Slug deja utilise: ${normalizedArticle.slug}.`,
            })
            continue
          }
          updates.slug = normalizedArticle.slug
        }

        await existing.update(updates)
        updated += 1
        items.push(existing)
        continue
      }

      const createdArticle = await articleModel.create(normalizedArticle)
      created += 1
      items.push(createdArticle)
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
    getAllPublicArticles,
    getPublicArticleBySlug,
    likeArticleBySlug,
    unlikeArticleBySlug,
    getAllAdminArticles,
    getAdminArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    importArticles,
  }
}

module.exports = {
  createArticleService,
  ...createArticleService(),
}
