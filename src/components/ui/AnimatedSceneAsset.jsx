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
    sizeFactor: 1.2,
    driftX: -10,
  },
  about: {
    position: { top: '6%', right: '1.5%' },
    sizeFactor: 1.08,
    driftX: -8,
  },
  skills: {
    position: { top: '8%', left: '1.5%' },
    sizeFactor: 1.05,
    driftX: 8,
  },
  projects: {
    position: { top: '7%', right: '1.5%' },
    sizeFactor: 1.08,
    driftX: -8,
  },
  blog: {
    position: { top: '7%', left: '1.5%' },
    sizeFactor: 1.04,
    driftX: 8,
  },
  contact: {
    position: { top: '5%', right: '1.5%' },
    sizeFactor: 1.06,
    driftX: -8,
  },
  section: {
    position: { top: '8%', right: '1.5%' },
    sizeFactor: 1,
    driftX: -8,
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
 * Affiche un grand asset anime (dotLottie/Rive/video/image) en decoration de section.
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

  const canDisplay = animationConfig.sceneAssetsEnabled
    && (!isHero || animationConfig.sceneAssetShowHero)
  const canUseAsset = Boolean(asset.url) && asset.mode !== 'unsupported' && !assetLoadFailed
  const shouldRenderMedia = isHero || isVisible
  const shouldAnimate = animationConfig.canAnimate && shouldRenderMedia

  if (!canDisplay || !canUseAsset) {
    return null
  }

  const sizePx = Math.max(220, animationConfig.sceneAssetSizePx * preset.sizeFactor)
  const duration = 11 / Math.max(0.45, animationConfig.sceneAssetSpeed)
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
        opacity: animationConfig.sceneAssetOpacity,
        filter: 'drop-shadow(0 18px 30px var(--color-accent-glow))',
      }}
      animate={shouldAnimate
        ? {
            y: [0, -14, 0],
            x: [0, preset.driftX * Math.min(1.6, animationConfig.intensity), 0],
            rotate: [-2, 2, -2],
          }
        : undefined}
      transition={shouldAnimate
        ? {
            duration: duration * animationConfig.durationScale,
            repeat: Infinity,
            ease: 'easeInOut',
          }
        : undefined}
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
