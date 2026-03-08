export const ANIMATION_PROFILE_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'cinematic', label: 'Cinematic' },
]

export const ANIMATION_EASE_OPTIONS = [
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'anticipate', label: 'Anticipate' },
  { value: 'linear', label: 'Linear' },
]

export const REDUCE_MOTION_OPTIONS = [
  { value: 'auto', label: 'Auto (systeme)' },
  { value: 'force_reduce', label: 'Toujours reduire' },
  { value: 'off', label: 'Ignorer systeme' },
]

export const SECTION_REVEAL_OPTIONS = [
  { value: 'fade-up', label: 'Fade Up' },
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Scale' },
  { value: 'slide-right', label: 'Slide Right' },
]

export const MASCOT_STYLE_OPTIONS = [
  { value: 'asset', label: 'Assets reels (dotLottie / Rive / Video / Image)' },
]

export const SPRITE_STYLE_OPTIONS = [
  { value: 'asset-shared', label: 'Asset partage (global)' },
  { value: 'asset-split', label: 'Assets separes (baladeur + cotes)' },
]

export const SPRITE_PATH_OPTIONS = [
  { value: 'orbit', label: 'Orbite libre' },
  { value: 'zigzag', label: 'Zigzag dynamique' },
  { value: 'perimeter', label: 'Tour des bords' },
]

export const SPRITE_SIDE_PATTERN_OPTIONS = [
  { value: 'peek', label: 'Peek discret' },
  { value: 'dash', label: 'Dash rapide' },
  { value: 'hop', label: 'Saut lateral' },
]

export const SECTION_SCENE_OPTIONS = [
  { value: 'inherit', label: 'Heriter du global' },
  { value: 'heroic', label: 'Heroique' },
  { value: 'cinematic', label: 'Cinematique' },
  { value: 'soft', label: 'Doux' },
  { value: 'spotlight', label: 'Spotlight' },
  { value: 'energetic', label: 'Energique' },
  { value: 'minimal', label: 'Minimal' },
]

export const SECTION_SCENE_TARGETS = [
  { key: 'hero', label: 'Hero' },
  { key: 'about', label: 'About' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'blog', label: 'Blog' },
  { key: 'contact', label: 'Contact' },
]

export const CINEMATIC_PRESET_OPTIONS = [
  { value: 'cine-portfolio', label: 'Cinematic Portfolio' },
  { value: 'story-soft', label: 'Story Soft' },
  { value: 'arcade-energy', label: 'Arcade Energy' },
  { value: 'friendly-host', label: 'Friendly Host' },
]

const SECTION_SCENE_SET = new Set(SECTION_SCENE_OPTIONS.map((option) => option.value))

const SECTION_SCENE_PRESET_MAP = {
  heroic: {
    revealType: 'fade-up',
    distanceMultiplier: 1.3,
    durationMultiplier: 1.1,
    easePreset: 'anticipate',
    sectionOnce: false,
    spriteSpeedMultiplier: 1.08,
  },
  cinematic: {
    revealType: 'fade-up',
    distanceMultiplier: 1.55,
    durationMultiplier: 1.25,
    easePreset: 'easeInOut',
    sectionOnce: false,
    spriteSpeedMultiplier: 0.95,
  },
  soft: {
    revealType: 'fade',
    distanceMultiplier: 0.45,
    durationMultiplier: 0.95,
    easePreset: 'easeOut',
    sectionOnce: true,
    spriteSpeedMultiplier: 0.85,
  },
  spotlight: {
    revealType: 'slide-right',
    distanceMultiplier: 0.95,
    durationMultiplier: 1.05,
    easePreset: 'easeInOut',
    sectionOnce: false,
    spriteSpeedMultiplier: 1.1,
  },
  energetic: {
    revealType: 'scale',
    distanceMultiplier: 0.7,
    durationMultiplier: 0.8,
    easePreset: 'anticipate',
    sectionOnce: false,
    spriteSpeedMultiplier: 1.25,
  },
  minimal: {
    revealType: 'fade',
    distanceMultiplier: 0.2,
    durationMultiplier: 0.7,
    easePreset: 'linear',
    sectionOnce: true,
    spriteSpeedMultiplier: 0.7,
  },
}

const CINEMATIC_PRESET_MAP = {
  'cine-portfolio': {
    anim_profile: 'cinematic',
    anim_ease_preset: 'easeInOut',
    anim_intensity: '1.2',
    anim_duration_scale: '1',
    anim_section_once: 'false',
    anim_sprite_style: 'asset-shared',
    anim_sprite_path: 'zigzag',
    anim_sprite_side_pattern: 'dash',
    anim_sprite_flip_enabled: 'true',
    anim_sprite_bounce_px: '10',
    anim_sprite_wander_rotation_deg: '12',
    anim_scene_hero: 'heroic',
    anim_scene_about: 'spotlight',
    anim_scene_skills: 'energetic',
    anim_scene_projects: 'cinematic',
    anim_scene_blog: 'soft',
    anim_scene_contact: 'spotlight',
  },
  'story-soft': {
    anim_profile: 'balanced',
    anim_ease_preset: 'easeOut',
    anim_intensity: '0.9',
    anim_duration_scale: '1.08',
    anim_section_once: 'true',
    anim_sprite_style: 'asset-shared',
    anim_sprite_path: 'orbit',
    anim_sprite_side_pattern: 'peek',
    anim_sprite_flip_enabled: 'true',
    anim_sprite_bounce_px: '6',
    anim_sprite_wander_rotation_deg: '6',
    anim_scene_hero: 'soft',
    anim_scene_about: 'soft',
    anim_scene_skills: 'minimal',
    anim_scene_projects: 'soft',
    anim_scene_blog: 'soft',
    anim_scene_contact: 'soft',
  },
  'arcade-energy': {
    anim_profile: 'cinematic',
    anim_ease_preset: 'anticipate',
    anim_intensity: '1.4',
    anim_duration_scale: '0.92',
    anim_section_once: 'false',
    anim_sprite_style: 'asset-shared',
    anim_sprite_path: 'perimeter',
    anim_sprite_side_pattern: 'hop',
    anim_sprite_flip_enabled: 'true',
    anim_sprite_bounce_px: '14',
    anim_sprite_wander_rotation_deg: '16',
    anim_scene_hero: 'energetic',
    anim_scene_about: 'heroic',
    anim_scene_skills: 'energetic',
    anim_scene_projects: 'heroic',
    anim_scene_blog: 'cinematic',
    anim_scene_contact: 'spotlight',
  },
  'friendly-host': {
    anim_profile: 'balanced',
    anim_ease_preset: 'easeOut',
    anim_intensity: '1',
    anim_duration_scale: '1',
    anim_section_once: 'true',
    anim_mascot_style: 'asset',
    anim_mascot_count: '1',
    anim_mascot_show_hero: 'false',
    anim_mascot_bubbles_enabled: 'true',
    anim_mascot_bubble_interval_ms: '3600',
    anim_mascot_bubble_max_visible: '1',
    anim_mascot_bubble_messages: 'Bienvenue !\nParcourons le portfolio ensemble.\nUn projet en tete ? Parlons-en.',
    anim_sprite_style: 'asset-shared',
    anim_sprite_path: 'orbit',
    anim_sprite_side_pattern: 'peek',
    anim_scene_hero: 'soft',
    anim_scene_about: 'soft',
    anim_scene_skills: 'spotlight',
    anim_scene_projects: 'cinematic',
    anim_scene_blog: 'soft',
    anim_scene_contact: 'spotlight',
  },
}

const IMPORTABLE_ANIMATION_KEY_PATTERN = /^anim_[a-z0-9_]{1,80}$/i
const MAX_IMPORTED_ANIMATION_SETTINGS = 120
const LEGACY_SPRITE_STYLE_SET = new Set([
  'mixed-human',
  'walker',
  'hoodie',
  'skater',
  'coder',
  'pixel',
  'ghost',
  'rocket',
])
const SPRITE_RENDER_MODE_SET = new Set(SPRITE_STYLE_OPTIONS.map((option) => option.value))

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

function parseBubbleMessages(rawValue) {
  const fallback = ['Salut !', 'Bienvenue sur mon portfolio.', 'Discutons de ton projet.']
  if (typeof rawValue !== 'string') {
    return fallback
  }

  const messages = rawValue
    .split(/\r?\n|\|/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 12)

  return messages.length > 0 ? messages : fallback
}

/**
 * Normalise le style mascotte vers le mode assets-only.
 * @param {unknown} rawValue Valeur brute depuis les settings.
 * @returns {'asset'} Mode pris en charge.
 */
function normalizeMascotStyle(rawValue) {
  if (String(rawValue || '').trim().toLowerCase() === 'asset') {
    return 'asset'
  }
  return 'asset'
}

/**
 * Normalise le mode de rendu sprite en conservant la compatibilite legacy.
 * @param {unknown} rawValue Valeur brute depuis les settings.
 * @returns {'asset-shared'|'asset-split'} Mode sprite.
 */
function normalizeSpriteStyle(rawValue) {
  const token = String(rawValue || '').trim().toLowerCase()
  if (SPRITE_RENDER_MODE_SET.has(token)) {
    return token
  }
  if (LEGACY_SPRITE_STYLE_SET.has(token)) {
    return 'asset-shared'
  }
  return 'asset-shared'
}

function normalizeSectionSceneToken(rawValue) {
  const token = String(rawValue || 'inherit').trim().toLowerCase()
  if (SECTION_SCENE_SET.has(token)) {
    return token
  }
  return 'inherit'
}

function resolveSectionSceneToken(settings, sectionKey) {
  const normalizedSection = String(sectionKey || '').trim().toLowerCase()
  if (!normalizedSection) {
    return 'inherit'
  }
  return normalizeSectionSceneToken(settings?.[`anim_scene_${normalizedSection}`])
}

function applySectionSceneOverrides(baseConfig, sectionSceneToken) {
  const scenePreset = SECTION_SCENE_PRESET_MAP[sectionSceneToken]
  if (!scenePreset) {
    return baseConfig
  }

  return {
    ...baseConfig,
    sectionRevealType: scenePreset.revealType || baseConfig.sectionRevealType,
    sectionDurationMs: Math.round(baseConfig.sectionDurationMs * (scenePreset.durationMultiplier || 1)),
    sectionDistancePx: baseConfig.sectionDistancePx * (scenePreset.distanceMultiplier || 1),
    easePreset: scenePreset.easePreset || baseConfig.easePreset,
    sectionOnce:
      typeof scenePreset.sectionOnce === 'boolean' ? scenePreset.sectionOnce : baseConfig.sectionOnce,
    spriteWanderSpeed: baseConfig.spriteWanderSpeed * (scenePreset.spriteSpeedMultiplier || 1),
  }
}

export function getSectionAnimationConfig(settings = {}, prefersReducedMotion = false, sectionKey = '') {
  const baseConfig = getAnimationConfig(settings, prefersReducedMotion)
  const sectionSceneToken = resolveSectionSceneToken(settings, sectionKey)
  return applySectionSceneOverrides(baseConfig, sectionSceneToken)
}

export function getCinematicPresetSettings(presetValue) {
  const preset = CINEMATIC_PRESET_MAP[String(presetValue || '').trim()]
  if (!preset) {
    return null
  }
  return { ...preset }
}

export function extractAnimationSettings(settings = {}) {
  const payload = {}
  const source = settings && typeof settings === 'object' ? settings : {}
  Object.entries(source).forEach(([key, rawValue]) => {
    if (!IMPORTABLE_ANIMATION_KEY_PATTERN.test(key)) {
      return
    }
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      return
    }
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

export function getAnimationConfig(settings = {}, prefersReducedMotion = false) {
  const reduceMode = settings.anim_reduce_motion_mode || 'auto'
  const forceReduced = reduceMode === 'force_reduce'
  const ignoreSystem = reduceMode === 'off'
  const reducedMotion = forceReduced || (!ignoreSystem && prefersReducedMotion)
  const enabled = parseBooleanSetting(settings.anim_enabled, true)
  const canAnimate = enabled && !reducedMotion
  const profile = settings.anim_profile || 'balanced'

  const profileMultipliers = {
    minimal: 0.75,
    balanced: 1,
    cinematic: 1.25,
  }

  const profileFactor = profileMultipliers[profile] || 1
  const intensity = clampNumber(settings.anim_intensity, 0.4, 2.5, 1) * profileFactor
  const durationScale = clampNumber(settings.anim_duration_scale, 0.6, 2, 1) * profileFactor

  return {
    enabled,
    canAnimate,
    reducedMotion,
    profile,
    easePreset: settings.anim_ease_preset || 'easeOut',
    durationScale,
    intensity,
    sectionRevealType: settings.anim_section_reveal_type || 'fade-up',
    sectionDurationMs: clampNumber(settings.anim_section_duration_ms, 200, 1600, 650) * durationScale,
    sectionDistancePx: clampNumber(settings.anim_section_distance_px, 0, 120, 36) * intensity,
    sectionOnce: parseBooleanSetting(settings.anim_section_once, true),
    cardHover: parseBooleanSetting(settings.anim_card_hover, true),
    cardLiftPx: clampNumber(settings.anim_card_lift_px, 0, 24, 8) * intensity,
    cardScale: clampNumber(settings.anim_card_scale, 1, 1.1, 1.02),
    cardTiltDeg: clampNumber(settings.anim_card_tilt_deg, 0, 6, 1.5) * intensity,
    ctaPulse: parseBooleanSetting(settings.anim_cta_pulse, true),
    ctaPulseIntervalMs: clampNumber(settings.anim_cta_pulse_interval_ms, 900, 4000, 1800) / Math.max(0.7, intensity),
    mascotsEnabled: parseBooleanSetting(settings.anim_mascots_enabled, true),
    mascotCount: Math.round(clampNumber(settings.anim_mascot_count, 0, 1, 1)),
    mascotSizePx: clampNumber(settings.anim_mascot_size, 180, 520, 340) * Math.max(0.75, intensity),
    mascotSpeed: clampNumber(settings.anim_mascot_speed, 0.5, 2.5, 1) * Math.max(0.75, intensity),
    mascotOpacity: clampNumber(settings.anim_mascot_opacity, 0.2, 1, 0.85),
    mascotStyle: normalizeMascotStyle(settings.anim_mascot_style),
    mascotShowHero: parseBooleanSetting(settings.anim_mascot_show_hero, false),
    mascotAssetFit: settings.anim_mascot_asset_fit === 'cover' ? 'cover' : 'contain',
    mascotAssetDefaultUrl: String(settings.anim_mascot_asset_default_url || '').trim(),
    mascotAssetAboutUrl: String(settings.anim_mascot_asset_about_url || '').trim(),
    mascotAssetSkillsUrl: String(settings.anim_mascot_asset_skills_url || '').trim(),
    mascotAssetProjectsUrl: String(settings.anim_mascot_asset_projects_url || '').trim(),
    mascotAssetBlogUrl: String(settings.anim_mascot_asset_blog_url || '').trim(),
    mascotAssetContactUrl: String(settings.anim_mascot_asset_contact_url || '').trim(),
    mascotBubblesEnabled: parseBooleanSetting(settings.anim_mascot_bubbles_enabled, true),
    mascotBubbleIntervalMs: clampNumber(settings.anim_mascot_bubble_interval_ms, 1200, 12000, 4200),
    mascotBubbleMaxVisible: Math.round(clampNumber(settings.anim_mascot_bubble_max_visible, 1, 1, 1)),
    mascotBubbleMessages: parseBubbleMessages(settings.anim_mascot_bubble_messages),
    sceneAssetsEnabled: parseBooleanSetting(settings.anim_scene_assets_enabled, true),
    sceneAssetShowHero: parseBooleanSetting(settings.anim_scene_asset_show_hero, true),
    sceneAssetMobileEnabled: parseBooleanSetting(settings.anim_scene_asset_mobile_enabled, false),
    sceneAssetSizePx: clampNumber(settings.anim_scene_asset_size, 220, 760, 360) * Math.max(0.8, intensity),
    sceneAssetOpacity: clampNumber(settings.anim_scene_asset_opacity, 0.2, 1, 0.9),
    sceneAssetSpeed: clampNumber(settings.anim_scene_asset_speed, 0.5, 2.5, 1),
    sceneAssetFit: settings.anim_scene_asset_fit === 'cover' ? 'cover' : 'contain',
    sceneAssetDefaultUrl: String(settings.anim_scene_asset_default_url || '').trim(),
    sceneAssetHeroUrl: String(settings.anim_scene_asset_hero_url || '').trim(),
    sceneAssetAboutUrl: String(settings.anim_scene_asset_about_url || '').trim(),
    sceneAssetSkillsUrl: String(settings.anim_scene_asset_skills_url || '').trim(),
    sceneAssetProjectsUrl: String(settings.anim_scene_asset_projects_url || '').trim(),
    sceneAssetBlogUrl: String(settings.anim_scene_asset_blog_url || '').trim(),
    sceneAssetContactUrl: String(settings.anim_scene_asset_contact_url || '').trim(),
    spriteWanderEnabled: parseBooleanSetting(settings.anim_sprite_wander_enabled, true),
    spriteWanderSizePx: clampNumber(settings.anim_sprite_wander_size, 36, 140, 74) * Math.max(0.8, intensity),
    spriteWanderSpeed: clampNumber(settings.anim_sprite_wander_speed, 0.4, 2.6, 1) * Math.max(0.75, intensity),
    spriteWanderOpacity: clampNumber(settings.anim_sprite_wander_opacity, 0.2, 1, 0.88),
    spriteSideEnabled: parseBooleanSetting(settings.anim_sprite_side_enabled, true),
    spriteSideCount: Math.round(clampNumber(settings.anim_sprite_side_count, 1, 6, 2)),
    spriteSideSizePx: clampNumber(settings.anim_sprite_side_size, 36, 160, 92) * Math.max(0.8, intensity),
    spriteSideFrequencyMs: clampNumber(settings.anim_sprite_side_frequency_ms, 1400, 12000, 5200),
    spriteSideDurationMs: clampNumber(settings.anim_sprite_side_duration_ms, 700, 5000, 1700),
    spriteStyle: normalizeSpriteStyle(settings.anim_sprite_style),
    spritePath: settings.anim_sprite_path || 'orbit',
    spriteSidePattern: settings.anim_sprite_side_pattern || 'peek',
    spriteFlipEnabled: parseBooleanSetting(settings.anim_sprite_flip_enabled, true),
    spriteBouncePx: clampNumber(settings.anim_sprite_bounce_px, 0, 24, 8) * Math.max(0.85, intensity),
    spriteWanderRotationDeg: clampNumber(settings.anim_sprite_wander_rotation_deg, 0, 24, 8) * Math.max(0.8, intensity),
    spriteAssetFit: settings.anim_sprite_asset_fit === 'cover' ? 'cover' : 'contain',
    spriteAssetDefaultUrl: String(settings.anim_sprite_asset_default_url || '').trim(),
    spriteAssetWanderUrl: String(settings.anim_sprite_asset_wander_url || '').trim(),
    spriteAssetSideLeftUrl: String(settings.anim_sprite_asset_side_left_url || '').trim(),
    spriteAssetSideRightUrl: String(settings.anim_sprite_asset_side_right_url || '').trim(),
    scrollProgressEnabled: parseBooleanSetting(settings.anim_scroll_progress_enabled, true),
    scrollProgressThickness: clampNumber(settings.anim_scroll_progress_thickness, 2, 10, 4),
  }
}





