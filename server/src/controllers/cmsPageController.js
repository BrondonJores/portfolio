/* Controleur HTTP des pages CMS (admin + public). */
const {
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
} = require('../services/cmsPageService')

/**
 * Liste admin des pages CMS (paginee, filtrable).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAllAdmin(req, res, next) {
  try {
    const data = await getAllAdminCmsPages({
      status: req.query.status,
      q: req.query.q,
      limit: req.query.limit,
      offset: req.query.offset,
    })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Retourne le detail admin d'une page CMS.
 * @param {import('express').Request} req Requete HTTP avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getByIdAdmin(req, res, next) {
  try {
    const data = await getAdminCmsPageById(req.params.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree une nouvelle page CMS.
 * @param {import('express').Request} req Requete HTTP avec payload.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const data = await createCmsPage(req.body, req.user?.id)
    return res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour le draft d'une page CMS.
 * @param {import('express').Request} req Requete HTTP avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres update.
 */
async function update(req, res, next) {
  try {
    const data = await updateCmsPage(req.params.id, req.body, req.user?.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Publie une page CMS.
 * @param {import('express').Request} req Requete HTTP avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres publication.
 */
async function publish(req, res, next) {
  try {
    const data = await publishCmsPage(req.params.id, req.body, req.user?.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Depublie une page CMS.
 * @param {import('express').Request} req Requete HTTP avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres depub.
 */
async function unpublish(req, res, next) {
  try {
    const data = await unpublishCmsPage(req.params.id, req.user?.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime une page CMS.
 * @param {import('express').Request} req Requete HTTP avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteCmsPage(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

/**
 * Liste les revisions d'une page CMS.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function listRevisions(req, res, next) {
  try {
    const data = await getCmsPageRevisions(req.params.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Rollback une page CMS vers une revision cible.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres rollback.
 */
async function rollback(req, res, next) {
  try {
    const data = await rollbackCmsPage(req.params.id, req.body?.revisionId, req.user?.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Liste publique des pages publiees.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAllPublic(req, res, next) {
  try {
    const data = await getAllPublicCmsPages({
      limit: req.query.limit,
      offset: req.query.offset,
    })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Retourne une page publique par slug.
 * @param {import('express').Request} req Requete HTTP avec `params.slug`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getBySlugPublic(req, res, next) {
  try {
    const data = await getPublicCmsPageBySlug(req.params.slug)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAllAdmin,
  getByIdAdmin,
  create,
  update,
  publish,
  unpublish,
  remove,
  listRevisions,
  rollback,
  getAllPublic,
  getBySlugPublic,
}
