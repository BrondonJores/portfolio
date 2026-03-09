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

const MascotLottiePlayer = lazy(() => import('./MascotLottiePlayer.jsx'))
const MascotRivePlayer = lazy(() => import('./MascotRivePlayer.jsx'))

const SECTION_ASSET_PRESETS = {
  hero: {
    position: { top: '8%', right: '1.5%' },
    sizeFactor: 1.08,
    driftX: -10,
    railSide: 'right',
    railOffsetFactor: 0.14,
  },
  about: {
    position: { top: '14%', right: '0.8%' },
    sizeFactor: 0.92,
    driftX: -8,
    railSide: 'right',
    railOffsetFactor: 0.2,
  },
  skills: {
    position: { top: '14%', left: '0.8%' },
    sizeFactor: 0.92,
    driftX: 8,
    railSide: 'left',
    railOffsetFactor: 0.2,
  },
  projects: {
    position: { top: '16%', right: '0.8%' },
    sizeFactor: 0.9,
    driftX: -8,
    railSide: 'right',
    railOffsetFactor: 0.22,
  },
  blog: {
    position: { top: '16%', left: '0.8%' },
    sizeFactor: 0.88,
    driftX: 8,
    railSide: 'left',
    railOffsetFactor: 0.22,
  },
  contact: {
    position: { bottom: '6%', right: '0.8%' },
    sizeFactor: 0.84,
    driftX: -6,
    railSide: 'right',
    railOffsetFactor: 0.16,
  },
  section: {
    position: { top: '12%', right: '0.8%' },
    sizeFactor: 0.9,
    driftX: -8,
    railSide: 'right',
    railOffsetFactor: 0.18,
  },
}

/**
 * Retourne le preset d'affichage d'un asset de scene selon la section.
 * @param {string} scope Cle de section.
 * @returns {{position:object,sizeFactor:number,driftX:number}} Preset de placement.
 */
function getSceneAssetPreset(scope) {
  return SECTION_ASSET_PRESETS[scope] || SECTION_ASSET_PRESETS.section
}

function getSceneMotionPreset(scope, animationConfig) {
  const intensity = Math.max(0.7, Number(animationConfig?.intensity) || 1)
  const speed = Math.max(0.45, Number(animationConfig?.sceneAssetSpeed) || 1)
  const durationScale = Math.max(0.6, Number(animationConfig?.durationScale) || 1)
  const baseDuration = (10.8 / speed) * durationScale

  switch (scope) {
    case 'hero':
      return {
        animate: {
          y: [0, -18 * intensity, 0, 12 * intensity, 0],
          x: [0, -14 * intensity, 0, 10 * intensity, 0],
          rotate: [-2.4, 2.1, -2.4],
          scale: [1, 1.03, 0.99, 1.02, 1],
        },
        transition: { duration: baseDuration * 1.05, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'about':
      return {
        animate: {
          y: [0, -10 * intensity, 0],
          x: [0, -6 * intensity, 6 * intensity, 0],
          rotate: [-1.2, 1.4, -1.2],
          scale: [1, 1.015, 1],
        },
        transition: { duration: baseDuration * 0.92, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'skills':
      return {
        animate: {
          y: [0, -8 * intensity, -15 * intensity, -6 * intensity, 0],
          x: [0, 14 * intensity, -10 * intensity, 8 * intensity, 0],
          rotate: [-1.8, 2.4, -2.2, 1.6, -1.8],
          scale: [1, 1.02, 0.985, 1.02, 1],
        },
        transition: { duration: baseDuration * 0.88, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'projects':
      return {
        animate: {
          y: [0, -15 * intensity, 0],
          x: [0, -12 * intensity, 0],
          rotate: [-2, 2, -2],
          scale: [1, 1.02, 1],
        },
        transition: { duration: baseDuration, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'blog':
      return {
        animate: {
          y: [0, -9 * intensity, 0],
          x: [0, 10 * intensity, -8 * intensity, 0],
          rotate: [0.6, -1.6, 1.3, 0.6],
          scale: [1, 1.01, 1],
        },
        transition: { duration: baseDuration * 0.94, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'contact':
      return {
        animate: {
          y: [0, -7 * intensity, 0],
          x: [0, -6 * intensity, 0],
          rotate: [-1, 1, -1],
          scale: [1, 1.015, 1],
        },
        transition: { duration: baseDuration * 0.9, repeat: Infinity, ease: 'easeInOut' },
      }
    default:
      return {
        animate: {
          y: [0, -12 * intensity, 0],
          x: [0, -8 * intensity, 0],
          rotate: [-2, 2, -2],
          scale: [1, 1.02, 1],
        },
        transition: { duration: baseDuration, repeat: Infinity, ease: 'easeInOut' },
      }
  }
}

/**
 * Resolve l'asset de scene de la section.
 * @param {object} config Config animation section.
 * @param {string} scope Cle section.
 * @returns {{url:string,mode:'video'|'image'|'lottie'|'rive'|'unsupported',fit:'contain'|'cover'}} Meta asset.
 */
function resolveSectionSceneAsset(config, scope) {
  const scopedMap = {
    hero: config.sceneAssetHeroUrl,
    about: config.sceneAssetAboutUrl,
    skills: config.sceneAssetSkillsUrl,
    projects: config.sceneAssetProjectsUrl,
    blog: config.sceneAssetBlogUrl,
    contact: config.sceneAssetContactUrl,
  }

  const scoped = sanitizeAnimationAssetUrl(scopedMap[scope])
  const fallback = sanitizeAnimationAssetUrl(config.sceneAssetDefaultUrl)
  const url = scoped || fallback

  return {
    url,
    mode: detectAnimationAssetMode(url),
    fit: normalizeAnimationAssetFit(config.sceneAssetFit),
  }
}

/**
 * Rend un asset scene selon son type media.
 * @param {{asset:{url:string,mode:'video'|'image'|'lottie'|'rive'|'unsupported'},fit:'contain'|'cover',onError:() => void}} props Props media.
 * @returns {JSX.Element | null} Media rendu.
 */
function SceneAssetRenderer({ asset, fit, onError }) {
  if (!asset?.url || asset.mode === 'unsupported') {
    return null
  }

  if (asset.mode === 'video') {
    return (
      <video
        src={asset.url}
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

  if (asset.mode === 'image') {
    return (
      <img
        src={asset.url}
        alt="Animation de section"
        className="w-full h-full"
        style={{ objectFit: fit }}
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    )
  }

  if (asset.mode === 'lottie') {
    return (
      <Suspense fallback={null}>
        <MascotLottiePlayer url={asset.url} fit={fit} onError={onError} />
      </Suspense>
    )
  }

  if (asset.mode === 'rive') {
    return (
      <Suspense fallback={null}>
        <MascotRivePlayer url={asset.url} fit={fit} onError={onError} />
      </Suspense>
    )
  }

  return null
}

/**
 * Affiche un grand asset anime (Lottie JSON/Rive/video/image) en decoration de section.
 * @param {{scope?:string,sceneKey?:string}} props Props composant.
 * @returns {JSX.Element | null} Overlay decoratif.
 */
export default function AnimatedSceneAsset({ scope = 'section', sceneKey = '' }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const isHero = scope === 'hero'
  const { targetRef, isVisible } = useVisibilityGate({
    disabled: isHero,
    once: true,
    rootMargin: '260px 0px 260px 0px',
    threshold: 0.01,
  })
  const resolvedSceneKey = sceneKey || scope
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), resolvedSceneKey),
    [settings, prefersReducedMotion, resolvedSceneKey]
  )
  const [assetLoadFailed, setAssetLoadFailed] = useState(false)
  const preset = getSceneAssetPreset(scope)
  const asset = useMemo(
    () => resolveSectionSceneAsset(animationConfig, scope),
    [animationConfig, scope]
  )
  const handleAssetError = useCallback(() => {
    setAssetLoadFailed(true)
  }, [])

  useEffect(() => {
    setAssetLoadFailed(false)
  }, [asset.url])


  const sceneMotion = useMemo(() => getSceneMotionPreset(scope, animationConfig), [scope, animationConfig])
  const canDisplay = animationConfig.sceneAssetsEnabled
    && (!isHero || animationConfig.sceneAssetShowHero)
  const canUseAsset = Boolean(asset.url) && asset.mode !== 'unsupported' && !assetLoadFailed
  const shouldRenderMedia = isHero || isVisible
  const shouldAnimate = animationConfig.canAnimate && shouldRenderMedia

  if (!canDisplay || !canUseAsset) {
    return null
  }

  const sizePx = Math.max(180, animationConfig.sceneAssetSizePx * preset.sizeFactor)
  const railOffsetPx = Math.round(sizePx * (preset.railOffsetFactor || 0))
  const className = animationConfig.sceneAssetMobileEnabled
    ? 'absolute pointer-events-none z-[5]'
    : 'absolute pointer-events-none z-[5] hidden md:block'

  return (
    <motion.div
      ref={targetRef}
      className={className}
      style={{
        ...preset.position,
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        marginLeft: preset.railSide === 'left' ? `-${railOffsetPx}px` : undefined,
        marginRight: preset.railSide === 'right' ? `-${railOffsetPx}px` : undefined,
        opacity: animationConfig.sceneAssetOpacity,
        filter: 'drop-shadow(0 18px 30px var(--color-accent-glow))',
      }}
      animate={shouldAnimate
        ? {
            ...sceneMotion.animate,
            x: Array.isArray(sceneMotion.animate?.x)
              ? sceneMotion.animate.x.map((value) => value + preset.driftX * 0.35)
              : sceneMotion.animate?.x,
          }
        : undefined}
      transition={shouldAnimate ? sceneMotion.transition : undefined}
      aria-hidden="true"
    >
      <div
        className="absolute inset-[-12%] rounded-full -z-10 opacity-45"
        style={{
          background: 'radial-gradient(circle at 35% 35%, var(--color-accent-glow) 0%, transparent 72%)',
          filter: 'blur(18px)',
        }}
      />
      {shouldRenderMedia && (
        <SceneAssetRenderer
          asset={asset}
          fit={asset.fit}
          onError={handleAssetError}
        />
      )}
    </motion.div>
  )
}
