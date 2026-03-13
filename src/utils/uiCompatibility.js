const DEFAULT_UI_COMPATIBILITY_FLAGS = Object.freeze({
  isIosWebKit: false,
  isLegacyIos: false,
  supportsColorMix: true,
  supportsBackdropFilter: true,
  supportsIntersectionObserver: true,
  disableMotion: false,
  simplifySurfaceChrome: false,
  simplifyMediaEffects: false,
})

let cachedUiCompatibilityFlags = null

function parseIosMajorVersion(userAgent) {
  const match = String(userAgent || '').match(/OS (\d+)_/i)
  if (!match) {
    return null
  }

  const majorVersion = Number.parseInt(match[1], 10)
  return Number.isFinite(majorVersion) ? majorVersion : null
}

function isIosLikePlatform(userAgent, maxTouchPoints) {
  const normalizedUserAgent = String(userAgent || '')
  return /iP(?:hone|ad|od)/i.test(normalizedUserAgent)
    || (/Macintosh/i.test(normalizedUserAgent) && Number(maxTouchPoints) > 1)
}

export function getUiCompatibilityFlags() {
  if (cachedUiCompatibilityFlags) {
    return cachedUiCompatibilityFlags
  }

  if (
    typeof window === 'undefined'
    || typeof navigator === 'undefined'
    || typeof document === 'undefined'
  ) {
    cachedUiCompatibilityFlags = DEFAULT_UI_COMPATIBILITY_FLAGS
    return cachedUiCompatibilityFlags
  }

  const userAgent = navigator.userAgent || ''
  const maxTouchPoints = navigator.maxTouchPoints || 0
  const iosLikePlatform = isIosLikePlatform(userAgent, maxTouchPoints)
  const isIosWebKit = iosLikePlatform && /WebKit/i.test(userAgent)
  const iosMajorVersion = parseIosMajorVersion(userAgent)
  const supportsColorMix = typeof window.CSS?.supports === 'function'
    ? window.CSS.supports('background', 'color-mix(in srgb, black 50%, white)')
    : false
  const supportsBackdropFilter = typeof window.CSS?.supports === 'function'
    ? (
        window.CSS.supports('backdrop-filter', 'blur(2px)')
        || window.CSS.supports('-webkit-backdrop-filter', 'blur(2px)')
      )
    : false
  const supportsIntersectionObserver = typeof window.IntersectionObserver === 'function'
  const isLegacyIos = isIosWebKit && iosMajorVersion !== null && iosMajorVersion <= 15

  cachedUiCompatibilityFlags = Object.freeze({
    isIosWebKit,
    isLegacyIos,
    supportsColorMix,
    supportsBackdropFilter,
    supportsIntersectionObserver,
    disableMotion: isIosWebKit || !supportsIntersectionObserver,
    simplifySurfaceChrome: isIosWebKit || isLegacyIos || !supportsBackdropFilter,
    simplifyMediaEffects: isIosWebKit || isLegacyIos || !supportsColorMix,
  })

  return cachedUiCompatibilityFlags
}

export function applyUiCompatibilityClasses() {
  if (typeof document === 'undefined') {
    return DEFAULT_UI_COMPATIBILITY_FLAGS
  }

  const flags = getUiCompatibilityFlags()
  const root = document.documentElement
  const useLegacyClass = flags.simplifySurfaceChrome || flags.simplifyMediaEffects

  root.classList.toggle('ui-compat-legacy', useLegacyClass)
  root.classList.toggle('ui-compat-ios-webkit', flags.isIosWebKit)
  root.classList.toggle('ui-compat-no-color-mix', !flags.supportsColorMix)
  root.classList.toggle('ui-compat-no-backdrop', !flags.supportsBackdropFilter)
  root.classList.toggle('ui-compat-no-motion', flags.disableMotion)

  return flags
}

export function resetUiCompatibilityFlagsCache() {
  cachedUiCompatibilityFlags = null
}
