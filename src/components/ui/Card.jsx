/* Carte reutilisable avec tilt 3D et glow pilotables depuis AdminSettings. */
import { useMemo, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

/**
 * Carte avec effet 3D au hover (inclinaison suivant la position du pointeur).
 * @param {{children: import('react').ReactNode, className?: string}} props Props composant.
 * @returns {JSX.Element} Carte interactive.
 */
export default function Card({ children, className = '' }) {
  const [isHovered, setIsHovered] = useState(false)
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )

  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 20, mass: 0.35 })
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 20, mass: 0.35 })

  const animateHover = animationConfig.canAnimate
    && animationConfig.cardHover
    && animationConfig.cardTiltEnabled

  /**
   * Met a jour l'inclinaison en fonction de la position curseur sur la carte.
   * @param {import('react').MouseEvent<HTMLDivElement>} event Evenement souris.
   * @returns {void}
   */
  function handleMouseMove(event) {
    if (!animateHover) {
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
      const intensity = Math.min(0.3, 0.12 + Math.abs(normalizedX * normalizedY) * 0.18)
      setGlare({
        x: px * 100,
        y: py * 100,
        opacity: intensity,
      })
    }
  }

  /**
   * Reinitialise la carte quand le pointeur sort de la zone.
   * @returns {void}
   */
  function handleMouseLeave() {
    setIsHovered(false)
    rotateX.set(0)
    rotateY.set(0)
    setGlare((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <motion.div
      className={`relative rounded-xl border p-6 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: isHovered ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: isHovered ? '0 0 18px var(--color-accent-glow)' : 'none',
        transition: 'border-color var(--ui-transition-ms) ease, box-shadow var(--ui-transition-ms) ease',
        transformStyle: 'preserve-3d',
        rotateX: animateHover ? springRotateX : 0,
        rotateY: animateHover ? springRotateY : 0,
      }}
      whileHover={animateHover ? {
        y: -animationConfig.cardLiftPx,
        scale: animationConfig.cardTiltScale,
      } : undefined}
      transition={{ duration: 0.22 * animationConfig.durationScale, ease: animationConfig.easePreset }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {animationConfig.cardTiltGlareEnabled && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            opacity: animateHover && isHovered ? glare.opacity : 0,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, color-mix(in srgb, var(--color-accent-light) 35%, transparent), transparent 62%)`,
            transition: 'opacity 140ms ease',
          }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-[1]">{children}</div>
    </motion.div>
  )
}