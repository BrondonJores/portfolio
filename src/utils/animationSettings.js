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
  { value: 'mixed', label: 'Mixte' },
  { value: 'robot', label: 'Robot' },
  { value: 'blob', label: 'Blob' },
]

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
    mascotCount: Math.round(clampNumber(settings.anim_mascot_count, 0, 8, 4)),
    mascotSizePx: clampNumber(settings.anim_mascot_size, 56, 180, 96) * Math.max(0.75, intensity),
    mascotSpeed: clampNumber(settings.anim_mascot_speed, 0.5, 2.5, 1) * Math.max(0.75, intensity),
    mascotOpacity: clampNumber(settings.anim_mascot_opacity, 0.2, 1, 0.85),
    mascotStyle: settings.anim_mascot_style || 'mixed',
    scrollProgressEnabled: parseBooleanSetting(settings.anim_scroll_progress_enabled, true),
    scrollProgressThickness: clampNumber(settings.anim_scroll_progress_thickness, 2, 10, 4),
  }
}
