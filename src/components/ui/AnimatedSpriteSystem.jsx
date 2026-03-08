import { motion, useReducedMotion } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'
import {
  detectAnimationAssetMode,
  normalizeAnimationAssetFit,
  sanitizeAnimationAssetUrl,
} from '../../utils/animationAsset.js'

const MascotLottiePlayer = lazy(() => import('./MascotLottiePlayer.jsx'))
const MascotRivePlayer = lazy(() => import('./MascotRivePlayer.jsx'))

/**
 * Construit la trajectoire du sprite principal selon le pattern choisi.
 * @param {string} spritePath Pattern selectionne.
 * @param {{width:number,height:number}} viewport Taille viewport.
 * @param {number} spriteSize Taille sprite en px.
 * @returns {{xPath:number[],yPath:number[],rotatePath:number[],flipPath:number[]}} Chemin anime.
 */
function buildWanderTrack(spritePath, viewport, spriteSize) {
  const minX = 40
  const minY = 40
  const maxX = Math.max(minX + spriteSize, viewport.width - spriteSize - minX)
  const maxY = Math.max(minY + spriteSize, viewport.height - spriteSize - minY)

  if (spritePath === 'zigzag') {
    return {
      xPath: [minX, maxX, minX + 30, maxX - 20, minX, maxX, minX],
      yPath: [maxY * 0.22, maxY * 0.34, maxY * 0.52, maxY * 0.62, maxY * 0.76, maxY * 0.86, maxY * 0.22],
      rotatePath: [0, 5, -5, 5, -5, 5, 0],
      flipPath: [1, -1, 1, -1, 1, -1, 1],
    }
  }

  if (spritePath === 'perimeter') {
    return {
      xPath: [minX, maxX, maxX, minX, minX],
      yPath: [minY, minY, maxY, maxY, minY],
      rotatePath: [0, 2, 0, -2, 0],
      flipPath: [1, 1, -1, -1, 1],
    }
  }

  return {
    xPath: [minX, maxX * 0.24, maxX * 0.78, maxX * 0.46, maxX * 0.12, maxX * 0.82, minX],
    yPath: [maxY * 0.2, maxY * 0.66, maxY * 0.3, maxY * 0.76, maxY * 0.4, maxY * 0.16, maxY * 0.2],
    rotatePath: [0, 6, -8, 4, -6, 2, 0],
    flipPath: [1, 1, -1, -1, 1, -1, 1],
  }
}

/**
 * Construit l'animation d'entree/sortie d'un sprite lateral.
 * @param {string} pattern Pattern lateral.
 * @param {'left'|'right'} edge Cote cible.
 * @param {number} sideSize Taille sprite lateral.
 * @param {number} baseOpacity Opacite nominale.
 * @param {number} bouncePx Intensite verticale.
 * @param {number} rotationDeg Rotation max.
 * @returns {{x:number[],y:number[],opacity:number[],rotate:number[]}} Keyframes lateral.
 */
function buildSideAnimation(pattern, edge, sideSize, baseOpacity, bouncePx, rotationDeg) {
  const isLeft = edge === 'left'
  const hiddenX = isLeft ? -sideSize * 0.95 : sideSize * 0.95
  const insideX = isLeft ? sideSize * 0.24 : -sideSize * 0.24
  const deepInsideX = isLeft ? sideSize * 0.72 : -sideSize * 0.72
  const peakOpacity = Math.min(1, baseOpacity * 0.96)
  const tilt = isLeft ? -Math.abs(rotationDeg) : Math.abs(rotationDeg)

  if (pattern === 'dash') {
    return {
      x: [hiddenX, deepInsideX, hiddenX],
      y: [0, -Math.max(3, bouncePx * 0.4), 0],
      opacity: [0, peakOpacity, 0],
      rotate: [0, tilt, 0],
    }
  }

  if (pattern === 'hop') {
    return {
      x: [hiddenX, insideX, hiddenX],
      y: [0, -Math.max(6, bouncePx), 0],
      opacity: [0, peakOpacity, 0],
      rotate: [tilt * 0.25, -tilt * 0.25, tilt * 0.25],
    }
  }

  return {
    x: [hiddenX, insideX, hiddenX],
    y: [0, 0, 0],
    opacity: [0, peakOpacity, 0],
    rotate: [0, 0, 0],
  }
}

/**
 * Calcule les positions verticales des sprites lateraux.
 * @param {number} sideCount Nombre de sprites.
 * @returns {number[]} Lignes en pourcentage.
 */
function buildSideRows(sideCount) {
  const count = Math.max(1, sideCount)
  if (count === 1) {
    return [38]
  }
  return Array.from({ length: count }, (_, i) => 16 + (68 / (count - 1)) * i)
}

/**
 * Derive les assets du moteur sprite (baladeur + lateraux).
 * @param {object} animationConfig Config globale animation.
 * @returns {{fit:'contain'|'cover',wander:{url:string,mode:string},sideLeft:{url:string,mode:string},sideRight:{url:string,mode:string}}} Meta assets.
 */
function resolveSpriteAssets(animationConfig) {
  const sharedDefaultUrl = sanitizeAnimationAssetUrl(animationConfig.spriteAssetDefaultUrl)
  const fallbackMascot = sanitizeAnimationAssetUrl(animationConfig.mascotAssetDefaultUrl)
  const isSplitMode = animationConfig.spriteStyle === 'asset-split'

  const wanderUrl = sanitizeAnimationAssetUrl(animationConfig.spriteAssetWanderUrl)
    || sharedDefaultUrl
    || fallbackMascot
  const sideLeftUrl = isSplitMode
    ? (sanitizeAnimationAssetUrl(animationConfig.spriteAssetSideLeftUrl) || sharedDefaultUrl || wanderUrl)
    : (sharedDefaultUrl || wanderUrl)
  const sideRightUrl = isSplitMode
    ? (sanitizeAnimationAssetUrl(animationConfig.spriteAssetSideRightUrl) || sharedDefaultUrl || sideLeftUrl || wanderUrl)
    : (sharedDefaultUrl || sideLeftUrl || wanderUrl)

  return {
    fit: normalizeAnimationAssetFit(animationConfig.spriteAssetFit),
    wander: {
      url: wanderUrl,
      mode: detectAnimationAssetMode(wanderUrl),
    },
    sideLeft: {
      url: sideLeftUrl,
      mode: detectAnimationAssetMode(sideLeftUrl),
    },
    sideRight: {
      url: sideRightUrl,
      mode: detectAnimationAssetMode(sideRightUrl),
    },
  }
}

/**
 * Rend un asset sprite selon son type media.
 * @param {{asset:{url:string,mode:'video'|'image'|'lottie'|'rive'|'unsupported'}, fit:'contain'|'cover', onError:() => void}} props Props rendu.
 * @returns {JSX.Element | null} Media sprite.
 */
function SpriteAssetRenderer({ asset, fit, onError }) {
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
        alt="Sprite anime"
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
 * Systeme global de sprites assets (dotLottie/Rive/video/image) en overlay.
 * @returns {JSX.Element | null} Overlay des sprites.
 */
export default function AnimatedSpriteSystem() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
  const [viewport, setViewport] = useState({ width: 1280, height: 720 })
  const [failedUrls, setFailedUrls] = useState({})

  const assets = useMemo(
    () => resolveSpriteAssets(animationConfig),
    [animationConfig]
  )

  const markAssetAsFailed = useCallback((url) => {
    if (!url) {
      return
    }
    setFailedUrls((previous) => {
      if (previous[url]) {
        return previous
      }
      return { ...previous, [url]: true }
    })
  }, [])

  useEffect(() => {
    setFailedUrls({})
  }, [assets.wander.url, assets.sideLeft.url, assets.sideRight.url])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  if (!animationConfig.canAnimate) {
    return null
  }

  const canUseAsset = (asset) =>
    Boolean(asset.url)
    && asset.mode !== 'unsupported'
    && !failedUrls[asset.url]

  const canRenderWander = animationConfig.spriteWanderEnabled && canUseAsset(assets.wander)
  const canRenderSideLeft = animationConfig.spriteSideEnabled && canUseAsset(assets.sideLeft)
  const canRenderSideRight = animationConfig.spriteSideEnabled && canUseAsset(assets.sideRight)

  if (!canRenderWander && !canRenderSideLeft && !canRenderSideRight) {
    return null
  }

  const wanderSize = animationConfig.spriteWanderSizePx
  const sideSize = animationConfig.spriteSideSizePx
  const wanderTrack = buildWanderTrack(animationConfig.spritePath, viewport, wanderSize)
  const wanderDuration = 24 / Math.max(0.3, animationConfig.spriteWanderSpeed) * animationConfig.durationScale
  const sideCount = animationConfig.spriteSideCount
  const sideDelay = Math.max(0.2, (animationConfig.spriteSideFrequencyMs - animationConfig.spriteSideDurationMs) / 1000)
  const sideRows = buildSideRows(sideCount)
  const flipPath = animationConfig.spriteFlipEnabled
    ? wanderTrack.flipPath
    : wanderTrack.flipPath.map(() => 1)
  const yPath = wanderTrack.yPath.map((value, index) =>
    value + (index % 2 === 0 ? 0 : -animationConfig.spriteBouncePx * 0.4)
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden" aria-hidden="true">
      {canRenderWander && (
        <motion.div
          className="absolute"
          style={{
            width: `${wanderSize}px`,
            height: `${wanderSize}px`,
            opacity: animationConfig.spriteWanderOpacity,
            filter: 'drop-shadow(0 14px 22px var(--color-accent-glow))',
          }}
          initial={{ x: wanderTrack.xPath[0], y: yPath[0], rotate: 0, scaleX: flipPath[0] }}
          animate={{
            x: wanderTrack.xPath,
            y: yPath,
            rotate: wanderTrack.rotatePath.map((value) =>
              Math.max(-animationConfig.spriteWanderRotationDeg, Math.min(animationConfig.spriteWanderRotationDeg, value))
            ),
            scaleX: flipPath,
          }}
          transition={{
            duration: wanderDuration,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <SpriteAssetRenderer
            asset={assets.wander}
            fit={assets.fit}
            onError={() => markAssetAsFailed(assets.wander.url)}
          />
        </motion.div>
      )}

      {(canRenderSideLeft || canRenderSideRight) && sideRows.map((top, index) => (
        <div key={`side-row-${index}`}>
          {canRenderSideLeft && (
            <motion.div
              className="absolute"
              style={{
                top: `${top}%`,
                left: 0,
                width: `${sideSize}px`,
                height: `${sideSize}px`,
                opacity: animationConfig.spriteWanderOpacity * 0.92,
                filter: 'drop-shadow(0 10px 16px var(--color-accent-glow))',
              }}
              initial={{ x: -sideSize * 0.85, opacity: 0 }}
              animate={buildSideAnimation(
                animationConfig.spriteSidePattern,
                'left',
                sideSize,
                animationConfig.spriteWanderOpacity,
                animationConfig.spriteBouncePx,
                animationConfig.spriteWanderRotationDeg
              )}
              transition={{
                duration: (animationConfig.spriteSideDurationMs / 1000) * animationConfig.durationScale,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: sideDelay,
                delay: index * 0.35,
              }}
            >
              <SpriteAssetRenderer
                asset={assets.sideLeft}
                fit={assets.fit}
                onError={() => markAssetAsFailed(assets.sideLeft.url)}
              />
            </motion.div>
          )}

          {canRenderSideRight && (
            <motion.div
              className="absolute"
              style={{
                top: `${top + 5}%`,
                right: 0,
                width: `${sideSize}px`,
                height: `${sideSize}px`,
                opacity: animationConfig.spriteWanderOpacity * 0.92,
                filter: 'drop-shadow(0 10px 16px var(--color-accent-glow))',
              }}
              initial={{ x: sideSize * 0.85, opacity: 0, scaleX: animationConfig.spriteFlipEnabled ? -1 : 1 }}
              animate={{
                ...buildSideAnimation(
                  animationConfig.spriteSidePattern,
                  'right',
                  sideSize,
                  animationConfig.spriteWanderOpacity,
                  animationConfig.spriteBouncePx,
                  animationConfig.spriteWanderRotationDeg
                ),
                scaleX: animationConfig.spriteFlipEnabled ? -1 : 1,
              }}
              transition={{
                duration: (animationConfig.spriteSideDurationMs / 1000) * animationConfig.durationScale,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: sideDelay,
                delay: index * 0.35 + 0.22,
              }}
            >
              <SpriteAssetRenderer
                asset={assets.sideRight}
                fit={assets.fit}
                onError={() => markAssetAsFailed(assets.sideRight.url)}
              />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
}
