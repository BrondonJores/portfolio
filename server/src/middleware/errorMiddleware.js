/* Middleware de gestion globale des erreurs Express */

/**
 * Intercepte toutes les erreurs non gerees dans l'application.
 * Ne retourne jamais de details en production.
 */
function errorHandler(err, req, res, next) {
  /* Journalisation de l'erreur en developpement */
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }

  const statusCode = err.statusCode || 500

  if (process.env.NODE_ENV === 'production') {
    return res.status(statusCode).json({ error: 'Une erreur interne est survenue.' })
  }

  return res.status(statusCode).json({
    error: err.message || 'Une erreur interne est survenue.',
    stack: err.stack,
  })
}

module.exports = { errorHandler }
