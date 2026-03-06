import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion'
import { useMemo } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

export default function ScrollProgressBar() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 22,
    mass: 0.2,
  })

  if (!animationConfig.canAnimate || !animationConfig.scrollProgressEnabled) {
    return null
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[70] origin-left"
      style={{
        scaleX: smoothProgress,
        height: `${animationConfig.scrollProgressThickness}px`,
        background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))',
        boxShadow: '0 0 16px var(--color-accent-glow)',
      }}
      aria-hidden="true"
    />
  )
}
