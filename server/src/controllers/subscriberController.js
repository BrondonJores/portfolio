/* Controleur HTTP subscriber : delegue le metier au service associe. */
const {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getAllSubscribers,
  deleteSubscriber,
} = require('../services/subscriberService')

/**
 * Echappe une valeur pour insertion dans un attribut HTML.
 * @param {string} value Valeur brute.
 * @returns {string} Valeur echappee.
 */
function escapeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Construit la page HTML de confirmation de desinscription.
 * Le token est recupere depuis le fragment URL (#token) pour limiter sa presence
 * dans les logs serveur/referers. Le mode legacy `/unsubscribe/:token` reste supporte.
 * @param {string} [token=''] Token pre-rempli (mode legacy).
 * @returns {string} HTML complet de la page.
 */
function buildUnsubscribeConfirmHtml(token = '') {
  const safeToken = escapeHtmlAttribute(token)
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Confirmer la desinscription</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1220;color:#e5e7eb;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;"><main style="max-width:520px;width:100%;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px;"><h1 style="margin:0 0 12px;font-size:1.35rem;">Confirmer la desinscription</h1><p id="unsubscribe-status" style="margin:0 0 24px;line-height:1.5;color:#9ca3af;">Cliquez sur le bouton ci-dessous pour confirmer que vous souhaitez vous desinscrire de la newsletter.</p><form id="unsubscribe-form" method="POST" action="/api/unsubscribe"><input type="hidden" name="token" id="unsubscribe-token" value="${safeToken}" /><button id="unsubscribe-submit" type="submit" style="border:0;border-radius:10px;padding:12px 18px;background:#ef4444;color:#fff;font-weight:600;cursor:pointer;">Confirmer la desinscription</button></form></main><script>(function(){const input=document.getElementById('unsubscribe-token');const submit=document.getElementById('unsubscribe-submit');const status=document.getElementById('unsubscribe-status');if(!input||!submit||!status){return;}const params=new URLSearchParams(window.location.search);const hashToken=String(window.location.hash||'').replace(/^#/,'').trim();const queryToken=String(params.get('token')||'').trim();const token=hashToken||queryToken||String(input.value||'').trim();input.value=token;if(token){status.textContent='Cliquez sur le bouton pour confirmer la desinscription.';}else{submit.disabled=true;submit.style.opacity='0.6';submit.style.cursor='not-allowed';status.textContent='Lien de desinscription invalide ou incomplet.';status.style.color='#fca5a5';}if(window.history&&typeof window.history.replaceState==='function'){window.history.replaceState({},'', '/api/unsubscribe');}})();</script></body></html>`
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
 * @param {import('express').Request} req Requete contenant `params.token` (legacy) ou hash.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du HTML.
 */
async function showUnsubscribeConfirmation(req, res, next) {
  try {
    const token = String(req.params.token || req.query.token || '')
    return res.send(buildUnsubscribeConfirmHtml(token))
  } catch (err) {
    next(err)
  }
}

/**
 * Desabonne un utilisateur via son token de desinscription.
 * @param {import('express').Request} req Requete contenant `body.token` (ou `params.token` legacy).
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du HTML final.
 */
async function unsubscribe(req, res, next) {
  try {
    const token = req.body?.token || req.params.token || req.query.token
    await unsubscribeFromNewsletter(token)
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
    const subscribers = await getAllSubscribers({
      limit: req.query.limit,
      offset: req.query.offset,
    })
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
