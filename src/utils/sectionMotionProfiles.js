/* Profils d'animations de contenu par section pour un rendu unique et coherent. */

function toSeconds(value, fallback = 0.12) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) {
    return fallback
  }
  return num
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const SECTION_MOTION_PRESETS = {
  hero: {
    from: { yFactor: 1.2, x: 0, scale: 0.96, rotate: -0.8, blur: 6 },
    to: { y: 0, x: 0, scale: 1, rotate: 0, blur: 0 },
    ease: 'easeOut',
    durationFactor: 1.08,
    delayChildrenFactor: 1.4,
  },
  about: {
    from: { yFactor: 0.9, x: -20, scale: 0.985, rotate: -0.5, blur: 4 },
    to: { y: 0, x: 0, scale: 1, rotate: 0, blur: 0 },
    ease: 'easeOut',
    durationFactor: 1,
    delayChildrenFactor: 1.1,
  },
  skills: {
    from: { yFactor: 0.72, x: 12, scale: 0.95, rotate: -1.6, blur: 6 },
    to: { y: 0, x: 0, scale: 1, rotate: 0, blur: 0 },
    ease: 'anticipate',
    durationFactor: 0.95,
    delayChildrenFactor: 0.8,
  },
  projects: {
    from: { yFactor: 1.05, x: 10, scale: 0.955, rotate: 1.3, blur: 7 },
    to: { y: 0, x: 0, scale: 1, rotate: 0, blur: 0 },
    ease: 'easeOut',
    durationFactor: 1,
    delayChildrenFactor: 1,
  },
  blog: {
    from: { yFactor: 0.85, x: -14, scale: 0.965, rotate: 0.8, blur: 8 },
    to: { y: 0, x: 0, scale: 1, rotate: 0, blur: 0 },
    ease: 'easeOut',
    durationFactor: 0.94,
    delayChildrenFactor: 0.95,
  },
  contact: {
    from: { yFactor: 0.88, x: 0, scale: 0.975, rotate: -0.2, blur: 4 },
    to: { y: 0, x: 0, scale: 1, rotate: 0, blur: 0 },
    ease: 'easeInOut',
    durationFactor: 0.98,
    delayChildrenFactor: 0.75,
  },
  section: {
    from: { yFactor: 0.8, x: 0, scale: 0.98, rotate: 0, blur: 4 },
    to: { y: 0, x: 0, scale: 1, rotate: 0, blur: 0 },
    ease: 'easeOut',
    durationFactor: 1,
    delayChildrenFactor: 1,
  },
}

/**
 * Retourne une cle de section securisee pour appliquer un preset.
 * @param {string} sectionKey Cle section.
 * @returns {'hero'|'about'|'skills'|'projects'|'blog'|'contact'|'section'} Cle normalisee.
 */
export function resolveSectionMotionKey(sectionKey) {
  const normalized = String(sectionKey || '').trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(SECTION_MOTION_PRESETS, normalized)) {
    return normalized
  }
  return 'section'
}

/**
 * Retourne le preset de motion de la section cible.
 * @param {string} sectionKey Cle section.
 * @returns {object} Preset animation.
 */
export function getSectionMotionPreset(sectionKey) {
  return SECTION_MOTION_PRESETS[resolveSectionMotionKey(sectionKey)]
}

/**
 * Construit des variants container adaptes a la section.
 * @param {string} sectionKey Cle section.
 * @param {object} animationConfig Configuration globale animation.
 * @returns {{hidden: object, visible: object}} Variants framer-motion.
 */
export function buildSectionContainerVariants(sectionKey, animationConfig) {
  const preset = getSectionMotionPreset(sectionKey)
  const stagger = toSeconds(animationConfig?.sectionStaggerMs / 1000, 0.11)
  const delayChildren = clamp(stagger * preset.delayChildrenFactor, 0, 0.32)

  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
  }
}

/**
 * Construit des variants item uniques par section.
 * @param {string} sectionKey Cle section.
 * @param {object} animationConfig Configuration globale animation.
 * @returns {{hidden: object, visible: object}} Variants item.
 */
export function buildSectionItemVariants(sectionKey, animationConfig) {
  const preset = getSectionMotionPreset(sectionKey)
  const distance = Number(animationConfig?.sectionDistancePx) || 24
  const duration = clamp((Number(animationConfig?.sectionDurationMs) || 650) / 1000, 0.24, 1.6)
  const scaledDuration = clamp(duration * preset.durationFactor, 0.22, 1.7)
  const ease = preset.ease || animationConfig?.easePreset || 'easeOut'

  return {
    hidden: {
      opacity: 0,
      y: distance * preset.from.yFactor,
      x: preset.from.x,
      scale: preset.from.scale,
      rotate: preset.from.rotate,
      filter: `blur(${preset.from.blur}px)`,
    },
    visible: {
      opacity: 1,
      y: preset.to.y,
      x: preset.to.x,
      scale: preset.to.scale,
      rotate: preset.to.rotate,
      filter: `blur(${preset.to.blur}px)`,
      transition: {
        duration: scaledDuration,
        ease,
      },
    },
  }
}
