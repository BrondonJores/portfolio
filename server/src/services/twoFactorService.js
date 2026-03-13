/* Service 2FA TOTP: setup, challenge login, chiffrement secret, recovery codes. */
const cryptoLib = require('crypto')
const jwtLib = require('jsonwebtoken')
const { createHttpError } = require('../utils/httpError')
const totpServiceLib = require('./totpService')

/**
 * Parse une valeur entiere positive.
 * @param {unknown} value Valeur brute.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier normalise.
 */
function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Parse une valeur boolenne env (`true`, `1`, `yes`, `on`).
 * @param {unknown} value Valeur brute.
 * @param {boolean} fallback Valeur de repli.
 * @returns {boolean} Booleen normalise.
 */
function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

/**
 * Construit le service 2FA avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.crypto] API crypto.
 * @param {object} [deps.jwt] API jwt.
 * @param {NodeJS.ProcessEnv|object} [deps.env] Variables d'environnement.
 * @param {object} [deps.totp] Service TOTP.
 * @returns {object} API 2FA.
 */
function createTwoFactorService(deps = {}) {
  const crypto = deps.crypto || cryptoLib
  const jwt = deps.jwt || jwtLib
  const env = deps.env || process.env
  const totp = deps.totp || totpServiceLib

  /**
   * Retourne la cle JWT pour tokens 2FA.
   * @returns {string} Secret JWT.
   * @throws {Error} Erreur 500 si secret indisponible.
   */
  function getTwoFactorJwtSecret() {
    const secret = String(env.JWT_MFA_SECRET || '').trim()

    if (!secret) {
      throw createHttpError(500, 'Configuration JWT MFA manquante.')
    }

    return secret
  }

  /**
   * Retourne la cle de chiffrement des secrets TOTP.
   * @returns {Buffer} Cle AES 256 bits.
   * @throws {Error} Erreur 500 si la configuration est invalide.
   */
  function getEncryptionKey() {
    const raw = String(env.MFA_ENCRYPTION_KEY || '').trim()

    if (!raw) {
      throw createHttpError(500, 'Configuration de chiffrement MFA manquante.')
    }

    return crypto.createHash('sha256').update(raw).digest()
  }

  /**
   * Retourne le pepper pour hash des recovery codes.
   * @returns {string} Pepper de hash.
   */
  function getRecoveryPepper() {
    const pepper = String(env.MFA_RECOVERY_PEPPER || '').trim()
    if (!pepper) {
      throw createHttpError(500, 'Configuration du pepper MFA manquante.')
    }
    return pepper
  }

  /**
   * Normalise un code TOTP (6 digits).
   * @param {unknown} code Code brut.
   * @returns {string} Code normalise.
   */
  function normalizeTotpCode(code) {
    return String(code || '').replace(/\s+/g, '')
  }

  /**
   * Normalise un recovery code (alnum uppercase).
   * @param {unknown} code Code brut.
   * @returns {string} Code normalise.
   */
  function normalizeRecoveryCode(code) {
    return String(code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
  }

  /**
   * Chiffre un secret TOTP avec AES-256-GCM.
   * @param {string} secret Secret TOTP en clair.
   * @returns {string} Payload chiffre `iv.tag.ciphertext`.
   */
  function encryptTotpSecret(secret) {
    const iv = crypto.randomBytes(12)
    const key = getEncryptionKey()
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(String(secret || ''), 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
  }

  /**
   * Dechiffre un secret TOTP stocke.
   * @param {string} payload Payload chiffre `iv.tag.ciphertext`.
   * @returns {string} Secret TOTP en clair.
   * @throws {Error} Erreur 500 si payload/cle invalides.
   */
  function decryptTotpSecret(payload) {
    try {
      const [ivPart, tagPart, cipherPart] = String(payload || '').split('.')
      if (!ivPart || !tagPart || !cipherPart) {
        throw new Error('Invalid encrypted payload')
      }

      const iv = Buffer.from(ivPart, 'base64url')
      const tag = Buffer.from(tagPart, 'base64url')
      const ciphertext = Buffer.from(cipherPart, 'base64url')
      const key = getEncryptionKey()
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      throw createHttpError(500, 'Impossible de dechiffrer le secret 2FA.')
    }
  }

  /**
   * Determine si 2FA est active pour un admin.
   * @param {object} admin Instance admin.
   * @returns {boolean} true si active.
   */
  function isTwoFactorEnabled(admin) {
    return admin?.two_factor_enabled === true
  }

  /**
   * Signe un token de challenge MFA pour la 2eme etape login.
   * @param {{adminId:number,email:string,username:string,sessionVersion:number}} params Donnees challenge.
   * @returns {string} Token challenge.
   */
  function signLoginChallengeToken({ adminId, email, username, sessionVersion }) {
    return jwt.sign(
      {
        sub: Number(adminId),
        email,
        username,
        sv: Number(sessionVersion) || 0,
        typ: 'mfa_challenge',
      },
      getTwoFactorJwtSecret(),
      { expiresIn: env.JWT_MFA_EXPIRES || '5m' }
    )
  }

  /**
   * Verifie un token challenge MFA.
   * @param {string|undefined} token Token challenge.
   * @returns {{adminId:number,sv:number,email:string,username:string}} Payload verifie.
   * @throws {Error} Erreur 401 si token invalide/expire.
   */
  function verifyLoginChallengeToken(token) {
    if (!token) {
      throw createHttpError(401, 'Challenge MFA manquant.')
    }

    let payload
    try {
      payload = jwt.verify(token, getTwoFactorJwtSecret())
    } catch {
      throw createHttpError(401, 'Challenge MFA invalide ou expire.')
    }

    if (payload?.typ !== 'mfa_challenge') {
      throw createHttpError(401, 'Challenge MFA invalide ou expire.')
    }

    const adminId = Number(payload?.sub)
    if (!Number.isInteger(adminId) || adminId <= 0) {
      throw createHttpError(401, 'Challenge MFA invalide ou expire.')
    }

    return {
      adminId,
      sv: Number(payload?.sv) || 0,
      email: String(payload?.email || ''),
      username: String(payload?.username || ''),
    }
  }

  /**
   * Signe un token de setup 2FA (secret temporaire).
   * @param {{adminId:number,secret:string}} params Donnees setup.
   * @returns {string} Token setup 2FA.
   */
  function signSetupToken({ adminId, secret }) {
    return jwt.sign(
      {
        sub: Number(adminId),
        secret: String(secret || ''),
        typ: 'mfa_setup',
      },
      getTwoFactorJwtSecret(),
      { expiresIn: env.JWT_MFA_SETUP_EXPIRES || '10m' }
    )
  }

  /**
   * Verifie un token de setup 2FA.
   * @param {string|undefined} token Token setup.
   * @returns {{adminId:number,secret:string}} Payload verifie.
   * @throws {Error} Erreur 401 si token invalide/expire.
   */
  function verifySetupToken(token) {
    if (!token) {
      throw createHttpError(401, 'Token setup 2FA manquant.')
    }

    let payload
    try {
      payload = jwt.verify(token, getTwoFactorJwtSecret())
    } catch {
      throw createHttpError(401, 'Token setup 2FA invalide ou expire.')
    }

    if (payload?.typ !== 'mfa_setup') {
      throw createHttpError(401, 'Token setup 2FA invalide ou expire.')
    }

    const adminId = Number(payload?.sub)
    const secret = String(payload?.secret || '')
    if (!Number.isInteger(adminId) || adminId <= 0 || !secret) {
      throw createHttpError(401, 'Token setup 2FA invalide ou expire.')
    }

    return {
      adminId,
      secret,
    }
  }

  /**
   * Genere un secret TOTP base32.
   * @returns {string} Secret base32.
   */
  function generateTotpSecret() {
    return totp.generateSecret({
      byteLength: parsePositiveInteger(env.TOTP_SECRET_BYTES, 20),
    })
  }

  /**
   * Construit une URL otpauth pour QR/authenticator.
   * @param {{label:string,secret:string}} params Donnees de setup.
   * @returns {string} URL otpauth.
   */
  function buildOtpAuthUrl({ label, secret }) {
    return totp.buildOtpAuthUrl({
      issuer: String(env.TOTP_ISSUER || 'Portfolio CMS'),
      label,
      secret,
      algorithm: String(env.TOTP_ALGORITHM || 'SHA1'),
      digits: parsePositiveInteger(env.TOTP_DIGITS, 6),
      period: parsePositiveInteger(env.TOTP_PERIOD, 30),
    })
  }

  /**
   * Verifie un code TOTP pour un secret donne.
   * @param {{secret:string,code:string}} params Parametres de verification.
   * @returns {boolean} true si le code est valide.
   */
  function verifyTotpCode({ secret, code }) {
    return totp.verifyTotp({
      secret,
      code: normalizeTotpCode(code),
      window: parsePositiveInteger(env.TOTP_WINDOW, 1),
      digits: parsePositiveInteger(env.TOTP_DIGITS, 6),
      period: parsePositiveInteger(env.TOTP_PERIOD, 30),
      algorithm: String(env.TOTP_ALGORITHM || 'sha1'),
    })
  }

  /**
   * Genere des recovery codes humains.
   * @param {number} [count=8] Nombre de codes.
   * @returns {string[]} Codes en clair.
   */
  function generateRecoveryCodes(count = 8) {
    const safeCount = parsePositiveInteger(count, 8)
    const codes = new Set()

    while (codes.size < safeCount) {
      const value = crypto.randomBytes(5).toString('hex').toUpperCase()
      codes.add(`${value.slice(0, 5)}-${value.slice(5, 10)}`)
    }

    return Array.from(codes)
  }

  /**
   * Hash un recovery code avec pepper.
   * @param {string} code Recovery code en clair.
   * @returns {string} Hash SHA-256 hex.
   */
  function hashRecoveryCode(code) {
    const normalized = normalizeRecoveryCode(code)
    return crypto.createHash('sha256').update(`${getRecoveryPepper()}:${normalized}`).digest('hex')
  }

  /**
   * Hash une liste de recovery codes.
   * @param {string[]} codes Codes en clair.
   * @returns {string[]} Hashes.
   */
  function hashRecoveryCodes(codes) {
    return (Array.isArray(codes) ? codes : []).map((code) => hashRecoveryCode(code))
  }

  /**
   * Parse les recovery code hashes stockes.
   * @param {string|undefined|null} serialized JSON stocke en base.
   * @returns {string[]} Liste de hashes.
   */
  function parseRecoveryCodeHashes(serialized) {
    if (!serialized) {
      return []
    }

    try {
      const parsed = JSON.parse(serialized)
      if (!Array.isArray(parsed)) {
        return []
      }
      return parsed.filter((entry) => typeof entry === 'string' && entry.length >= 16)
    } catch {
      return []
    }
  }

  /**
   * Serialize les recovery code hashes pour stockage DB.
   * @param {string[]} hashes Hashes de recovery codes.
   * @returns {string} JSON serialise.
   */
  function serializeRecoveryCodeHashes(hashes) {
    return JSON.stringify(Array.isArray(hashes) ? hashes : [])
  }

  /**
   * Tente de consommer un recovery code.
   * @param {{serializedHashes:string|undefined,recoveryCode:string|undefined}} params Parametres.
   * @returns {{valid:boolean,remaining:number,nextSerialized:string}} Resultat de consommation.
   */
  function consumeRecoveryCode({ serializedHashes, recoveryCode }) {
    const normalized = normalizeRecoveryCode(recoveryCode)
    if (!normalized) {
      return {
        valid: false,
        remaining: parseRecoveryCodeHashes(serializedHashes).length,
        nextSerialized: serializeRecoveryCodeHashes(parseRecoveryCodeHashes(serializedHashes)),
      }
    }

    const hashes = parseRecoveryCodeHashes(serializedHashes)
    const candidateHash = hashRecoveryCode(normalized)
    const index = hashes.findIndex((value) => value === candidateHash)

    if (index < 0) {
      return {
        valid: false,
        remaining: hashes.length,
        nextSerialized: serializeRecoveryCodeHashes(hashes),
      }
    }

    hashes.splice(index, 1)
    return {
      valid: true,
      remaining: hashes.length,
      nextSerialized: serializeRecoveryCodeHashes(hashes),
    }
  }

  /**
   * Indique si la strategie MFA autorise les recovery codes.
   * @returns {boolean} true si autorises.
   */
  function recoveryCodesEnabled() {
    return !parseBooleanEnv(env.MFA_DISABLE_RECOVERY_CODES, false)
  }

  return {
    isTwoFactorEnabled,
    signLoginChallengeToken,
    verifyLoginChallengeToken,
    signSetupToken,
    verifySetupToken,
    generateTotpSecret,
    buildOtpAuthUrl,
    verifyTotpCode,
    encryptTotpSecret,
    decryptTotpSecret,
    generateRecoveryCodes,
    hashRecoveryCodes,
    consumeRecoveryCode,
    parseRecoveryCodeHashes,
    serializeRecoveryCodeHashes,
    recoveryCodesEnabled,
    normalizeTotpCode,
    normalizeRecoveryCode,
  }
}

module.exports = {
  createTwoFactorService,
  ...createTwoFactorService(),
}
