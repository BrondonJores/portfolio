/* Controleur HTTP du marketplace de themes. */
const {
  listMarketplaceThemes,
  importMarketplaceTheme,
} = require('../services/themeMarketplaceService')

/**
 * Liste publique des themes du marketplace.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAllPublic(req, res, next) {
  try {
    const data = await listMarketplaceThemes({
      q: req.query.q,
      category: req.query.category,
    })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Liste admin des themes marketplace.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAllAdmin(req, res, next) {
  try {
    const data = await listMarketplaceThemes({
      q: req.query.q,
      category: req.query.category,
    })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Importe un theme marketplace vers les presets de theme.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware erreur.
 * @returns {Promise<void>} Promise resolue apres import.
 */
async function importFromMarketplace(req, res, next) {
  try {
    const data = await importMarketplaceTheme({
      slug: req.params.slug,
      replaceExisting: req.body?.replaceExisting,
      applyAfterImport: req.body?.applyAfterImport,
    })
    return res.status(200).json({ data })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAllPublic,
  getAllAdmin,
  importFromMarketplace,
}
