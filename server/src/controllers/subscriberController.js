/* Controleur HTTP subscriber : delegue le metier au service associe. */
const {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getAllSubscribers,
  deleteSubscriber,
} = require('../services/subscriberService')

/**
 * Construit la page HTML de confirmation de desinscription.
 * @param {string} token Token de desinscription courant.
 * @returns {string} HTML complet de la page.
 */
function buildUnsubscribeConfirmHtml(token) {
  const safeToken = encodeURIComponent(token)
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Confirmer la desinscription</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1220;color:#e5e7eb;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;"><main style="max-width:520px;width:100%;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px;"><h1 style="margin:0 0 12px;font-size:1.35rem;">Confirmer la desinscription</h1><p style="margin:0 0 24px;line-height:1.5;color:#9ca3af;">Cliquez sur le bouton ci-dessous pour confirmer que vous souhaitez vous desinscrire de la newsletter.</p><form method="POST" action="/api/unsubscribe/${safeToken}"><button type="submit" style="border:0;border-radius:10px;padding:12px 18px;background:#ef4444;color:#fff;font-weight:600;cursor:pointer;">Confirmer la desinscription</button></form></main></body></html>`
}

/**
 * Construit la page HTML de confirmation finale.
 * @returns {string} HTML complet de succes.
 */
function buildUnsubscribeDoneHtml() {
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Desabonnement</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1220;color:#e5e7eb;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;"><main style="max-width:520px;width:100%;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px;"><h1 style="margin:0 0 12px;font-size:1.35rem;">Vous avez ete desabonne(e)</h1><p style="margin:0;line-height:1.5;color:#9ca3af;">Vous ne recevrez plus nos newsletters.</p></main></body></html>'
}

/**
 * Abonne un email a la newsletter.
 * Retourne 201 a la creation, 200 si deja inscrit (comportement volontaire).
 * @param {import('express').Request} req Requete contenant `body.email`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse.
 */
async function subscribe(req, res, next) {
  try {
    const result = await subscribeToNewsletter(req.body.email)
    const status = result.alreadySubscribed ? 200 : 201
    return res.status(status).json({ data: { message: result.message } })
  } catch (err) {
    next(err)
  }
}

/**
 * Affiche une page de confirmation avant desinscription.
 * @param {import('express').Request} req Requete contenant `params.token`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du HTML.
 */
async function showUnsubscribeConfirmation(req, res, next) {
  try {
    const token = String(req.params.token || '')
    return res.send(buildUnsubscribeConfirmHtml(token))
  } catch (err) {
    next(err)
  }
}

/**
 * Desabonne un utilisateur via son token de desinscription.
 * @param {import('express').Request} req Requete contenant `params.token`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du HTML final.
 */
async function unsubscribe(req, res, next) {
  try {
    await unsubscribeFromNewsletter(req.params.token)
    return res.send(buildUnsubscribeDoneHtml())
  } catch (err) {
    next(err)
  }
}

/**
 * Liste tous les abonnes newsletter (admin).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de la liste.
 */
async function getAll(req, res, next) {
  try {
    const subscribers = await getAllSubscribers()
    return res.json({ data: subscribers })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un abonne par identifiant.
 * @param {import('express').Request} req Requete contenant `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteSubscriber(req.params.id)
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

module.exports = { subscribe, showUnsubscribeConfirmation, unsubscribe, getAll, remove }
