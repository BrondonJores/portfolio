/* Service metier article : regles applicatives et acces donnees. */
const slugifyLib = require('slugify')
const { Article } = require('../models')
const { createHttpError } = require('../utils/httpError')

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
  async function getAllAdminArticles() {
    return articleModel.findAll({ order: [['created_at', 'DESC']] })
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

  return {
    getAllPublicArticles,
    getPublicArticleBySlug,
    likeArticleBySlug,
    unlikeArticleBySlug,
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
