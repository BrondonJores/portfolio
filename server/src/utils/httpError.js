/* Utilitaire commun pour creer des erreurs HTTP metier. */
/**
 * Cree une erreur standardisee avec code HTTP et details optionnels.
 * @param {number} statusCode Code HTTP a propager a l'error middleware.
 * @param {string} message Message lisible associe a l'erreur.
 * @param {unknown} [details] Details techniques optionnels.
 * @returns {Error & {statusCode:number,details?:unknown}} Erreur enrichie.
 */
function createHttpError(statusCode, message, details) {
  const error = new Error(message)
  error.statusCode = statusCode

  if (details !== undefined) {
    error.details = details
  }

  return error
}

module.exports = { createHttpError }
