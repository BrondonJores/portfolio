const ASSET_HTTP_PROTOCOL_REGEX = /^https?:\/\//i
const CLOUDINARY_RAW_URL_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/raw\/upload\//i

/**
 * Nettoie une URL d'asset animation pour limiter les protocoles autorises.
 * @param {unknown} rawValue Valeur brute provenant du back-office.
 * @param {{ allowBlob?: boolean }} [options] Options de sanitisation.
 * @returns {string} URL nettoyee, sinon chaine vide.
 */
export function sanitizeAnimationAssetUrl(rawValue, options = {}) {
  if (typeof rawValue !== 'string') {
    return ''
  }

  const value = rawValue.trim()
  if (!value) {
    return ''
  }

  if (options.allowBlob && value.startsWith('blob:')) {
    return value
  }

  if (value.startsWith('/')) {
    return value
  }

  if (ASSET_HTTP_PROTOCOL_REGEX.test(value)) {
    return value
  }

  return ''
}

/**
 * Detecte le mode de rendu asset depuis l'extension de l'URL.
 * @param {string} rawUrl URL asset.
 * @returns {'video'|'image'|'lottie'|'rive'|'unsupported'} Type de rendu.
 */
export function detectAnimationAssetMode(rawUrl) {
  const clean = String(rawUrl || '').split('?')[0].split('#')[0].toLowerCase()
  if (!clean) {
    return 'unsupported'
  }

  if (/\.json$/.test(clean)) {
    return 'lottie'
  }

  if (/\.riv$/.test(clean)) {
    return 'rive'
  }

  if (CLOUDINARY_RAW_URL_PATTERN.test(clean)) {
    return 'lottie'
  }

  if (/\.(webm|mp4|m4v|ogg|mov)$/.test(clean)) {
    return 'video'
  }

  if (/\.(gif|webp|png|jpg|jpeg|svg|avif)$/.test(clean)) {
    return 'image'
  }

  return 'unsupported'
}

/**
 * Detecte une URL Cloudinary raw potentiellement sans extension.
 * @param {string} rawUrl URL asset.
 * @returns {boolean} Vrai si l'URL ressemble a un endpoint raw Cloudinary.
 */
export function isCloudinaryRawAssetUrl(rawUrl) {
  const clean = String(rawUrl || '').split('?')[0].split('#')[0].toLowerCase()
  if (!clean) {
    return false
  }
  return CLOUDINARY_RAW_URL_PATTERN.test(clean)
}

/**
 * Normalise le mode de cadrage pour les players d'assets.
 * @param {unknown} rawValue Valeur brute.
 * @returns {'contain'|'cover'} Mode de fit valide.
 */
export function normalizeAnimationAssetFit(rawValue) {
  return String(rawValue || '').toLowerCase() === 'cover' ? 'cover' : 'contain'
}
