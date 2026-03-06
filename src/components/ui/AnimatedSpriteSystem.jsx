import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

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

function SpriteGlyph({ style, accent, accentLight, textColor }) {
  if (style === 'ghost') {
    return <GhostSprite accent={accent} accentLight={accentLight} textColor={textColor} />
  }
  if (style === 'rocket') {
    return <RocketSprite accent={accent} accentLight={accentLight} textColor={textColor} />
  }
  return <PixelSprite accent={accent} accentLight={accentLight} textColor={textColor} />
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
  const maxX = Math.max(wanderSize + 40, viewport.width - wanderSize - 40)
  const maxY = Math.max(wanderSize + 40, viewport.height - wanderSize - 40)
  const xPath = [40, maxX * 0.24, maxX * 0.78, maxX * 0.46, maxX * 0.12, maxX * 0.82, 40]
  const yPath = [maxY * 0.2, maxY * 0.66, maxY * 0.3, maxY * 0.76, maxY * 0.4, maxY * 0.16, maxY * 0.2]
  const wanderDuration = 24 / Math.max(0.3, animationConfig.spriteWanderSpeed) * animationConfig.durationScale
  const sideCount = animationConfig.spriteSideCount
  const sideDelay = Math.max(0.2, (animationConfig.spriteSideFrequencyMs - animationConfig.spriteSideDurationMs) / 1000)
  const sideRows = Array.from({ length: sideCount }, (_, i) => 16 + (68 / Math.max(1, sideCount - 1 || 1)) * i)

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
          initial={{ x: xPath[0], y: yPath[0], rotate: 0 }}
          animate={{
            x: xPath,
            y: yPath,
            rotate: [0, 6, -8, 4, -6, 2, 0],
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
            animate={{
              x: [-sideSize * 0.85, sideSize * 0.2, -sideSize * 0.85],
              opacity: [0, animationConfig.spriteWanderOpacity * 0.95, 0],
            }}
            transition={{
              duration: (animationConfig.spriteSideDurationMs / 1000) * animationConfig.durationScale,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: sideDelay,
              delay: index * 0.35,
            }}
          >
            <SpriteGlyph style={animationConfig.spriteStyle} accent={accent} accentLight={accentLight} textColor={textColor} />
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
            initial={{ x: sideSize * 0.85, opacity: 0, scaleX: -1 }}
            animate={{
              x: [sideSize * 0.85, -sideSize * 0.2, sideSize * 0.85],
              opacity: [0, animationConfig.spriteWanderOpacity * 0.95, 0],
            }}
            transition={{
              duration: (animationConfig.spriteSideDurationMs / 1000) * animationConfig.durationScale,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: sideDelay,
              delay: index * 0.35 + 0.22,
            }}
          >
            <SpriteGlyph style={animationConfig.spriteStyle} accent={accent} accentLight={accentLight} textColor={textColor} />
          </motion.div>
        </div>
      ))}
    </div>
  )
}
