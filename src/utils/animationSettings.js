const IMPORTABLE_ANIMATION_KEY_PATTERN = /^anim_[a-z0-9_]{1,80}$/i

export const ANIMATION_CORE_SETTING_KEYS = [
  'anim_enabled',
  'anim_duration_scale',
  'anim_intensity',
  'anim_ui_card_tilt_enabled',
  'anim_ui_card_tilt_max_deg',
  'anim_ui_card_tilt_scale',
  'anim_ui_card_tilt_glare_enabled',
  'anim_ui_button_micro_enabled',
  'anim_ui_button_hover_lift_px',
  'anim_ui_button_press_scale',
  'anim_ui_button_glow_boost',
  'anim_ui_button_ripple_enabled',
  'anim_ui_button_pulse_enabled',
  'anim_ui_button_pulse_interval_ms',
  'anim_ui_button_asset_enabled',
  'anim_ui_button_asset_fit',
  'anim_ui_button_asset_opacity',
  'anim_ui_button_asset_default_url',
  'anim_ui_button_asset_primary_url',
  'anim_ui_button_asset_secondary_url',
  'anim_ui_button_asset_ghost_url',
  'anim_cursor_enabled',
  'anim_cursor_size',
  'anim_cursor_ring_size',
  'anim_cursor_smoothness',
  'anim_cursor_idle_opacity',
  'anim_stats_counter_enabled',
  'anim_stats_counter_duration_ms',
  'anim_feedback_particles_enabled',
  'anim_feedback_particles_count',
  'anim_feedback_particles_spread_px',
  'anim_feedback_particles_duration_ms',
  'anim_page_transition_enabled',
  'anim_page_transition_duration_ms',
  'anim_page_transition_overlay_opacity',
  'anim_ui_scroll_reveal_type',
  'anim_ui_scroll_reveal_duration_ms',
  'anim_ui_scroll_reveal_distance_px',
  'anim_ui_scroll_reveal_once',
  'anim_ui_scroll_reveal_amount',
  'anim_ui_scroll_stagger_ms',
  'anim_ui_scroll_progress_enabled',
  'anim_ui_scroll_progress_thickness',
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

const SECTION_REVEAL_TYPES = new Set(['fade-up', 'fade', 'scale', 'slide-right'])

function normalizeRevealType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (SECTION_REVEAL_TYPES.has(normalized)) {
    return normalized
  }
  return 'fade-up'
}

function normalizeAssetFit(value) {
  return String(value || '').trim().toLowerCase() === 'contain' ? 'contain' : 'cover'
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
  const sectionRevealType = normalizeRevealType(settings.anim_ui_scroll_reveal_type)
  const sectionDurationMs = clampNumber(settings.anim_ui_scroll_reveal_duration_ms, 240, 1500, 650) * durationScale
  const sectionDistancePx = clampNumber(settings.anim_ui_scroll_reveal_distance_px, 8, 120, 36) * intensity
  const sectionOnce = parseBooleanSetting(settings.anim_ui_scroll_reveal_once, true)
  const sectionViewportAmount = clampNumber(settings.anim_ui_scroll_reveal_amount, 0.05, 0.6, 0.2)
  const sectionStaggerMs = clampNumber(settings.anim_ui_scroll_stagger_ms, 40, 320, 110)
  const buttonHoverLiftPx = clampNumber(settings.anim_ui_button_hover_lift_px, 0, 14, 5) * Math.max(0.8, intensity)
  const buttonPressScale = clampNumber(settings.anim_ui_button_press_scale, 0.9, 1, 0.97)
  const buttonGlowBoost = clampNumber(settings.anim_ui_button_glow_boost, 0.4, 2.5, 1)
  const buttonPulseIntervalMs = clampNumber(settings.anim_ui_button_pulse_interval_ms, 800, 5000, 1800)
  const buttonAssetOpacity = clampNumber(settings.anim_ui_button_asset_opacity, 0.15, 1, 0.82)
  const cardTiltMaxDeg = clampNumber(settings.anim_ui_card_tilt_max_deg, 2, 18, 10) * Math.max(0.75, intensity)
  const cardTiltScale = clampNumber(settings.anim_ui_card_tilt_scale, 1, 1.08, 1.03)
  const cursorSizePx = clampNumber(settings.anim_cursor_size, 6, 24, 14)
  const cursorRingSizePx = clampNumber(settings.anim_cursor_ring_size, 18, 72, 36)
  const cursorSmoothness = clampNumber(settings.anim_cursor_smoothness, 0.08, 0.35, 0.18)
  const cursorIdleOpacity = clampNumber(settings.anim_cursor_idle_opacity, 0.2, 1, 0.6)
  const statsCounterDurationMs = clampNumber(settings.anim_stats_counter_duration_ms, 400, 4000, 1200)
  const feedbackParticlesCount = Math.round(clampNumber(settings.anim_feedback_particles_count, 6, 40, 16))
  const feedbackParticlesSpreadPx = clampNumber(settings.anim_feedback_particles_spread_px, 24, 220, 88)
  const feedbackParticlesDurationMs = clampNumber(settings.anim_feedback_particles_duration_ms, 300, 2000, 700)
  const pageTransitionDurationMs = clampNumber(settings.anim_page_transition_duration_ms, 300, 3000, 850)
  const pageTransitionOverlayOpacity = clampNumber(settings.anim_page_transition_overlay_opacity, 0.3, 1, 0.86)
  const scrollProgressThickness = clampNumber(settings.anim_ui_scroll_progress_thickness, 2, 10, 4)

  return {
    enabled,
    canAnimate,
    reducedMotion,
    profile: 'assets-only',
    easePreset: 'easeInOut',
    durationScale,
    intensity,
    sectionRevealType,
    sectionDurationMs,
    sectionDistancePx,
    sectionOnce,
    sectionViewportAmount,
    sectionStaggerMs,
    cardHover: parseBooleanSetting(settings.anim_ui_card_tilt_enabled, true),
    cardLiftPx: 8 * intensity,
    cardScale: cardTiltScale,
    cardTiltDeg: cardTiltMaxDeg,
    cardTiltEnabled: parseBooleanSetting(settings.anim_ui_card_tilt_enabled, true),
    cardTiltMaxDeg,
    cardTiltScale,
    cardTiltGlareEnabled: parseBooleanSetting(settings.anim_ui_card_tilt_glare_enabled, true),
    buttonMicroEnabled: parseBooleanSetting(settings.anim_ui_button_micro_enabled, true),
    buttonHoverLiftPx,
    buttonPressScale,
    buttonGlowBoost,
    buttonRippleEnabled: parseBooleanSetting(settings.anim_ui_button_ripple_enabled, true),
    ctaPulse: parseBooleanSetting(settings.anim_ui_button_pulse_enabled, true),
    ctaPulseIntervalMs: buttonPulseIntervalMs / Math.max(0.7, intensity),
    buttonAssetEnabled: parseBooleanSetting(settings.anim_ui_button_asset_enabled, true),
    buttonAssetFit: normalizeAssetFit(settings.anim_ui_button_asset_fit),
    buttonAssetOpacity,
    buttonAssetDefaultUrl: toTrimmedString(settings.anim_ui_button_asset_default_url),
    buttonAssetPrimaryUrl: toTrimmedString(settings.anim_ui_button_asset_primary_url),
    buttonAssetSecondaryUrl: toTrimmedString(settings.anim_ui_button_asset_secondary_url),
    buttonAssetGhostUrl: toTrimmedString(settings.anim_ui_button_asset_ghost_url),
    cursorEnabled: parseBooleanSetting(settings.anim_cursor_enabled, false),
    cursorSizePx,
    cursorRingSizePx,
    cursorSmoothness,
    cursorIdleOpacity,
    statsCounterEnabled: parseBooleanSetting(settings.anim_stats_counter_enabled, true),
    statsCounterDurationMs,
    feedbackParticlesEnabled: parseBooleanSetting(settings.anim_feedback_particles_enabled, true),
    feedbackParticlesCount,
    feedbackParticlesSpreadPx,
    feedbackParticlesDurationMs,
    pageTransitionEnabled: parseBooleanSetting(settings.anim_page_transition_enabled, true),
    pageTransitionDurationMs,
    pageTransitionOverlayOpacity,
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
    scrollProgressEnabled: parseBooleanSetting(settings.anim_ui_scroll_progress_enabled, true),
    scrollProgressThickness,
  }
}
