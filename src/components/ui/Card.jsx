import { useMemo, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'
import { getUiThemePrimitives } from '../../utils/themeSettings.js'

function buildCardChrome(uiPrimitives, isHovered) {
  const surfaceMix = Math.round(uiPrimitives.surfaceOpacity * 100)
  const borderMix = Math.round(uiPrimitives.surfaceBorderAlpha * 100)
  const accentMix = Math.round(uiPrimitives.accentBorderAlpha * 100)
  const glowMix = Math.round(52 * uiPrimitives.glowOpacity)
  const baseSurface = uiPrimitives.cardStyle === 'panel'
    ? 'var(--color-bg-secondary)'
    : 'var(--color-bg-card)'
  const backgroundColor = `color-mix(in srgb, ${baseSurface} ${surfaceMix}%, transparent)`
  const borderColor = isHovered
    ? `color-mix(in srgb, var(--color-accent) ${accentMix}%, var(--color-border))`
    : `color-mix(in srgb, var(--color-border) ${borderMix}%, transparent)`
  const shadowColor = isHovered
    ? `color-mix(in srgb, var(--color-accent-glow) ${glowMix}%, transparent)`
    : `color-mix(in srgb, var(--color-border) 20%, transparent)`
  const backgroundImage = uiPrimitives.cardStyle === 'showcase'
    ? 'linear-gradient(140deg, color-mix(in srgb, var(--color-accent-glow) 16%, transparent), transparent 42%)'
    : 'linear-gradient(140deg, color-mix(in srgb, var(--color-accent-glow) 8%, transparent), transparent 36%)'

  return {
    backgroundColor,
    backgroundImage,
    borderColor,
    boxShadow: `0 24px var(--ui-surface-shadow-blur) var(--ui-surface-shadow-spread) ${shadowColor}`,
    backdropFilter: uiPrimitives.surfaceBlurPx > 0 ? `blur(${uiPrimitives.surfaceBlurPx}px)` : 'none',
    WebkitBackdropFilter: uiPrimitives.surfaceBlurPx > 0 ? `blur(${uiPrimitives.surfaceBlurPx}px)` : 'none',
  }
}

export default function Card({ children, className = '' }) {
  const [isHovered, setIsHovered] = useState(false)
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
  const uiPrimitives = useMemo(() => getUiThemePrimitives(settings), [settings])

  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 20, mass: 0.35 })
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 20, mass: 0.35 })

  const canLift = animationConfig.canAnimate && animationConfig.cardHover
  const canTilt = canLift && animationConfig.cardTiltEnabled
  const hoverLift = Math.max(2, animationConfig.cardLiftPx * (uiPrimitives.hoverLiftPx / 10))
  const hoverScale = uiPrimitives.hoverScale
  const chromeStyle = buildCardChrome(uiPrimitives, isHovered)

  function handleMouseMove(event) {
    if (!canTilt) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) {
      return
    }

    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    const normalizedX = (px - 0.5) * 2
    const normalizedY = (py - 0.5) * 2

    rotateY.set(normalizedX * animationConfig.cardTiltMaxDeg)
    rotateX.set(-normalizedY * animationConfig.cardTiltMaxDeg)

    if (animationConfig.cardTiltGlareEnabled) {
      const intensity = Math.min(
        0.34,
        (0.12 + Math.abs(normalizedX * normalizedY) * 0.18) * uiPrimitives.glareOpacity
      )
      setGlare({
        x: px * 100,
        y: py * 100,
        opacity: intensity,
      })
    }
  }

  function handleMouseLeave() {
    setIsHovered(false)
    rotateX.set(0)
    rotateY.set(0)
    setGlare((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <motion.div
      className={`relative rounded-[var(--ui-radius-xl)] border p-[var(--ui-card-padding)] ${className}`}
      style={{
        ...chromeStyle,
        transition:
          'border-color var(--ui-transition-ms) ease, box-shadow var(--ui-transition-ms) ease, background-color var(--ui-transition-ms) ease',
        transformStyle: 'preserve-3d',
        rotateX: canTilt ? springRotateX : 0,
        rotateY: canTilt ? springRotateY : 0,
      }}
      whileHover={canLift ? { y: -hoverLift, scale: hoverScale } : undefined}
      transition={{ duration: 0.22 * animationConfig.durationScale, ease: animationConfig.easePreset }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {animationConfig.cardTiltGlareEnabled && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            opacity: canTilt && isHovered ? glare.opacity : 0,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, color-mix(in srgb, var(--color-accent-light) 34%, transparent), transparent 62%)`,
            transition: 'opacity 140ms ease',
          }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-[1]">{children}</div>
    </motion.div>
  )
}
