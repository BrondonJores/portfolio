import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

const SECTION_MASCOT_PRESETS = {
  about: {
    position: { top: '10%', left: '2%' },
    sizeFactor: 1.02,
    type: 'human',
    driftX: 8,
  },
  skills: {
    position: { top: '10%', right: '2%' },
    sizeFactor: 1,
    type: 'human',
    driftX: -8,
  },
  projects: {
    position: { top: '8%', left: '2%' },
    sizeFactor: 1,
    type: 'human',
    driftX: 8,
  },
  blog: {
    position: { top: '8%', right: '2%' },
    sizeFactor: 0.96,
    type: 'human',
    driftX: -8,
  },
  contact: {
    position: { top: '8%', left: '2%' },
    sizeFactor: 1,
    type: 'human',
    driftX: 8,
  },
  section: {
    position: { top: '8%', right: '2%' },
    sizeFactor: 1,
    type: 'human',
    driftX: -8,
  },
}

const BUBBLE_SCOPE_SET = new Set(['about', 'skills', 'projects', 'blog', 'contact', 'section'])

/**
 * Retourne le preset de placement d'une mascotte pour une section donnee.
 * @param {string} scope Cle de section.
 * @returns {{position: object, sizeFactor: number, type: string, driftX: number}} Preset de rendu.
 */
function getScopePreset(scope) {
  return SECTION_MASCOT_PRESETS[scope] || SECTION_MASCOT_PRESETS.section
}

/**
 * Filtre une URL externe pour eviter les protocoles dangereux.
 * @param {unknown} rawValue URL brute provenant des settings.
 * @returns {string} URL nettoyee, ou chaine vide si invalide.
 */
function sanitizeAssetUrl(rawValue) {
  if (typeof rawValue !== 'string') {
    return ''
  }

  const value = rawValue.trim()
  if (!value) {
    return ''
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
    return value
  }

  return ''
}

/**
 * Resolve l'URL d'asset a utiliser pour la section.
 * @param {object} config Configuration animation.
 * @param {string} scope Cle de section.
 * @returns {string} URL finalement retenue.
 */
function resolveSectionAssetUrl(config, scope) {
  const byScope = {
    about: config.mascotAssetAboutUrl,
    skills: config.mascotAssetSkillsUrl,
    projects: config.mascotAssetProjectsUrl,
    blog: config.mascotAssetBlogUrl,
    contact: config.mascotAssetContactUrl,
  }

  const scoped = sanitizeAssetUrl(byScope[scope])
  if (scoped) {
    return scoped
  }
  return sanitizeAssetUrl(config.mascotAssetDefaultUrl)
}

/**
 * Detecte le mode de rendu d'un asset media.
 * @param {string} url URL asset.
 * @returns {'video'|'image'|'unsupported'} Type de rendu.
 */
function detectAssetMode(url) {
  const clean = String(url || '').split('?')[0].toLowerCase()
  if (!clean) return 'unsupported'

  if (/\.(webm|mp4|m4v|ogg|mov)$/.test(clean)) {
    return 'video'
  }

  if (/\.(gif|webp|png|jpg|jpeg|svg|avif)$/.test(clean)) {
    return 'image'
  }

  return 'unsupported'
}

function resolveMascotType(styleToken, scope) {
  if (styleToken === 'robot' || styleToken === 'blob' || styleToken === 'human') {
    return styleToken
  }

  if (styleToken === 'mixed') {
    return scope === 'blog' ? 'blob' : 'human'
  }

  return getScopePreset(scope).type
}

function RobotMascot({ accent, accentLight, textColor }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <rect x="22" y="26" width="76" height="70" rx="18" fill="color-mix(in srgb, var(--color-bg-card) 88%, white)" stroke={accent} strokeWidth="3" />
      <rect x="35" y="42" width="50" height="30" rx="12" fill="color-mix(in srgb, var(--color-bg-secondary) 80%, black)" />
      <circle cx="50" cy="57" r="5.5" fill={accentLight} />
      <circle cx="70" cy="57" r="5.5" fill={accentLight} />
      <rect x="50" y="14" width="20" height="12" rx="5" fill={accent} />
      <circle cx="60" cy="12" r="6" fill={accentLight} />
      <rect x="46" y="76" width="28" height="6" rx="3" fill={textColor} opacity="0.5" />
    </svg>
  )
}

function BlobMascot({ accent, accentLight, textColor }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <path
        d="M64.5 16.5c17.7 2.7 32.3 17.3 36.6 35 4.2 17.3-2.6 37-17.4 48.1-14.4 10.7-36.6 13.2-52.3 4.5-16-8.8-25.1-29-21.2-47.1 3.8-18 20.3-33.6 37.8-38.8 4.9-1.4 10.3-2.2 16.5-1.7Z"
        fill="color-mix(in srgb, var(--color-accent-glow) 55%, var(--color-bg-card))"
        stroke={accent}
        strokeWidth="2.8"
      />
      <circle cx="46" cy="58" r="6" fill={accentLight} />
      <circle cx="71" cy="56" r="6" fill={accentLight} />
      <path d="M43 76c9 9 23 9 33 0" stroke={textColor} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.65" />
    </svg>
  )
}

function HumanMascot({ accent, accentLight, textColor, pace = 1 }) {
  const swingDuration = 1.1 / Math.max(0.55, pace)

  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="w-full h-full"
      aria-hidden="true"
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 1.2 / Math.max(0.5, pace), repeat: Infinity, ease: 'easeInOut' }}
    >
      <circle cx="60" cy="24" r="11" fill="color-mix(in srgb, var(--color-bg-card) 60%, #ffe2c2)" stroke={accent} strokeWidth="2.3" />
      <rect x="43" y="37" width="34" height="30" rx="11" fill="color-mix(in srgb, var(--color-bg-card) 82%, white)" stroke={accent} strokeWidth="2.4" />
      <rect x="49" y="66" width="22" height="7" rx="3.5" fill={accentLight} opacity="0.72" />

      <motion.g
        style={{ transformOrigin: '48px 43px' }}
        animate={{ rotate: [-12, 14, -12] }}
        transition={{ duration: swingDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="42" y="43" width="9" height="30" rx="4.5" fill="color-mix(in srgb, var(--color-bg-card) 78%, white)" stroke={accent} strokeWidth="1.4" />
      </motion.g>

      <rect x="69" y="43" width="9" height="28" rx="4.5" fill="color-mix(in srgb, var(--color-bg-card) 78%, white)" stroke={accent} strokeWidth="1.4" />
      <rect x="50" y="72" width="9" height="32" rx="4.5" fill="color-mix(in srgb, var(--color-bg-secondary) 65%, black)" />
      <rect x="61" y="72" width="9" height="32" rx="4.5" fill="color-mix(in srgb, var(--color-bg-secondary) 65%, black)" />
      <rect x="46" y="104" width="16" height="5" rx="2.5" fill={accent} />
      <rect x="58" y="104" width="16" height="5" rx="2.5" fill={accent} />
      <path d="M52 28c4 3 12 3 16 0" stroke={textColor} strokeWidth="2.2" strokeLinecap="round" opacity="0.58" />
    </motion.svg>
  )
}

export default function AnimatedMascots({ scope = 'hero', sceneKey = '' }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const resolvedSceneKey = sceneKey || (scope === 'hero' ? 'hero' : 'contact')
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), resolvedSceneKey),
    [settings, prefersReducedMotion, resolvedSceneKey]
  )

  const [bubbleCursor, setBubbleCursor] = useState(0)
  const [assetLoadFailed, setAssetLoadFailed] = useState(false)

  const isHero = scope === 'hero'
  const canDisplayMascot = (!isHero || animationConfig.mascotShowHero)
    && animationConfig.mascotsEnabled
    && animationConfig.mascotCount > 0

  const preset = getScopePreset(scope)
  const count = Math.min(animationConfig.mascotCount, 1)
  const shouldAnimate = animationConfig.canAnimate
  const accent = 'var(--color-accent)'
  const accentLight = 'var(--color-accent-light)'
  const textColor = 'var(--color-text-primary)'
  const supportsBubbles = BUBBLE_SCOPE_SET.has(scope)
  const bubbleCount = animationConfig.mascotBubblesEnabled && supportsBubbles
    ? Math.min(count, animationConfig.mascotBubbleMaxVisible)
    : 0

  const assetUrl = resolveSectionAssetUrl(animationConfig, scope)
  const assetMode = detectAssetMode(assetUrl)
  const canUseAsset = Boolean(assetUrl) && assetMode !== 'unsupported' && !assetLoadFailed

  useEffect(() => {
    setAssetLoadFailed(false)
  }, [assetUrl])

  useEffect(() => {
    if (!shouldAnimate || !animationConfig.mascotBubblesEnabled) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setBubbleCursor((prev) => prev + 1)
    }, animationConfig.mascotBubbleIntervalMs)

    return () => window.clearInterval(timer)
  }, [shouldAnimate, animationConfig.mascotBubblesEnabled, animationConfig.mascotBubbleIntervalMs])

  if (!canDisplayMascot) {
    return null
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-visible" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => {
        const type = resolveMascotType(animationConfig.mascotStyle, scope)
        const size = Math.max(160, animationConfig.mascotSizePx * preset.sizeFactor)
        const travel = Math.max(6, 10 * preset.sizeFactor)
        const duration = 8.2 / Math.max(0.4, animationConfig.mascotSpeed)
        const bubbleMessage = bubbleCount > index
          ? animationConfig.mascotBubbleMessages[(bubbleCursor + index) % animationConfig.mascotBubbleMessages.length]
          : null

        const motionProps = shouldAnimate
          ? {
              animate: {
                y: [0, -travel, 0],
                x: [0, preset.driftX * animationConfig.intensity, 0],
                rotate: [-1.8, 1.8, -1.8],
              },
              transition: {
                duration,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }
          : {}

        return (
          <motion.div
            key={`${scope}-mascot-${index}`}
            className="absolute"
            style={{
              ...preset.position,
              width: `${size}px`,
              height: `${size}px`,
              opacity: animationConfig.mascotOpacity,
              filter: 'drop-shadow(0 14px 26px var(--color-accent-glow))',
            }}
            {...motionProps}
          >
            <div
              className="absolute inset-[-16%] rounded-full -z-10 opacity-55"
              style={{
                background: 'radial-gradient(circle at 40% 38%, var(--color-accent-glow) 0%, transparent 70%)',
                filter: 'blur(14px)',
              }}
            />

            {bubbleMessage && (
              <motion.div
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border text-[10px] font-medium whitespace-nowrap"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 94%, white)',
                  color: 'var(--color-text-secondary)',
                }}
                animate={shouldAnimate ? { opacity: [0.72, 1, 0.72], y: [0, -2, 0] } : undefined}
                transition={shouldAnimate
                  ? {
                      duration: Math.max(1.2, animationConfig.mascotBubbleIntervalMs / 1500),
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : undefined}
              >
                {bubbleMessage}
              </motion.div>
            )}

            {canUseAsset && assetMode === 'video' && (
              <video
                src={assetUrl}
                className="w-full h-full"
                style={{ objectFit: animationConfig.mascotAssetFit }}
                muted
                autoPlay
                loop
                playsInline
                onError={() => setAssetLoadFailed(true)}
              />
            )}

            {canUseAsset && assetMode === 'image' && (
              <img
                src={assetUrl}
                alt="Mascotte animee"
                className="w-full h-full"
                style={{ objectFit: animationConfig.mascotAssetFit }}
                loading="lazy"
                decoding="async"
                onError={() => setAssetLoadFailed(true)}
              />
            )}

            {!canUseAsset && type === 'robot' && (
              <RobotMascot accent={accent} accentLight={accentLight} textColor={textColor} />
            )}
            {!canUseAsset && type === 'blob' && (
              <BlobMascot accent={accent} accentLight={accentLight} textColor={textColor} />
            )}
            {!canUseAsset && type === 'human' && (
              <HumanMascot
                accent={accent}
                accentLight={accentLight}
                textColor={textColor}
                pace={animationConfig.mascotSpeed}
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
