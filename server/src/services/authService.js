/* Service metier auth : regles applicatives, sessions JWT et 2FA. */
const jwtLib = require('jsonwebtoken')
const { Admin } = require('../models')
const twoFactorServiceLib = require('./twoFactorService')
const { createHttpError } = require('../utils/httpError')

/**
 * Construit le service d'authentification avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.adminModel] Modele admin.
 * @param {object} [deps.jwt] Librairie JWT.
 * @param {NodeJS.ProcessEnv|object} [deps.env] Variables d'environnement.
 * @param {object} [deps.twoFactorService] Service 2FA.
 * @returns {object} API d'authentification.
 */
function createAuthService(deps = {}) {
  const adminModel = deps.adminModel || Admin
  const jwt = deps.jwt || jwtLib
  const env = deps.env || process.env
  const twoFactorService = deps.twoFactorService || twoFactorServiceLib

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
    return jwt.sign({ ...payload, typ: 'access' }, env.JWT_ACCESS_SECRET, {
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
   * @returns {{id:number,username:string,email:string,twoFactorEnabled:boolean}} Profil expose.
   */
  function toPublicUser(admin) {
    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      twoFactorEnabled: admin.two_factor_enabled === true,
    }
  }

  /**
   * Construit le payload de refresh token a partir d'un user public.
   * @param {{id:number,username:string,email:string,twoFactorEnabled:boolean}} user Profil public.
   * @param {number} tokenVersion Version serveur du refresh token.
   * @returns {{id:number,username:string,email:string,twoFactorEnabled:boolean,rtv:number,typ:string}} Payload refresh.
   */
  function toRefreshPayload(user, tokenVersion) {
    return {
      ...user,
      rtv: parseTokenVersion(tokenVersion, 0),
      typ: 'refresh',
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

    if (payload?.typ !== 'refresh') {
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
   * Charge un admin a partir de son id.
   * @param {number} adminId Identifiant admin.
   * @param {{includeTwoFactorSecrets?:boolean}} [options={}] Options de chargement.
   * @returns {Promise<object>} Admin charge.
   * @throws {Error} Erreur 401 si session invalide.
   */
  async function loadAdminOrThrow(adminId, options = {}) {
    const includeTwoFactorSecrets = options.includeTwoFactorSecrets === true
    const model =
      includeTwoFactorSecrets && typeof adminModel.scope === 'function'
        ? adminModel.scope('withTwoFactorSecrets')
        : adminModel

    const admin = await model.findByPk(adminId)
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
   * Genere une session complete (access + refresh) pour un admin.
   * @param {object} admin Instance admin.
   * @returns {{user:object,accessToken:string,refreshToken:string,mfaRequired:boolean}} Session complete.
   */
  function issueSessionForAdmin(admin) {
    const user = toPublicUser(admin)
    const tokenVersion = parseTokenVersion(admin.refresh_token_version, 0)
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(toRefreshPayload(user, tokenVersion))

    return {
      mfaRequired: false,
      user,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Authentifie un administrateur (et demarre eventuellement le challenge 2FA).
   * @param {{email:string,password:string}} credentials Identifiants.
   * @returns {Promise<object>} Session immediate ou challenge MFA.
   * @throws {Error} Erreur 401 si credentials invalides.
   */
  async function loginAdmin({ email, password }) {
    const modelWithPassword =
      typeof adminModel.scope === 'function' ? adminModel.scope('withPassword') : adminModel
    const admin = await modelWithPassword.findOne({ where: { email } })

    if (!admin) {
      throw createHttpError(401, 'Identifiants invalides.')
    }

    const isValid = await admin.comparePassword(password)
    if (!isValid) {
      throw createHttpError(401, 'Identifiants invalides.')
    }

    if (twoFactorService.isTwoFactorEnabled(admin)) {
      const mfaToken = twoFactorService.signLoginChallengeToken({
        adminId: admin.id,
        email: admin.email,
        username: admin.username,
        tokenVersion: parseTokenVersion(admin.refresh_token_version, 0),
      })

      return {
        mfaRequired: true,
        mfaToken,
        user: toPublicUser(admin),
      }
    }

    return issueSessionForAdmin(admin)
  }

  /**
   * Finalise la connexion via challenge 2FA.
   * @param {{mfaToken:string,totpCode?:string,recoveryCode?:string}} payload Donnees de verification.
   * @returns {Promise<object>} Session JWT complete.
   */
  async function verifyTwoFactorLogin({ mfaToken, totpCode, recoveryCode }) {
    const challenge = twoFactorService.verifyLoginChallengeToken(mfaToken)
    const admin = await loadAdminOrThrow(challenge.adminId, { includeTwoFactorSecrets: true })
    const currentVersion = parseTokenVersion(admin.refresh_token_version, 0)

    if (challenge.rtv !== currentVersion) {
      throw createHttpError(401, 'Session invalide.')
    }

    if (!twoFactorService.isTwoFactorEnabled(admin)) {
      throw createHttpError(401, '2FA non active pour ce compte.')
    }

    let isVerified = false
    let usedRecoveryCode = false
    let recoveryCodesRemaining = null

    const normalizedTotpCode = twoFactorService.normalizeTotpCode(totpCode)
    if (normalizedTotpCode) {
      const secret = twoFactorService.decryptTotpSecret(admin.two_factor_secret_encrypted)
      isVerified = twoFactorService.verifyTotpCode({
        secret,
        code: normalizedTotpCode,
      })
    }

    const normalizedRecoveryCode = twoFactorService.normalizeRecoveryCode(recoveryCode)
    if (!isVerified && normalizedRecoveryCode && twoFactorService.recoveryCodesEnabled()) {
      const consumeResult = twoFactorService.consumeRecoveryCode({
        serializedHashes: admin.two_factor_recovery_codes,
        recoveryCode: normalizedRecoveryCode,
      })

      if (consumeResult.valid) {
        await admin.update({
          two_factor_recovery_codes: consumeResult.nextSerialized,
        })
        isVerified = true
        usedRecoveryCode = true
        recoveryCodesRemaining = consumeResult.remaining
      }
    }

    if (!isVerified) {
      throw createHttpError(401, 'Code 2FA invalide.')
    }

    const session = issueSessionForAdmin(admin)
    return {
      ...session,
      usedRecoveryCode,
      recoveryCodesRemaining,
    }
  }

  /**
   * Prepare un setup 2FA (secret + token setup + URL otpauth).
   * @param {number|string} adminId Identifiant admin.
   * @returns {Promise<{setupToken:string,secret:string,otpauthUrl:string}>} Donnees setup.
   */
  async function beginTwoFactorSetup(adminId) {
    const admin = await loadAdminOrThrow(Number(adminId))

    if (twoFactorService.isTwoFactorEnabled(admin)) {
      throw createHttpError(400, 'Le 2FA est deja active.')
    }

    const secret = twoFactorService.generateTotpSecret()
    const setupToken = twoFactorService.signSetupToken({
      adminId: admin.id,
      secret,
    })
    const otpauthUrl = twoFactorService.buildOtpAuthUrl({
      label: admin.email || admin.username || `admin-${admin.id}`,
      secret,
    })

    return {
      setupToken,
      secret,
      otpauthUrl,
    }
  }

  /**
   * Active le 2FA pour un admin apres verification du code TOTP de setup.
   * @param {{adminId:number|string,setupToken:string,totpCode:string}} payload Donnees activation.
   * @returns {Promise<{enabled:boolean,recoveryCodes:string[]}>} Resultat activation.
   */
  async function enableTwoFactorForAdmin({ adminId, setupToken, totpCode }) {
    const setup = twoFactorService.verifySetupToken(setupToken)
    const normalizedAdminId = Number(adminId)
    if (setup.adminId !== normalizedAdminId) {
      throw createHttpError(403, 'Token setup 2FA non autorise pour ce compte.')
    }

    const admin = await loadAdminOrThrow(normalizedAdminId, { includeTwoFactorSecrets: true })
    if (twoFactorService.isTwoFactorEnabled(admin)) {
      throw createHttpError(400, 'Le 2FA est deja active.')
    }

    const isCodeValid = twoFactorService.verifyTotpCode({
      secret: setup.secret,
      code: twoFactorService.normalizeTotpCode(totpCode),
    })
    if (!isCodeValid) {
      throw createHttpError(401, 'Code TOTP invalide.')
    }

    const encryptedSecret = twoFactorService.encryptTotpSecret(setup.secret)
    const recoveryCodes = twoFactorService.recoveryCodesEnabled()
      ? twoFactorService.generateRecoveryCodes()
      : []
    const recoveryHashes = twoFactorService.hashRecoveryCodes(recoveryCodes)

    await admin.update({
      two_factor_enabled: true,
      two_factor_secret_encrypted: encryptedSecret,
      two_factor_recovery_codes: twoFactorService.serializeRecoveryCodeHashes(recoveryHashes),
    })

    await bumpRefreshTokenVersion(admin)

    return {
      enabled: true,
      recoveryCodes,
    }
  }

  /**
   * Retourne l'etat 2FA du compte admin.
   * @param {number|string} adminId Identifiant admin.
   * @returns {Promise<{enabled:boolean,hasRecoveryCodes:boolean,recoveryCodesCount:number}>} Etat 2FA.
   */
  async function getTwoFactorStatus(adminId) {
    const admin = await loadAdminOrThrow(Number(adminId), { includeTwoFactorSecrets: true })
    const hashes = twoFactorService.parseRecoveryCodeHashes(admin.two_factor_recovery_codes)

    return {
      enabled: admin.two_factor_enabled === true,
      hasRecoveryCodes: hashes.length > 0,
      recoveryCodesCount: hashes.length,
    }
  }

  /**
   * Desactive le 2FA apres verification TOTP ou recovery code.
   * @param {{adminId:number|string,totpCode?:string,recoveryCode?:string}} payload Donnees desactivation.
   * @returns {Promise<{enabled:boolean,usedRecoveryCode:boolean}>} Resultat.
   */
  async function disableTwoFactorForAdmin({ adminId, totpCode, recoveryCode }) {
    const admin = await loadAdminOrThrow(Number(adminId), { includeTwoFactorSecrets: true })

    if (!twoFactorService.isTwoFactorEnabled(admin)) {
      return {
        enabled: false,
        usedRecoveryCode: false,
      }
    }

    let verified = false
    let usedRecoveryCode = false
    const normalizedTotpCode = twoFactorService.normalizeTotpCode(totpCode)

    if (normalizedTotpCode) {
      const secret = twoFactorService.decryptTotpSecret(admin.two_factor_secret_encrypted)
      verified = twoFactorService.verifyTotpCode({
        secret,
        code: normalizedTotpCode,
      })
    }

    const normalizedRecoveryCode = twoFactorService.normalizeRecoveryCode(recoveryCode)
    if (!verified && normalizedRecoveryCode && twoFactorService.recoveryCodesEnabled()) {
      const consumeResult = twoFactorService.consumeRecoveryCode({
        serializedHashes: admin.two_factor_recovery_codes,
        recoveryCode: normalizedRecoveryCode,
      })

      if (consumeResult.valid) {
        verified = true
        usedRecoveryCode = true
      }
    }

    if (!verified) {
      throw createHttpError(401, 'Code 2FA invalide.')
    }

    await admin.update({
      two_factor_enabled: false,
      two_factor_secret_encrypted: null,
      two_factor_recovery_codes: null,
    })

    await bumpRefreshTokenVersion(admin)

    return {
      enabled: false,
      usedRecoveryCode,
    }
  }

  /**
   * Regenere les recovery codes (verification TOTP obligatoire).
   * @param {{adminId:number|string,totpCode:string}} payload Donnees regeneration.
   * @returns {Promise<{recoveryCodes:string[]}>} Nouveaux recovery codes en clair.
   */
  async function regenerateTwoFactorRecoveryCodes({ adminId, totpCode }) {
    if (!twoFactorService.recoveryCodesEnabled()) {
      throw createHttpError(400, 'Les recovery codes sont desactives.')
    }

    const admin = await loadAdminOrThrow(Number(adminId), { includeTwoFactorSecrets: true })
    if (!twoFactorService.isTwoFactorEnabled(admin)) {
      throw createHttpError(400, 'Le 2FA doit etre actif pour regenarer les recovery codes.')
    }

    const secret = twoFactorService.decryptTotpSecret(admin.two_factor_secret_encrypted)
    const isCodeValid = twoFactorService.verifyTotpCode({
      secret,
      code: twoFactorService.normalizeTotpCode(totpCode),
    })
    if (!isCodeValid) {
      throw createHttpError(401, 'Code TOTP invalide.')
    }

    const recoveryCodes = twoFactorService.generateRecoveryCodes()
    const recoveryHashes = twoFactorService.hashRecoveryCodes(recoveryCodes)

    await admin.update({
      two_factor_recovery_codes: twoFactorService.serializeRecoveryCodeHashes(recoveryHashes),
    })

    return { recoveryCodes }
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

    if (payload?.typ !== 'refresh') {
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
    verifyTwoFactorLogin,
    beginTwoFactorSetup,
    enableTwoFactorForAdmin,
    disableTwoFactorForAdmin,
    regenerateTwoFactorRecoveryCodes,
    getTwoFactorStatus,
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
