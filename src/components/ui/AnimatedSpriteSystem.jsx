import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

const HUMAN_SPRITE_VARIANTS = ['walker', 'hoodie', 'skater', 'coder']

function PixelSprite({ accent, accentLight, textColor }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <rect x="28" y="20" width="64" height="72" rx="10" fill="color-mix(in srgb, var(--color-bg-card) 88%, white)" stroke={accent} strokeWidth="3" />
      <rect x="44" y="40" width="10" height="10" fill={accentLight} />
      <rect x="66" y="40" width="10" height="10" fill={accentLight} />
      <rect x="50" y="58" width="20" height="6" fill={textColor} opacity="0.75" />
      <rect x="38" y="92" width="44" height="12" rx="4" fill={accent} />
      <rect x="52" y="8" width="16" height="12" rx="3" fill={accentLight} />
    </svg>
  )
}

function GhostSprite({ accent, accentLight, textColor }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <path
        d="M60 14c24 0 40 18 40 41v41c0 2-2 3-4 2l-10-7-8 7a3 3 0 0 1-4 0l-8-7-8 7a3 3 0 0 1-4 0l-8-7-8 7a3 3 0 0 1-4 0l-8-7-8 7c-2 1-4 0-4-2V55c0-23 16-41 40-41Z"
        fill="color-mix(in srgb, var(--color-accent-glow) 55%, var(--color-bg-card))"
        stroke={accent}
        strokeWidth="3"
      />
      <circle cx="47" cy="52" r="6" fill={accentLight} />
      <circle cx="73" cy="52" r="6" fill={accentLight} />
      <path d="M45 72c8 7 22 7 30 0" stroke={textColor} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  )
}

function RocketSprite({ accent, accentLight, textColor }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <path
        d="M60 10c18 16 25 36 20 58L60 96 40 68c-5-22 2-42 20-58Z"
        fill="color-mix(in srgb, var(--color-bg-card) 88%, white)"
        stroke={accent}
        strokeWidth="3"
      />
      <circle cx="60" cy="44" r="10" fill={accentLight} />
      <path d="M40 68 24 82l16 4 8-12" fill={accent} />
      <path d="M80 68 96 82l-16 4-8-12" fill={accent} />
      <path d="M60 96c0 0-4 10-12 14 9 2 15-2 20-8 3 4 6 6 12 7-6-6-10-13-10-13Z" fill={textColor} opacity="0.7" />
    </svg>
  )
}

function HumanSprite({ variant, accent, accentLight, textColor, pace, bouncePx }) {
  const swingDuration = 0.72 / Math.max(0.55, pace)
  const bobDuration = 0.95 / Math.max(0.55, pace)
  const bobOffset = Math.max(2, bouncePx * 0.25)

  const jacketColor = variant === 'hoodie'
    ? 'color-mix(in srgb, var(--color-bg-card) 72%, var(--color-accent-light))'
    : variant === 'coder'
      ? 'color-mix(in srgb, var(--color-bg-card) 70%, var(--color-accent))'
      : 'color-mix(in srgb, var(--color-bg-card) 82%, white)'
  const pantsColor = variant === 'skater'
    ? 'color-mix(in srgb, var(--color-bg-secondary) 55%, black)'
    : 'color-mix(in srgb, var(--color-bg-secondary) 65%, black)'
  const accessoryColor = variant === 'coder'
    ? textColor
    : accent

  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="w-full h-full"
      aria-hidden="true"
      animate={{ y: [0, -bobOffset, 0] }}
      transition={{ duration: bobDuration, repeat: Infinity, ease: 'easeInOut' }}
    >
      <circle cx="60" cy="24" r="10.5" fill="color-mix(in srgb, var(--color-bg-card) 60%, #ffe2c2)" stroke={accent} strokeWidth="2.2" />

      {variant === 'hoodie' && (
        <path
          d="M42 28c2-8 10-14 18-14s16 6 18 14l-6 7c-3-4-7-6-12-6s-9 2-12 6l-6-7Z"
          fill="color-mix(in srgb, var(--color-accent) 35%, var(--color-bg-secondary))"
          stroke={accent}
          strokeWidth="2"
        />
      )}

      {variant === 'skater' && (
        <rect
          x="53"
          y="10"
          width="14"
          height="5"
          rx="2.5"
          fill={accentLight}
          stroke={accent}
          strokeWidth="1.4"
        />
      )}

      <rect x="44" y="36" width="32" height="30" rx="10" fill={jacketColor} stroke={accent} strokeWidth="2.4" />
      <rect x="50" y="65" width="20" height="8" rx="4" fill={accentLight} opacity="0.75" />

      <motion.g
        style={{ transformOrigin: '50px 42px' }}
        animate={{ rotate: [-16, 14, -16] }}
        transition={{ duration: swingDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="44" y="42" width="8" height="30" rx="4" fill={jacketColor} stroke={accent} strokeWidth="1.6" />
      </motion.g>

      <motion.g
        style={{ transformOrigin: '70px 42px' }}
        animate={{ rotate: [14, -16, 14] }}
        transition={{ duration: swingDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="68" y="42" width="8" height="30" rx="4" fill={jacketColor} stroke={accent} strokeWidth="1.6" />
      </motion.g>

      <motion.g
        style={{ transformOrigin: '55px 74px' }}
        animate={{ rotate: [12, -10, 12] }}
        transition={{ duration: swingDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="50" y="72" width="10" height="32" rx="5" fill={pantsColor} />
      </motion.g>

      <motion.g
        style={{ transformOrigin: '65px 74px' }}
        animate={{ rotate: [-10, 12, -10] }}
        transition={{ duration: swingDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="60" y="72" width="10" height="32" rx="5" fill={pantsColor} />
      </motion.g>

      <rect x="46" y="103" width="16" height="5.5" rx="2.75" fill={accent} />
      <rect x="58" y="103" width="16" height="5.5" rx="2.75" fill={accent} />

      {variant === 'walker' && (
        <path d="M77 38 92 50l-8 22-7-7 6-15-11-9Z" fill={accessoryColor} opacity="0.78" />
      )}

      {variant === 'coder' && (
        <>
          <rect x="77" y="58" width="21" height="13" rx="2.8" fill="color-mix(in srgb, var(--color-bg-secondary) 80%, black)" stroke={accentLight} strokeWidth="1.8" />
          <rect x="81" y="62" width="13" height="2.5" rx="1.25" fill={accentLight} opacity="0.78" />
        </>
      )}

      {variant === 'skater' && (
        <>
          <rect x="30" y="104" width="60" height="5" rx="2.5" fill={accessoryColor} />
          <circle cx="40" cy="111" r="4" fill={accentLight} />
          <circle cx="80" cy="111" r="4" fill={accentLight} />
        </>
      )}
    </motion.svg>
  )
}

function resolveHumanVariant(style, seed) {
  if (style === 'mixed-human') {
    return HUMAN_SPRITE_VARIANTS[Math.abs(seed) % HUMAN_SPRITE_VARIANTS.length]
  }
  if (HUMAN_SPRITE_VARIANTS.includes(style)) {
    return style
  }
  return null
}

function SpriteGlyph({ style, accent, accentLight, textColor, pace = 1, bouncePx = 8, seed = 0 }) {
  const humanVariant = resolveHumanVariant(style, seed)
  if (humanVariant) {
    return (
      <HumanSprite
        variant={humanVariant}
        accent={accent}
        accentLight={accentLight}
        textColor={textColor}
        pace={pace}
        bouncePx={bouncePx}
      />
    )
  }

  if (style === 'ghost') {
    return <GhostSprite accent={accent} accentLight={accentLight} textColor={textColor} />
  }
  if (style === 'rocket') {
    return <RocketSprite accent={accent} accentLight={accentLight} textColor={textColor} />
  }
  return <PixelSprite accent={accent} accentLight={accentLight} textColor={textColor} />
}

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

function buildSideRows(sideCount) {
  const count = Math.max(1, sideCount)
  if (count === 1) {
    return [38]
  }
  return Array.from({ length: count }, (_, i) => 16 + (68 / (count - 1)) * i)
}

export default function AnimatedSpriteSystem() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
  const [viewport, setViewport] = useState({ width: 1280, height: 720 })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

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

  const accent = 'var(--color-accent)'
  const accentLight = 'var(--color-accent-light)'
  const textColor = 'var(--color-text-primary)'

  const wanderSize = animationConfig.spriteWanderSizePx
  const sideSize = animationConfig.spriteSideSizePx
  const wanderTrack = buildWanderTrack(animationConfig.spritePath, viewport, wanderSize)
  const wanderDuration = 24 / Math.max(0.3, animationConfig.spriteWanderSpeed) * animationConfig.durationScale
  const sideCount = animationConfig.spriteSideCount
  const sideDelay = Math.max(0.2, (animationConfig.spriteSideFrequencyMs - animationConfig.spriteSideDurationMs) / 1000)
  const sideRows = buildSideRows(sideCount)
  const spritePace = Math.max(0.55, animationConfig.spriteWanderSpeed)
  const flipPath = animationConfig.spriteFlipEnabled
    ? wanderTrack.flipPath
    : wanderTrack.flipPath.map(() => 1)
  const yPath = wanderTrack.yPath.map((value, index) =>
    value + (index % 2 === 0 ? 0 : -animationConfig.spriteBouncePx * 0.4)
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden" aria-hidden="true">
      {animationConfig.spriteWanderEnabled && (
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
          <SpriteGlyph
            style={animationConfig.spriteStyle}
            accent={accent}
            accentLight={accentLight}
            textColor={textColor}
            pace={spritePace}
            bouncePx={animationConfig.spriteBouncePx}
            seed={10}
          />
        </motion.div>
      )}

      {animationConfig.spriteSideEnabled && sideRows.map((top, index) => (
        <div key={`side-row-${index}`}>
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
            <SpriteGlyph
              style={animationConfig.spriteStyle}
              accent={accent}
              accentLight={accentLight}
              textColor={textColor}
              pace={spritePace}
              bouncePx={animationConfig.spriteBouncePx}
              seed={index * 2 + 1}
            />
          </motion.div>

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
            <SpriteGlyph
              style={animationConfig.spriteStyle}
              accent={accent}
              accentLight={accentLight}
              textColor={textColor}
              pace={spritePace}
              bouncePx={animationConfig.spriteBouncePx}
              seed={index * 2 + 2}
            />
          </motion.div>
        </div>
      ))}
    </div>
  )
}
