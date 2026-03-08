const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const FONT_FAMILY_MAP = {
  inter: '"Inter Variable", sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  geometric: '"Trebuchet MS", "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  jetbrains: '"JetBrains Mono Variable", monospace',
}

export const FONT_FAMILY_OPTIONS = [
  { value: 'inter', label: 'Inter Variable' },
  { value: 'system', label: 'System UI' },
  { value: 'geometric', label: 'Geometric Sans' },
  { value: 'serif', label: 'Serif Classique' },
  { value: 'jetbrains', label: 'JetBrains Mono' },
]

export const DEFAULT_THEME_SETTINGS = {
  theme_dark_bg_primary: '#060b0f',
  theme_dark_bg_secondary: '#0a1118',
  theme_dark_bg_card: '#0f1a22',
  theme_dark_accent: '#00d4a8',
  theme_dark_accent_light: '#4df5d0',
  theme_dark_text_primary: '#e8f4f1',
  theme_dark_text_secondary: '#7a9fa0',
  theme_dark_border: '#132028',
  theme_light_bg_primary: '#f0faf8',
  theme_light_bg_secondary: '#e3f6f2',
  theme_light_bg_card: '#ffffff',
  theme_light_accent: '#00a688',
  theme_light_accent_light: '#00c49a',
  theme_light_text_primary: '#0a1f1c',
  theme_light_text_secondary: '#3d7a72',
  theme_light_border: '#b8e0d9',
  ui_font_body: 'inter',
  ui_font_heading: 'inter',
  ui_font_mono: 'jetbrains',
  ui_font_scale: '1',
  ui_radius_base: '12',
  ui_glow_strength: '1',
  ui_transition_speed: '300',
  ui_hero_blur: '80',
  ui_hero_speed_factor: '1',
  ui_navbar_blur: '12',
  ui_navbar_opacity: '0.7',
  ui_navbar_opacity_scrolled: '0.95',
  anim_enabled: 'true',
  anim_profile: 'balanced',
  anim_reduce_motion_mode: 'auto',
  anim_duration_scale: '1',
  anim_intensity: '1',
  anim_ease_preset: 'easeOut',
  anim_section_reveal_type: 'fade-up',
  anim_section_duration_ms: '650',
  anim_section_distance_px: '36',
  anim_section_once: 'true',
  anim_card_hover: 'true',
  anim_card_lift_px: '8',
  anim_card_scale: '1.02',
  anim_card_tilt_deg: '1.5',
  anim_cta_pulse: 'true',
  anim_cta_pulse_interval_ms: '1800',
  anim_mascots_enabled: 'true',
  anim_mascot_count: '1',
  anim_mascot_size: '340',
  anim_mascot_speed: '1',
  anim_mascot_opacity: '0.85',
  anim_mascot_style: 'asset',
  anim_mascot_show_hero: 'false',
  anim_mascot_asset_fit: 'contain',
  anim_mascot_asset_default_url: '',
  anim_mascot_asset_about_url: '',
  anim_mascot_asset_skills_url: '',
  anim_mascot_asset_projects_url: '',
  anim_mascot_asset_blog_url: '',
  anim_mascot_asset_contact_url: '',
  anim_mascot_bubbles_enabled: 'false',
  anim_mascot_bubble_interval_ms: '4200',
  anim_mascot_bubble_max_visible: '1',
  anim_mascot_bubble_messages: 'Salut !\nBienvenue sur mon portfolio.\nDiscutons de ton projet.',
  anim_scene_assets_enabled: 'true',
  anim_scene_asset_show_hero: 'true',
  anim_scene_asset_mobile_enabled: 'false',
  anim_scene_asset_size: '360',
  anim_scene_asset_opacity: '0.9',
  anim_scene_asset_speed: '1',
  anim_scene_asset_fit: 'contain',
  anim_scene_asset_default_url: '',
  anim_scene_asset_hero_url: '',
  anim_scene_asset_about_url: '',
  anim_scene_asset_skills_url: '',
  anim_scene_asset_projects_url: '',
  anim_scene_asset_blog_url: '',
  anim_scene_asset_contact_url: '',
  anim_sprite_wander_enabled: 'true',
  anim_sprite_wander_size: '74',
  anim_sprite_wander_speed: '1',
  anim_sprite_wander_opacity: '0.88',
  anim_sprite_side_enabled: 'true',
  anim_sprite_side_count: '2',
  anim_sprite_side_size: '92',
  anim_sprite_side_frequency_ms: '5200',
  anim_sprite_side_duration_ms: '1700',
  anim_sprite_style: 'asset-shared',
  anim_sprite_path: 'orbit',
  anim_sprite_side_pattern: 'peek',
  anim_sprite_flip_enabled: 'true',
  anim_sprite_bounce_px: '8',
  anim_sprite_wander_rotation_deg: '8',
  anim_sprite_asset_fit: 'contain',
  anim_sprite_asset_default_url: '',
  anim_sprite_asset_wander_url: '',
  anim_sprite_asset_side_left_url: '',
  anim_sprite_asset_side_right_url: '',
  anim_scene_hero: 'inherit',
  anim_scene_about: 'inherit',
  anim_scene_skills: 'inherit',
  anim_scene_projects: 'inherit',
  anim_scene_blog: 'inherit',
  anim_scene_contact: 'inherit',
  anim_scroll_progress_enabled: 'true',
  anim_scroll_progress_thickness: '4',
}

function clampNumber(rawValue, min, max, fallback) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(max, Math.max(min, parsed))
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  if (HEX_COLOR_REGEX.test(trimmed)) {
    return trimmed
  }
  return fallback
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeHexColor(hex, '#000000')
  const fullHex = normalized.length === 4
    ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
    : normalized

  const r = Number.parseInt(fullHex.slice(1, 3), 16)
  const g = Number.parseInt(fullHex.slice(3, 5), 16)
  const b = Number.parseInt(fullHex.slice(5, 7), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function resolveFontFamily(fontToken, fallbackToken) {
  const fallback = FONT_FAMILY_MAP[fallbackToken] || FONT_FAMILY_MAP.inter
  return FONT_FAMILY_MAP[fontToken] || fallback
}

function buildThemeConfig(settings = {}) {
  const durationScale = clampNumber(settings.anim_duration_scale, 0.6, 2, 1)
  const intensity = clampNumber(settings.anim_intensity, 0.4, 2.5, 1)

  return {
    darkBgPrimary: normalizeHexColor(settings.theme_dark_bg_primary, DEFAULT_THEME_SETTINGS.theme_dark_bg_primary),
    darkBgSecondary: normalizeHexColor(settings.theme_dark_bg_secondary, DEFAULT_THEME_SETTINGS.theme_dark_bg_secondary),
    darkBgCard: normalizeHexColor(settings.theme_dark_bg_card, DEFAULT_THEME_SETTINGS.theme_dark_bg_card),
    darkAccent: normalizeHexColor(settings.theme_dark_accent, DEFAULT_THEME_SETTINGS.theme_dark_accent),
    darkAccentLight: normalizeHexColor(settings.theme_dark_accent_light, DEFAULT_THEME_SETTINGS.theme_dark_accent_light),
    darkTextPrimary: normalizeHexColor(settings.theme_dark_text_primary, DEFAULT_THEME_SETTINGS.theme_dark_text_primary),
    darkTextSecondary: normalizeHexColor(settings.theme_dark_text_secondary, DEFAULT_THEME_SETTINGS.theme_dark_text_secondary),
    darkBorder: normalizeHexColor(settings.theme_dark_border, DEFAULT_THEME_SETTINGS.theme_dark_border),
    lightBgPrimary: normalizeHexColor(settings.theme_light_bg_primary, DEFAULT_THEME_SETTINGS.theme_light_bg_primary),
    lightBgSecondary: normalizeHexColor(settings.theme_light_bg_secondary, DEFAULT_THEME_SETTINGS.theme_light_bg_secondary),
    lightBgCard: normalizeHexColor(settings.theme_light_bg_card, DEFAULT_THEME_SETTINGS.theme_light_bg_card),
    lightAccent: normalizeHexColor(settings.theme_light_accent, DEFAULT_THEME_SETTINGS.theme_light_accent),
    lightAccentLight: normalizeHexColor(settings.theme_light_accent_light, DEFAULT_THEME_SETTINGS.theme_light_accent_light),
    lightTextPrimary: normalizeHexColor(settings.theme_light_text_primary, DEFAULT_THEME_SETTINGS.theme_light_text_primary),
    lightTextSecondary: normalizeHexColor(settings.theme_light_text_secondary, DEFAULT_THEME_SETTINGS.theme_light_text_secondary),
    lightBorder: normalizeHexColor(settings.theme_light_border, DEFAULT_THEME_SETTINGS.theme_light_border),
    fontBody: resolveFontFamily(settings.ui_font_body, DEFAULT_THEME_SETTINGS.ui_font_body),
    fontHeading: resolveFontFamily(settings.ui_font_heading, DEFAULT_THEME_SETTINGS.ui_font_heading),
    fontMono: resolveFontFamily(settings.ui_font_mono, DEFAULT_THEME_SETTINGS.ui_font_mono),
    fontScale: clampNumber(settings.ui_font_scale, 0.9, 1.2, 1),
    radiusPx: clampNumber(settings.ui_radius_base, 4, 24, 12),
    glowStrength: clampNumber(settings.ui_glow_strength, 0.3, 2, 1),
    transitionSpeedMs: clampNumber(settings.ui_transition_speed, 100, 800, 300) * durationScale,
    heroBlurPx: clampNumber(settings.ui_hero_blur, 30, 140, 80),
    heroSpeedFactor: clampNumber(settings.ui_hero_speed_factor, 0.5, 2, 1),
    navbarBlurPx: clampNumber(settings.ui_navbar_blur, 0, 24, 12),
    navbarOpacity: clampNumber(settings.ui_navbar_opacity, 0.45, 0.95, 0.7),
    navbarOpacityScrolled: clampNumber(settings.ui_navbar_opacity_scrolled, 0.6, 1, 0.95),
    durationScale,
    intensity,
    ctaPulseIntervalMs: clampNumber(settings.anim_cta_pulse_interval_ms, 900, 4000, 1800),
    mascotOpacity: clampNumber(settings.anim_mascot_opacity, 0.2, 1, 0.85),
    scrollProgressThickness: clampNumber(settings.anim_scroll_progress_thickness, 2, 10, 4),
  }
}

export function mergeWithThemeDefaults(settings = {}) {
  return { ...DEFAULT_THEME_SETTINGS, ...settings }
}

export function applyThemeSettings(settings = {}) {
  if (typeof document === 'undefined') {
    return
  }

  const config = buildThemeConfig(settings)
  const rootStyle = document.documentElement.style

  rootStyle.setProperty('--theme-dark-bg-primary', config.darkBgPrimary)
  rootStyle.setProperty('--theme-dark-bg-secondary', config.darkBgSecondary)
  rootStyle.setProperty('--theme-dark-bg-card', config.darkBgCard)
  rootStyle.setProperty('--theme-dark-accent', config.darkAccent)
  rootStyle.setProperty('--theme-dark-accent-light', config.darkAccentLight)
  rootStyle.setProperty('--theme-dark-accent-glow', hexToRgba(config.darkAccent, Math.min(0.6, 0.2 * config.glowStrength)))
  rootStyle.setProperty('--theme-dark-text-primary', config.darkTextPrimary)
  rootStyle.setProperty('--theme-dark-text-secondary', config.darkTextSecondary)
  rootStyle.setProperty('--theme-dark-border', config.darkBorder)

  rootStyle.setProperty('--theme-light-bg-primary', config.lightBgPrimary)
  rootStyle.setProperty('--theme-light-bg-secondary', config.lightBgSecondary)
  rootStyle.setProperty('--theme-light-bg-card', config.lightBgCard)
  rootStyle.setProperty('--theme-light-accent', config.lightAccent)
  rootStyle.setProperty('--theme-light-accent-light', config.lightAccentLight)
  rootStyle.setProperty('--theme-light-accent-glow', hexToRgba(config.lightAccent, Math.min(0.45, 0.12 * config.glowStrength)))
  rootStyle.setProperty('--theme-light-text-primary', config.lightTextPrimary)
  rootStyle.setProperty('--theme-light-text-secondary', config.lightTextSecondary)
  rootStyle.setProperty('--theme-light-border', config.lightBorder)

  rootStyle.setProperty('--theme-dark-navbar-bg', hexToRgba(config.darkBgSecondary, config.navbarOpacity))
  rootStyle.setProperty('--theme-dark-navbar-bg-scrolled', hexToRgba(config.darkBgSecondary, config.navbarOpacityScrolled))
  rootStyle.setProperty('--theme-light-navbar-bg', hexToRgba(config.lightBgSecondary, config.navbarOpacity))
  rootStyle.setProperty('--theme-light-navbar-bg-scrolled', hexToRgba(config.lightBgSecondary, config.navbarOpacityScrolled))

  rootStyle.setProperty('--font-family-body', config.fontBody)
  rootStyle.setProperty('--font-family-heading', config.fontHeading)
  rootStyle.setProperty('--font-family-mono', config.fontMono)
  rootStyle.setProperty('--ui-font-scale', String(config.fontScale))
  rootStyle.setProperty('--ui-radius-base', `${config.radiusPx}px`)
  rootStyle.setProperty('--ui-glow-strength', String(config.glowStrength))
  rootStyle.setProperty('--ui-transition-ms', `${config.transitionSpeedMs}ms`)
  rootStyle.setProperty('--ui-hero-blur', `${config.heroBlurPx}px`)
  rootStyle.setProperty('--ui-hero-speed-factor', String(config.heroSpeedFactor))
  rootStyle.setProperty('--ui-navbar-blur', `${config.navbarBlurPx}px`)
  rootStyle.setProperty('--anim-duration-scale', String(config.durationScale))
  rootStyle.setProperty('--anim-intensity', String(config.intensity))
  rootStyle.setProperty('--anim-cta-pulse-ms', `${config.ctaPulseIntervalMs}ms`)
  rootStyle.setProperty('--anim-mascot-opacity', String(config.mascotOpacity))
  rootStyle.setProperty('--anim-scroll-progress-thickness', `${config.scrollProgressThickness}px`)
}





