/* Service metier auth : regles applicatives et acces donnees. */
const jwtLib = require('jsonwebtoken')
const { Admin } = require('../models')
const { createHttpError } = require('../utils/httpError')

/**
 * Construit le service d'authentification avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.adminModel] Modele admin.
 * @param {object} [deps.jwt] Librairie JWT.
 * @param {NodeJS.ProcessEnv|object} [deps.env] Variables d'environnement a utiliser.
 * @returns {object} API d'authentification.
 */
function createAuthService(deps = {}) {
  const adminModel = deps.adminModel || Admin
  const jwt = deps.jwt || jwtLib
  const env = deps.env || process.env

  /**
   * Signe un access token JWT.
   * @param {object} payload Donnees utilisateur.
   * @returns {string} Token JWT court.
   */
  function generateAccessToken(payload) {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES || '15m',
    })
  }

  /**
   * Signe un refresh token JWT.
   * @param {object} payload Donnees utilisateur.
   * @returns {string} Token JWT longue duree.
   */
  function generateRefreshToken(payload) {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES || '7d',
    })
  }

  /**
   * Retourne la configuration standard du cookie refresh token.
   * @returns {{httpOnly:boolean,secure:boolean,sameSite:string,maxAge:number,path:string}} Options cookie.
   */
  function getRefreshCookieOptions() {
    const isProd = env.NODE_ENV === 'production'

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    }
  }

  /**
   * Extrait les champs publics d'un enregistrement admin.
   * @param {object} admin Instance admin.
   * @returns {{id:number,username:string,email:string}} Profil expose au client.
   */
  function toPublicUser(admin) {
    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    }
  }

  /**
   * Authentifie un administrateur et genere les tokens.
   * @param {{email:string,password:string}} credentials Identifiants de connexion.
   * @returns {Promise<{user:object,accessToken:string,refreshToken:string}>} Donnees de session.
   * @throws {Error} Erreur 401 si credentials invalides.
   */
  async function loginAdmin({ email, password }) {
    const admin = await adminModel.scope('withPassword').findOne({ where: { email } })

    if (!admin) {
      throw createHttpError(401, 'Identifiants invalides.')
    }

    const isValid = await admin.comparePassword(password)
    if (!isValid) {
      throw createHttpError(401, 'Identifiants invalides.')
    }

    const user = toPublicUser(admin)
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    return { user, accessToken, refreshToken }
  }

  /**
   * Regenerer un access token a partir d'un refresh token.
   * @param {string|undefined} refreshToken Refresh token recu du cookie.
   * @returns {{accessToken:string}} Nouveau token d'acces.
   * @throws {Error} Erreur 401 si token absent/invalide.
   */
  function refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw createHttpError(401, 'Refresh token manquant.')
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET)
    } catch {
      throw createHttpError(401, 'Refresh token invalide ou expire.')
    }

    const accessToken = generateAccessToken({
      id: payload.id,
      username: payload.username,
      email: payload.email,
    })

    return { accessToken }
  }

  return {
    loginAdmin,
    refreshAccessToken,
    getRefreshCookieOptions,
  }
}

module.exports = {
  createAuthService,
  ...createAuthService(),
}
