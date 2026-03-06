/* Carte reutilisable avec hover anime configurable */
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

/**
 * Carte avec bordure accent au hover.
 * Les animations se pilotent via AdminSettings > Animations.
 */
export default function Card({ children, className = '' }) {
  const [isHovered, setIsHovered] = useState(false)
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )

  const animateHover = animationConfig.canAnimate && animationConfig.cardHover

  return (
    <motion.div
      className={`rounded-xl border p-6 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: isHovered ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: isHovered ? '0 0 15px var(--color-accent-glow)' : 'none',
        transition: 'border-color var(--ui-transition-ms) ease, box-shadow var(--ui-transition-ms) ease',
        transformStyle: 'preserve-3d',
      }}
      whileHover={animateHover ? {
        y: -animationConfig.cardLiftPx,
        scale: animationConfig.cardScale,
        rotateX: -animationConfig.cardTiltDeg,
        rotateY: animationConfig.cardTiltDeg,
      } : undefined}
      transition={{ duration: 0.2 * animationConfig.durationScale, ease: animationConfig.easePreset }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </motion.div>
  )
}
