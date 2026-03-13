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
let colorProbeElement = null
let colorMixFallbackInstalled = false
let colorMixMutationObserver = null

const COLOR_MIX_SOURCE_ATTRIBUTE = 'data-color-mix-source-style'
const THEME_UPDATED_EVENT = 'portfolio:theme-updated'

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

function getColorProbeElement() {
  if (colorProbeElement || typeof document === 'undefined') {
    return colorProbeElement
  }

  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.position = 'fixed'
  probe.style.left = '-9999px'
  probe.style.top = '-9999px'
  probe.style.width = '0'
  probe.style.height = '0'
  probe.style.pointerEvents = 'none'
  probe.style.opacity = '0'
  document.documentElement.appendChild(probe)
  colorProbeElement = probe
  return colorProbeElement
}

function splitTopLevelByComma(value) {
  const segments = []
  let buffer = ''
  let depth = 0

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (character === '(') {
      depth += 1
      buffer += character
      continue
    }

    if (character === ')') {
      depth = Math.max(0, depth - 1)
      buffer += character
      continue
    }

    if (character === ',' && depth === 0) {
      segments.push(buffer.trim())
      buffer = ''
      continue
    }

    buffer += character
  }

  if (buffer.trim()) {
    segments.push(buffer.trim())
  }

  return segments
}

function parseColorMixStop(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) {
    return { color: '', percentage: null }
  }

  const match = trimmed.match(/^(.*?)(?:\s+([0-9]+(?:\.[0-9]+)?)%)?$/)
  if (!match) {
    return { color: trimmed, percentage: null }
  }

  const color = String(match[1] || '').trim()
  const percentage = match[2] === undefined ? null : Number.parseFloat(match[2])
  return {
    color,
    percentage: Number.isFinite(percentage) ? percentage : null,
  }
}

function parseComputedColorValue(value) {
  const match = String(value || '').match(/rgba?\(([^)]+)\)/i)
  if (!match) {
    return null
  }

  const segments = match[1].split(',').map((entry) => Number.parseFloat(entry.trim()))
  if (segments.length < 3 || segments.slice(0, 3).some((entry) => !Number.isFinite(entry))) {
    return null
  }

  return {
    r: segments[0],
    g: segments[1],
    b: segments[2],
    a: Number.isFinite(segments[3]) ? segments[3] : 1,
  }
}

function resolveCssColorValue(colorText) {
  const probe = getColorProbeElement()
  if (!probe) {
    return null
  }

  probe.style.color = ''
  probe.style.color = String(colorText || '').trim()
  const computed = window.getComputedStyle(probe).color
  return parseComputedColorValue(computed)
}

function mixRgbaColors(firstColor, secondColor, firstWeight, secondWeight) {
  const totalWeight = Math.max(0.0001, firstWeight + secondWeight)
  const normalizedFirst = firstWeight / totalWeight
  const normalizedSecond = secondWeight / totalWeight

  return {
    r: (firstColor.r * normalizedFirst) + (secondColor.r * normalizedSecond),
    g: (firstColor.g * normalizedFirst) + (secondColor.g * normalizedSecond),
    b: (firstColor.b * normalizedFirst) + (secondColor.b * normalizedSecond),
    a: (firstColor.a * normalizedFirst) + (secondColor.a * normalizedSecond),
  }
}

function toCssRgbaString(color) {
  if (!color) {
    return ''
  }

  const r = Math.round(Math.min(255, Math.max(0, color.r)))
  const g = Math.round(Math.min(255, Math.max(0, color.g)))
  const b = Math.round(Math.min(255, Math.max(0, color.b)))
  const a = Math.max(0, Math.min(1, color.a))

  if (a >= 0.999) {
    return `rgb(${r}, ${g}, ${b})`
  }

  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')})`
}

function extractColorMixExpression(styleText, startIndex) {
  let depth = 0

  for (let index = startIndex; index < styleText.length; index += 1) {
    const character = styleText[index]

    if (character === '(') {
      depth += 1
      continue
    }

    if (character === ')') {
      depth -= 1
      if (depth === 0) {
        return {
          expression: styleText.slice(startIndex, index + 1),
          endIndex: index + 1,
        }
      }
    }
  }

  return null
}

function resolveColorMixExpression(expression) {
  const innerExpression = expression.slice('color-mix('.length, -1).trim()
  const parts = splitTopLevelByComma(innerExpression)

  if (parts.length < 3 || !/^in\s+srgb$/i.test(parts[0])) {
    return expression
  }

  const firstStop = parseColorMixStop(parts[1])
  const secondStop = parseColorMixStop(parts[2])
  const firstColor = resolveCssColorValue(firstStop.color)
  const secondColor = resolveCssColorValue(secondStop.color)

  if (!firstColor || !secondColor) {
    return expression
  }

  let firstWeight = firstStop.percentage
  let secondWeight = secondStop.percentage

  if (firstWeight === null && secondWeight === null) {
    firstWeight = 50
    secondWeight = 50
  } else if (firstWeight !== null && secondWeight === null) {
    secondWeight = Math.max(0, 100 - firstWeight)
  } else if (firstWeight === null && secondWeight !== null) {
    firstWeight = Math.max(0, 100 - secondWeight)
  }

  const mixedColor = mixRgbaColors(firstColor, secondColor, firstWeight, secondWeight)
  return toCssRgbaString(mixedColor)
}

function replaceColorMixExpressions(styleText) {
  let source = String(styleText || '')
  if (!source.includes('color-mix(')) {
    return source
  }

  let result = ''
  let cursor = 0

  while (cursor < source.length) {
    const nextIndex = source.indexOf('color-mix(', cursor)
    if (nextIndex === -1) {
      result += source.slice(cursor)
      break
    }

    result += source.slice(cursor, nextIndex)
    const extracted = extractColorMixExpression(source, nextIndex)

    if (!extracted) {
      result += source.slice(nextIndex)
      break
    }

    result += resolveColorMixExpression(extracted.expression)
    cursor = extracted.endIndex
  }

  return result
}

function processColorMixFallbackNode(node) {
  if (!(node instanceof HTMLElement)) {
    return
  }

  const currentStyle = node.getAttribute('style') || ''
  const rawStyle = currentStyle.includes('color-mix(')
    ? currentStyle
    : node.getAttribute(COLOR_MIX_SOURCE_ATTRIBUTE) || ''

  if (!rawStyle.includes('color-mix(')) {
    return
  }

  const resolvedStyle = replaceColorMixExpressions(rawStyle)
  node.setAttribute(COLOR_MIX_SOURCE_ATTRIBUTE, rawStyle)

  if (resolvedStyle && resolvedStyle !== currentStyle) {
    node.setAttribute('style', resolvedStyle)
  }
}

function processColorMixFallbackTree(root) {
  if (!(root instanceof HTMLElement)) {
    return
  }

  processColorMixFallbackNode(root)
  const descendants = root.querySelectorAll(`[style*="color-mix("], [${COLOR_MIX_SOURCE_ATTRIBUTE}]`)
  descendants.forEach((element) => processColorMixFallbackNode(element))
}

function refreshColorMixFallbackTree() {
  if (typeof document === 'undefined' || !document.body) {
    return
  }

  processColorMixFallbackTree(document.body)
}

export function installColorMixFallback() {
  const flags = getUiCompatibilityFlags()
  if (flags.supportsColorMix || typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  if (colorMixFallbackInstalled) {
    refreshColorMixFallbackTree()
    return
  }

  colorMixFallbackInstalled = true
  refreshColorMixFallbackTree()

  colorMixMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
        processColorMixFallbackNode(mutation.target)
        return
      }

      mutation.addedNodes.forEach((addedNode) => {
        if (addedNode instanceof HTMLElement) {
          processColorMixFallbackTree(addedNode)
        }
      })
    })
  })

  colorMixMutationObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style'],
  })

  document.documentElement.addEventListener(THEME_UPDATED_EVENT, refreshColorMixFallbackTree)
}
