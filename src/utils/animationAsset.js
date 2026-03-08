const ASSET_HTTP_PROTOCOL_REGEX = /^https?:\/\//i

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

  if (/\.(lottie|json)$/.test(clean)) {
    return 'lottie'
  }

  if (/\.riv$/.test(clean)) {
    return 'rive'
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
 * Normalise le mode de cadrage pour les players d'assets.
 * @param {unknown} rawValue Valeur brute.
 * @returns {'contain'|'cover'} Mode de fit valide.
 */
export function normalizeAnimationAssetFit(rawValue) {
  return String(rawValue || '').toLowerCase() === 'cover' ? 'cover' : 'contain'
}
