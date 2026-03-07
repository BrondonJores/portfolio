/* Controleur HTTP sitemap : delegue la construction XML au service dedie. */
const { getSitemapPayload } = require('../services/sitemapService')

/**
 * Reconstruit une origine HTTP depuis la requete courante.
 * @param {import('express').Request} req Requete HTTP.
 * @returns {string} Origine HTTP deduite (ex: https://domaine.com).
 */
function getRequestOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()

  const protocol = forwardedProto || req.protocol || 'https'
  const host = req.get('host')
  if (!host) {
    return ''
  }

  return `${protocol}://${host}`
}

/**
 * Retourne le sitemap XML (public).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du XML.
 */
async function getSitemapXml(req, res, next) {
  try {
    const { xml } = await getSitemapPayload({
      requestOrigin: getRequestOrigin(req),
    })

    res.set('Content-Type', 'application/xml; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=900, s-maxage=900')
    return res.status(200).send(xml)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getSitemapXml,
}
