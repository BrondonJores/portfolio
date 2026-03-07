/* Service TOTP (RFC 6238) pour apps Authenticator (Google/Authy/etc.). */
const cryptoLib = require('crypto')

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Normalise une cle Base32 (majuscules, sans espaces, sans '=').
 * @param {string} secret Cle Base32 brute.
 * @returns {string} Cle normalisee.
 */
function normalizeBase32Secret(secret) {
  return String(secret || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
}

/**
 * Encode un buffer binaire en Base32.
 * @param {Buffer} buffer Buffer source.
 * @returns {string} Representation Base32.
 */
function encodeBase32(buffer) {
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

/**
 * Decode une cle Base32 vers un buffer.
 * @param {string} secret Cle Base32.
 * @returns {Buffer} Buffer decode.
 */
function decodeBase32(secret) {
  const normalized = normalizeBase32Secret(secret)
  let bits = 0
  let value = 0
  const bytes = []

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index < 0) {
      continue
    }

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

/**
 * Formate un counter HOTP/TOTP en buffer 8 bytes big-endian.
 * @param {number} counter Valeur du compteur.
 * @returns {Buffer} Buffer 8 octets.
 */
function counterToBuffer(counter) {
  const safeCounter = Math.max(0, Math.floor(counter))
  const high = Math.floor(safeCounter / 0x100000000)
  const low = safeCounter % 0x100000000
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(high >>> 0, 0)
  buffer.writeUInt32BE(low >>> 0, 4)
  return buffer
}

/**
 * Construit le service TOTP avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.crypto] API crypto.
 * @returns {{generateSecret: Function,buildOtpAuthUrl: Function,verifyTotp: Function,generateTotpAt: Function}} API TOTP.
 */
function createTotpService(deps = {}) {
  const crypto = deps.crypto || cryptoLib

  /**
   * Genere une cle secrete Base32 pour TOTP.
   * @param {{byteLength?:number}} [options={}] Options de generation.
   * @returns {string} Secret Base32.
   */
  function generateSecret(options = {}) {
    const byteLength = Number(options.byteLength || 20)
    const safeLength = Number.isInteger(byteLength) && byteLength >= 10 ? byteLength : 20
    return encodeBase32(crypto.randomBytes(safeLength))
  }

  /**
   * Construit l'URL `otpauth://` compatible apps Authenticator.
   * @param {{issuer:string,label:string,secret:string,algorithm?:string,digits?:number,period?:number}} params Parametres URL.
   * @returns {string} URL otpauth.
   */
  function buildOtpAuthUrl({
    issuer,
    label,
    secret,
    algorithm = 'SHA1',
    digits = 6,
    period = 30,
  }) {
    const safeIssuer = String(issuer || 'Portfolio CMS').trim() || 'Portfolio CMS'
    const safeLabel = String(label || 'admin').trim() || 'admin'
    const safeSecret = normalizeBase32Secret(secret)
    const safeAlgorithm = String(algorithm || 'SHA1').toUpperCase()
    const safeDigits = Number.isInteger(Number(digits)) ? Number(digits) : 6
    const safePeriod = Number.isInteger(Number(period)) ? Number(period) : 30
    const otpauthLabel = encodeURIComponent(`${safeIssuer}:${safeLabel}`)

    return `otpauth://totp/${otpauthLabel}?secret=${safeSecret}&issuer=${encodeURIComponent(
      safeIssuer
    )}&algorithm=${encodeURIComponent(safeAlgorithm)}&digits=${safeDigits}&period=${safePeriod}`
  }

  /**
   * Genere un code TOTP pour un instant donne.
   * @param {string} secret Secret Base32.
   * @param {number} timestampMs Timestamp en millisecondes.
   * @param {{period?:number,digits?:number,algorithm?:string}} [options={}] Options de calcul.
   * @returns {string} Code TOTP zero-pad.
   */
  function generateTotpAt(secret, timestampMs, options = {}) {
    const period = Number.isInteger(Number(options.period)) ? Number(options.period) : 30
    const digits = Number.isInteger(Number(options.digits)) ? Number(options.digits) : 6
    const algorithm = String(options.algorithm || 'sha1').toLowerCase()

    const key = decodeBase32(secret)
    if (!key.length) {
      return ''
    }

    const counter = Math.floor(Math.floor(timestampMs / 1000) / period)
    const counterBuffer = counterToBuffer(counter)
    const hmac = crypto.createHmac(algorithm, key).update(counterBuffer).digest()
    const offset = hmac[hmac.length - 1] & 0x0f
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)

    const mod = 10 ** digits
    return String(binary % mod).padStart(digits, '0')
  }

  /**
   * Verifie un code TOTP avec fenetre de tolerance.
   * @param {{secret:string,code:string,window?:number,period?:number,digits?:number,algorithm?:string,now?:number}} params Parametres de verification.
   * @returns {boolean} true si le code est valide.
   */
  function verifyTotp({
    secret,
    code,
    window = 1,
    period = 30,
    digits = 6,
    algorithm = 'sha1',
    now = Date.now(),
  }) {
    const normalizedCode = String(code || '').replace(/\s+/g, '')
    if (!/^\d+$/.test(normalizedCode)) {
      return false
    }

    if (normalizedCode.length !== Number(digits)) {
      return false
    }

    const safeWindow = Number.isInteger(Number(window)) ? Number(window) : 1
    for (let shift = -safeWindow; shift <= safeWindow; shift += 1) {
      const timestamp = now + shift * Number(period) * 1000
      const expected = generateTotpAt(secret, timestamp, { period, digits, algorithm })
      if (!expected) {
        return false
      }

      const expectedBuffer = Buffer.from(expected)
      const currentBuffer = Buffer.from(normalizedCode)
      if (
        expectedBuffer.length === currentBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, currentBuffer)
      ) {
        return true
      }
    }

    return false
  }

  return {
    generateSecret,
    buildOtpAuthUrl,
    verifyTotp,
    generateTotpAt,
  }
}

module.exports = {
  createTotpService,
  ...createTotpService(),
}

