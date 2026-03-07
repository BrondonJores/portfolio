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
   * Parse une version de refresh token vers un entier >= 0.
   * @param {unknown} value Valeur brute.
   * @param {number} [fallback=0] Valeur de repli.
   * @returns {number} Version normalisee.
   */
  function parseTokenVersion(value, fallback = 0) {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed
    }
    return fallback
  }

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
   * Verifie et normalise un refresh token.
   * @param {string|undefined} refreshToken Token recu du cookie HTTP-only.
   * @returns {{id:number,username:string,email:string,rtv:number}} Payload valide.
   * @throws {Error} Erreur 401 si token absent/invalide.
   */
  function verifyRefreshToken(refreshToken) {
    if (!refreshToken) {
      throw createHttpError(401, 'Refresh token manquant.')
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET)
    } catch {
      throw createHttpError(401, 'Refresh token invalide ou expire.')
    }

    const id = Number(payload?.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw createHttpError(401, 'Refresh token invalide ou expire.')
    }

    return {
      id,
      username: payload?.username || '',
      email: payload?.email || '',
      rtv: parseTokenVersion(payload?.rtv, 0),
    }
  }

  /**
   * Construit le payload de refresh token a partir d'un user public.
   * @param {{id:number,username:string,email:string}} user Profil public.
   * @param {number} tokenVersion Version serveur du refresh token.
   * @returns {{id:number,username:string,email:string,rtv:number,typ:string}} Payload JWT refresh.
   */
  function toRefreshPayload(user, tokenVersion) {
    return {
      ...user,
      rtv: parseTokenVersion(tokenVersion, 0),
      typ: 'refresh',
    }
  }

  /**
   * Charge un admin a partir de son id.
   * @param {number} adminId Identifiant admin.
   * @returns {Promise<object>} Admin charge.
   * @throws {Error} Erreur 401 si session invalide.
   */
  async function loadAdminOrThrow(adminId) {
    const admin = await adminModel.findByPk(adminId)
    if (!admin) {
      throw createHttpError(401, 'Session invalide.')
    }
    return admin
  }

  /**
   * Incremente la version refresh token en base.
   * @param {object} admin Instance admin Sequelize.
   * @returns {Promise<number>} Nouvelle version courante.
   */
  async function bumpRefreshTokenVersion(admin) {
    await admin.increment('refresh_token_version', { by: 1 })
    if (typeof admin.reload === 'function') {
      await admin.reload()
    }
    return parseTokenVersion(admin.refresh_token_version, 0)
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
    const tokenVersion = parseTokenVersion(admin.refresh_token_version, 0)
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(toRefreshPayload(user, tokenVersion))

    return { user, accessToken, refreshToken }
  }

  /**
   * Regenere une session complete a partir d'un refresh token.
   * Le refresh token est systematiquement rotate.
   * @param {string|undefined} refreshToken Refresh token recu du cookie.
   * @returns {Promise<{user:object,accessToken:string,refreshToken:string}>} Nouvelle session.
   * @throws {Error} Erreur 401 si token absent/invalide/revoque.
   */
  async function refreshAdminSession(refreshToken) {
    const payload = verifyRefreshToken(refreshToken)
    const admin = await loadAdminOrThrow(payload.id)
    const currentVersion = parseTokenVersion(admin.refresh_token_version, 0)

    if (payload.rtv !== currentVersion) {
      throw createHttpError(401, 'Session invalide.')
    }

    const nextVersion = await bumpRefreshTokenVersion(admin)
    const user = toPublicUser(admin)
    const accessToken = generateAccessToken(user)
    const nextRefreshToken = generateRefreshToken(toRefreshPayload(user, nextVersion))

    return {
      user,
      accessToken,
      refreshToken: nextRefreshToken,
    }
  }

  /**
   * Revoque la chaine de refresh token associee au cookie courant.
   * L'operation est silencieuse pour conserver un logout idempotent.
   * @param {string|undefined} refreshToken Refresh token a invalider.
   * @returns {Promise<{revoked:boolean}>} Indicateur de revocation effective.
   */
  async function logoutAdminSession(refreshToken) {
    if (!refreshToken) {
      return { revoked: false }
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET)
    } catch {
      return { revoked: false }
    }

    const adminId = Number(payload?.id)
    if (!Number.isInteger(adminId) || adminId <= 0) {
      return { revoked: false }
    }

    const admin = await adminModel.findByPk(adminId)
    if (!admin) {
      return { revoked: false }
    }

    const tokenVersion = parseTokenVersion(payload?.rtv, -1)
    const currentVersion = parseTokenVersion(admin.refresh_token_version, 0)
    if (tokenVersion !== currentVersion) {
      return { revoked: false }
    }

    await bumpRefreshTokenVersion(admin)
    return { revoked: true }
  }

  return {
    loginAdmin,
    refreshAdminSession,
    refreshAccessToken: refreshAdminSession,
    logoutAdminSession,
    getRefreshCookieOptions,
  }
}

module.exports = {
  createAuthService,
  ...createAuthService(),
}
