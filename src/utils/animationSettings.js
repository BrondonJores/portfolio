const IMPORTABLE_ANIMATION_KEY_PATTERN = /^anim_[a-z0-9_]{1,80}$/i

export const ANIMATION_CORE_SETTING_KEYS = [
  'anim_enabled',
  'anim_duration_scale',
  'anim_intensity',
  'anim_loader_spinner_asset_url',
  'anim_loader_page_asset_url',
  'anim_loader_site_asset_url',
  'anim_scene_assets_enabled',
  'anim_scene_asset_show_hero',
  'anim_scene_asset_mobile_enabled',
  'anim_scene_asset_size',
  'anim_scene_asset_opacity',
  'anim_scene_asset_speed',
  'anim_scene_asset_fit',
  'anim_scene_asset_default_url',
  'anim_scene_asset_hero_url',
  'anim_scene_asset_about_url',
  'anim_scene_asset_skills_url',
  'anim_scene_asset_projects_url',
  'anim_scene_asset_blog_url',
  'anim_scene_asset_contact_url',
  'anim_mascots_enabled',
  'anim_mascot_show_hero',
  'anim_mascot_count',
  'anim_mascot_size',
  'anim_mascot_speed',
  'anim_mascot_opacity',
  'anim_mascot_asset_fit',
  'anim_mascot_asset_default_url',
  'anim_mascot_asset_about_url',
  'anim_mascot_asset_skills_url',
  'anim_mascot_asset_projects_url',
  'anim_mascot_asset_blog_url',
  'anim_mascot_asset_contact_url',
  'anim_sprite_wander_enabled',
  'anim_sprite_wander_size',
  'anim_sprite_wander_speed',
  'anim_sprite_wander_opacity',
  'anim_sprite_side_enabled',
  'anim_sprite_side_count',
  'anim_sprite_side_size',
  'anim_sprite_side_frequency_ms',
  'anim_sprite_side_duration_ms',
  'anim_sprite_asset_fit',
  'anim_sprite_asset_default_url',
  'anim_sprite_asset_wander_url',
  'anim_sprite_asset_side_left_url',
  'anim_sprite_asset_side_right_url',
]

const ANIMATION_CORE_SETTING_KEY_SET = new Set(ANIMATION_CORE_SETTING_KEYS)
const MAX_IMPORTED_ANIMATION_SETTINGS = ANIMATION_CORE_SETTING_KEYS.length

function clampNumber(rawValue, min, max, fallback) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(max, Math.max(min, parsed))
}

export function parseBooleanSetting(value, fallback = false) {
  if (value === true || value === false) {
    return value
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return fallback
}

function toTrimmedString(value) {
  return String(value || '').trim()
}

export function extractAnimationSettings(settings = {}) {
  const payload = {}
  const source = settings && typeof settings === 'object' ? settings : {}

  ANIMATION_CORE_SETTING_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      return
    }

    const rawValue = source[key]
    if (rawValue === null || rawValue === undefined) {
      return
    }

    if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      payload[key] = String(rawValue)
    }
  })

  return payload
}

export function sanitizeImportedAnimationSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    return {}
  }

  const sanitized = {}
  const entries = Object.entries(rawSettings)
  for (const [key, value] of entries) {
    if (Object.keys(sanitized).length >= MAX_IMPORTED_ANIMATION_SETTINGS) {
      break
    }
    if (!IMPORTABLE_ANIMATION_KEY_PATTERN.test(key)) {
      continue
    }
    if (!ANIMATION_CORE_SETTING_KEY_SET.has(key)) {
      continue
    }
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      continue
    }
    if (value === null || value === undefined) {
      continue
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = String(value)
    }
  }

  return sanitized
}

export function getSectionAnimationConfig(settings = {}, prefersReducedMotion = false) {
  return getAnimationConfig(settings, prefersReducedMotion)
}

/**
 * Compatibilite legacy: les presets cinematics ont ete retires au profit du pack assets-only.
 * @returns {null} Toujours null.
 */
export function getCinematicPresetSettings() {
  return null
}

export function getAnimationConfig(settings = {}, prefersReducedMotion = false) {
  const reducedMotion = Boolean(prefersReducedMotion)
  const enabled = parseBooleanSetting(settings.anim_enabled, true)
  const canAnimate = enabled && !reducedMotion
  const intensity = clampNumber(settings.anim_intensity, 0.4, 2.5, 1)
  const durationScale = clampNumber(settings.anim_duration_scale, 0.6, 2, 1)

  return {
    enabled,
    canAnimate,
    reducedMotion,
    profile: 'assets-only',
    easePreset: 'easeInOut',
    durationScale,
    intensity,
    sectionRevealType: 'fade-up',
    sectionDurationMs: 650 * durationScale,
    sectionDistancePx: 36 * intensity,
    sectionOnce: true,
    cardHover: true,
    cardLiftPx: 8 * intensity,
    cardScale: 1.02,
    cardTiltDeg: 1.5 * intensity,
    ctaPulse: true,
    ctaPulseIntervalMs: 1800 / Math.max(0.7, intensity),
    loaderSpinnerAssetUrl: toTrimmedString(settings.anim_loader_spinner_asset_url),
    loaderPageAssetUrl: toTrimmedString(settings.anim_loader_page_asset_url),
    loaderSiteAssetUrl: toTrimmedString(settings.anim_loader_site_asset_url),
    mascotsEnabled: parseBooleanSetting(settings.anim_mascots_enabled, true),
    mascotCount: Math.round(clampNumber(settings.anim_mascot_count, 0, 1, 1)),
    mascotSizePx: clampNumber(settings.anim_mascot_size, 180, 520, 340) * Math.max(0.75, intensity),
    mascotSpeed: clampNumber(settings.anim_mascot_speed, 0.5, 2.5, 1) * Math.max(0.75, intensity),
    mascotOpacity: clampNumber(settings.anim_mascot_opacity, 0.2, 1, 0.85),
    mascotStyle: 'asset',
    mascotShowHero: parseBooleanSetting(settings.anim_mascot_show_hero, false),
    mascotAssetFit: settings.anim_mascot_asset_fit === 'cover' ? 'cover' : 'contain',
    mascotAssetDefaultUrl: toTrimmedString(settings.anim_mascot_asset_default_url),
    mascotAssetAboutUrl: toTrimmedString(settings.anim_mascot_asset_about_url),
    mascotAssetSkillsUrl: toTrimmedString(settings.anim_mascot_asset_skills_url),
    mascotAssetProjectsUrl: toTrimmedString(settings.anim_mascot_asset_projects_url),
    mascotAssetBlogUrl: toTrimmedString(settings.anim_mascot_asset_blog_url),
    mascotAssetContactUrl: toTrimmedString(settings.anim_mascot_asset_contact_url),
    mascotBubblesEnabled: false,
    mascotBubbleIntervalMs: 4200,
    mascotBubbleMaxVisible: 1,
    mascotBubbleMessages: ['Salut !', 'Bienvenue sur mon portfolio.', 'Discutons de ton projet.'],
    sceneAssetsEnabled: parseBooleanSetting(settings.anim_scene_assets_enabled, true),
    sceneAssetShowHero: parseBooleanSetting(settings.anim_scene_asset_show_hero, true),
    sceneAssetMobileEnabled: parseBooleanSetting(settings.anim_scene_asset_mobile_enabled, false),
    sceneAssetSizePx: clampNumber(settings.anim_scene_asset_size, 220, 760, 360) * Math.max(0.8, intensity),
    sceneAssetOpacity: clampNumber(settings.anim_scene_asset_opacity, 0.2, 1, 0.9),
    sceneAssetSpeed: clampNumber(settings.anim_scene_asset_speed, 0.5, 2.5, 1),
    sceneAssetFit: settings.anim_scene_asset_fit === 'cover' ? 'cover' : 'contain',
    sceneAssetDefaultUrl: toTrimmedString(settings.anim_scene_asset_default_url),
    sceneAssetHeroUrl: toTrimmedString(settings.anim_scene_asset_hero_url),
    sceneAssetAboutUrl: toTrimmedString(settings.anim_scene_asset_about_url),
    sceneAssetSkillsUrl: toTrimmedString(settings.anim_scene_asset_skills_url),
    sceneAssetProjectsUrl: toTrimmedString(settings.anim_scene_asset_projects_url),
    sceneAssetBlogUrl: toTrimmedString(settings.anim_scene_asset_blog_url),
    sceneAssetContactUrl: toTrimmedString(settings.anim_scene_asset_contact_url),
    spriteWanderEnabled: parseBooleanSetting(settings.anim_sprite_wander_enabled, true),
    spriteWanderSizePx: clampNumber(settings.anim_sprite_wander_size, 36, 140, 74) * Math.max(0.8, intensity),
    spriteWanderSpeed: clampNumber(settings.anim_sprite_wander_speed, 0.4, 2.6, 1) * Math.max(0.75, intensity),
    spriteWanderOpacity: clampNumber(settings.anim_sprite_wander_opacity, 0.2, 1, 0.88),
    spriteSideEnabled: parseBooleanSetting(settings.anim_sprite_side_enabled, true),
    spriteSideCount: Math.round(clampNumber(settings.anim_sprite_side_count, 1, 6, 2)),
    spriteSideSizePx: clampNumber(settings.anim_sprite_side_size, 36, 160, 92) * Math.max(0.8, intensity),
    spriteSideFrequencyMs: clampNumber(settings.anim_sprite_side_frequency_ms, 1400, 12000, 5200),
    spriteSideDurationMs: clampNumber(settings.anim_sprite_side_duration_ms, 700, 5000, 1700),
    spriteStyle: 'asset-split',
    spritePath: 'orbit',
    spriteSidePattern: 'peek',
    spriteFlipEnabled: true,
    spriteBouncePx: 8 * Math.max(0.85, intensity),
    spriteWanderRotationDeg: 8 * Math.max(0.8, intensity),
    spriteAssetFit: settings.anim_sprite_asset_fit === 'cover' ? 'cover' : 'contain',
    spriteAssetDefaultUrl: toTrimmedString(settings.anim_sprite_asset_default_url),
    spriteAssetWanderUrl: toTrimmedString(settings.anim_sprite_asset_wander_url),
    spriteAssetSideLeftUrl: toTrimmedString(settings.anim_sprite_asset_side_left_url),
    spriteAssetSideRightUrl: toTrimmedString(settings.anim_sprite_asset_side_right_url),
    scrollProgressEnabled: true,
    scrollProgressThickness: 4,
  }
}
