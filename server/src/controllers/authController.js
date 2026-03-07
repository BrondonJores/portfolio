/* Controleur HTTP auth : delegue le metier au service associe. */
const {
  loginAdmin,
  refreshAccessToken,
  getRefreshCookieOptions,
} = require('../services/authService')

/**
 * Authentifie un administrateur et pose le refresh token en cookie HTTP-only.
 * Retourne egalement un access token pour les appels API immediats.
 * @param {import('express').Request} req Requete contenant email/mot de passe.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi des tokens.
 */
async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await loginAdmin(req.body)

    res.cookie('refresh_token', refreshToken, getRefreshCookieOptions())
    return res.json({ accessToken, user })
  } catch (err) {
    next(err)
  }
}

/**
 * Renouvelle un access token a partir du refresh token stocke en cookie.
 * @param {import('express').Request} req Requete contenant `cookies.refresh_token`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du nouvel access token.
 */
async function refresh(req, res, next) {
  try {
    const result = refreshAccessToken(req.cookies.refresh_token)
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Deconnecte l'utilisateur en supprimant le cookie de refresh token.
 * @param {import('express').Request} req Requete HTTP (non utilisee).
 * @param {import('express').Response} res Reponse HTTP.
 * @returns {import('express').Response} Reponse JSON de confirmation.
 */
function logout(req, res) {
  res.clearCookie('refresh_token', getRefreshCookieOptions())
  return res.json({ message: 'Deconnexion reussie.' })
}

/**
 * Retourne le profil de l'utilisateur authentifie (injecte par middleware JWT).
 * @param {import('express').Request} req Requete enrichie avec `req.user`.
 * @param {import('express').Response} res Reponse HTTP.
 * @returns {import('express').Response} Reponse JSON contenant l'utilisateur courant.
 */
function me(req, res) {
  return res.json({ user: req.user })
}

module.exports = { login, refresh, logout, me }
