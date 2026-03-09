import { motion, useReducedMotion } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useVisibilityGate } from '../../hooks/useVisibilityGate.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'
import {
  detectAnimationAssetMode,
  normalizeAnimationAssetFit,
  sanitizeAnimationAssetUrl,
} from '../../utils/animationAsset.js'

const SECTION_MASCOT_PRESETS = {
  about: {
    position: { top: '10%', left: '2%' },
    sizeFactor: 1.02,
    driftX: 8,
  },
  skills: {
    position: { top: '10%', right: '2%' },
    sizeFactor: 1,
    driftX: -8,
  },
  projects: {
    position: { top: '8%', left: '2%' },
    sizeFactor: 1,
    driftX: 8,
  },
  blog: {
    position: { top: '8%', right: '2%' },
    sizeFactor: 0.96,
    driftX: -8,
  },
  contact: {
    position: { top: '8%', left: '2%' },
    sizeFactor: 1,
    driftX: 8,
  },
  section: {
    position: { top: '8%', right: '2%' },
    sizeFactor: 1,
    driftX: -8,
  },
}

const BUBBLE_SCOPE_SET = new Set(['about', 'skills', 'projects', 'blog', 'contact', 'section'])
const MascotLottiePlayer = lazy(() => import('./MascotLottiePlayer.jsx'))
const MascotRivePlayer = lazy(() => import('./MascotRivePlayer.jsx'))

/**
 * Retourne le preset de placement d'une mascotte pour une section donnee.
 * @param {string} scope Cle de section.
 * @returns {{position: object, sizeFactor: number, driftX: number}} Preset de rendu.
 */
function getScopePreset(scope) {
  return SECTION_MASCOT_PRESETS[scope] || SECTION_MASCOT_PRESETS.section
}

function getMascotMotionPreset(scope, animationConfig, travel, driftX, index) {
  const intensity = Math.max(0.7, Number(animationConfig?.intensity) || 1)
  const speed = Math.max(0.4, Number(animationConfig?.mascotSpeed) || 1)
  const durationScale = Math.max(0.6, Number(animationConfig?.durationScale) || 1)
  const baseDuration = (8.1 / speed) * durationScale
  const phaseDelay = index * 0.18

  switch (scope) {
    case 'about':
      return {
        animate: {
          y: [0, -travel, 0],
          x: [0, driftX * 0.6 * intensity, 0],
          rotate: [-1.2, 1.2, -1.2],
          scale: [1, 1.015, 1],
        },
        transition: { duration: baseDuration * 0.95, repeat: Infinity, ease: 'easeInOut', delay: phaseDelay },
      }
    case 'skills':
      return {
        animate: {
          y: [0, -travel * 0.65, -travel * 1.15, 0],
          x: [0, driftX * 1.25 * intensity, driftX * -0.85 * intensity, 0],
          rotate: [-1.8, 2.6, -2.3, -1.8],
          scale: [1, 1.02, 0.99, 1],
        },
        transition: { duration: baseDuration * 0.88, repeat: Infinity, ease: 'easeInOut', delay: phaseDelay },
      }
    case 'projects':
      return {
        animate: {
          y: [0, -travel * 1.2, 0],
          x: [0, driftX * intensity, 0],
          rotate: [-2, 2, -2],
          scale: [1, 1.025, 1],
        },
        transition: { duration: baseDuration, repeat: Infinity, ease: 'easeInOut', delay: phaseDelay },
      }
    case 'blog':
      return {
        animate: {
          y: [0, -travel * 0.85, 0],
          x: [0, driftX * 1.05 * intensity, driftX * -0.75 * intensity, 0],
          rotate: [0.6, -1.4, 1.1, 0.6],
          scale: [1, 1.015, 1],
        },
        transition: { duration: baseDuration * 0.92, repeat: Infinity, ease: 'easeInOut', delay: phaseDelay },
      }
    case 'contact':
      return {
        animate: {
          y: [0, -travel * 0.7, 0],
          x: [0, driftX * 0.7 * intensity, 0],
          rotate: [-1, 1, -1],
          scale: [1, 1.012, 1],
        },
        transition: { duration: baseDuration * 0.9, repeat: Infinity, ease: 'easeInOut', delay: phaseDelay },
      }
    default:
      return {
        animate: {
          y: [0, -travel, 0],
          x: [0, driftX * intensity, 0],
          rotate: [-1.8, 1.8, -1.8],
          scale: [1, 1.02, 1],
        },
        transition: { duration: baseDuration, repeat: Infinity, ease: 'easeInOut', delay: phaseDelay },
      }
  }
}

/**
 * Resolve l'asset de mascotte a utiliser pour une section.
 * @param {object} config Configuration animation.
 * @param {string} scope Cle de section.
 * @returns {{url:string, mode:'video'|'image'|'lottie'|'rive'|'unsupported', fit:'contain'|'cover'}} Meta d'affichage.
 */
function resolveSectionAsset(config, scope) {
  const byScope = {
    about: config.mascotAssetAboutUrl,
    skills: config.mascotAssetSkillsUrl,
    projects: config.mascotAssetProjectsUrl,
    blog: config.mascotAssetBlogUrl,
    contact: config.mascotAssetContactUrl,
  }

  const scoped = sanitizeAnimationAssetUrl(byScope[scope])
  const fallback = sanitizeAnimationAssetUrl(config.mascotAssetDefaultUrl)
  const url = scoped || fallback

  return {
    url,
    mode: detectAnimationAssetMode(url),
    fit: normalizeAnimationAssetFit(config.mascotAssetFit),
  }
}

/**
 * Rend un media mascotte selon son type.
 * @param {{url:string, mode:'video'|'image'|'lottie'|'rive'|'unsupported', fit:'contain'|'cover', onError:() => void}} props Props rendu.
 * @returns {JSX.Element | null} Rendu du media.
 */
function MascotAssetRenderer({ url, mode, fit, onError }) {
  if (!url || mode === 'unsupported') {
    return null
  }

  if (mode === 'video') {
    return (
      <video
        src={url}
        className="w-full h-full"
        style={{ objectFit: fit }}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        onError={onError}
      />
    )
  }

  if (mode === 'image') {
    return (
      <img
        src={url}
        alt="Mascotte animee"
        className="w-full h-full"
        style={{ objectFit: fit }}
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    )
  }

  if (mode === 'lottie') {
    return (
      <Suspense fallback={null}>
        <MascotLottiePlayer url={url} fit={fit} onError={onError} />
      </Suspense>
    )
  }

  if (mode === 'rive') {
    return (
      <Suspense fallback={null}>
        <MascotRivePlayer url={url} fit={fit} onError={onError} />
      </Suspense>
    )
  }

  return null
}

/**
 * Affiche les mascottes de section en mode assets reels (Lottie JSON/Rive/video/image).
 * @param {{scope?: string, sceneKey?: string}} props Props composant.
 * @returns {JSX.Element | null} Overlay de mascotte ou null.
 */
export default function AnimatedMascots({ scope = 'hero', sceneKey = '' }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const isHero = scope === 'hero'
  const { targetRef, isVisible } = useVisibilityGate({
    disabled: isHero,
    once: true,
    rootMargin: '240px 0px 240px 0px',
    threshold: 0.01,
  })
  const resolvedSceneKey = sceneKey || (scope === 'hero' ? 'hero' : 'contact')
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), resolvedSceneKey),
    [settings, prefersReducedMotion, resolvedSceneKey]
  )

  const [bubbleCursor, setBubbleCursor] = useState(0)
  const [assetLoadFailed, setAssetLoadFailed] = useState(false)
  const asset = useMemo(
    () => resolveSectionAsset(animationConfig, scope),
    [animationConfig, scope]
  )
  const handleAssetError = useCallback(() => {
    setAssetLoadFailed(true)
  }, [])

  useEffect(() => {
    setAssetLoadFailed(false)
  }, [asset.url])

  const canDisplayMascot = (!isHero || animationConfig.mascotShowHero)
    && animationConfig.mascotsEnabled
    && animationConfig.mascotCount > 0

  const preset = getScopePreset(scope)
  const count = Math.min(animationConfig.mascotCount, 1)
  const supportsBubbles = BUBBLE_SCOPE_SET.has(scope)
  const bubbleCount = animationConfig.mascotBubblesEnabled && supportsBubbles
    ? Math.min(count, animationConfig.mascotBubbleMaxVisible)
    : 0
  const canUseAsset = Boolean(asset.url) && asset.mode !== 'unsupported' && !assetLoadFailed
  const shouldRenderAsset = isHero || isVisible
  const shouldAnimate = animationConfig.canAnimate && shouldRenderAsset

  useEffect(() => {
    if (!shouldAnimate || !animationConfig.mascotBubblesEnabled) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setBubbleCursor((prev) => prev + 1)
    }, animationConfig.mascotBubbleIntervalMs)

    return () => window.clearInterval(timer)
  }, [shouldAnimate, animationConfig.mascotBubblesEnabled, animationConfig.mascotBubbleIntervalMs])

  if (!canDisplayMascot || !canUseAsset) {
    return null
  }

  return (
    <div
      ref={targetRef}
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      aria-hidden="true"
    >
      {shouldRenderAsset && Array.from({ length: count }).map((_, index) => {
        const size = Math.max(160, animationConfig.mascotSizePx * preset.sizeFactor)
        const travel = Math.max(6, 10 * preset.sizeFactor)
        const motionPreset = getMascotMotionPreset(scope, animationConfig, travel, preset.driftX, index)
        const bubbleMessage = bubbleCount > index
          ? animationConfig.mascotBubbleMessages[(bubbleCursor + index) % animationConfig.mascotBubbleMessages.length]
          : null

        const motionProps = shouldAnimate
          ? {
              animate: motionPreset.animate,
              transition: motionPreset.transition,
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

            <MascotAssetRenderer
              url={asset.url}
              mode={asset.mode}
              fit={asset.fit}
              onError={handleAssetError}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
