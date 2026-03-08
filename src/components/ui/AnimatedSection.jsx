/* Wrapper de reveal section controle par AdminSettings */
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

function getInitialAnimation(revealType, distance) {
  switch (revealType) {
    case 'fade':
      return { opacity: 0 }
    case 'scale':
      return { opacity: 0, scale: 0.95 }
    case 'slide-right':
      return { opacity: 0, x: -distance }
    case 'fade-up':
    default:
      return { opacity: 0, y: distance }
  }
}

function getTargetAnimation(revealType) {
  switch (revealType) {
    case 'scale':
      return { opacity: 1, scale: 1 }
    case 'slide-right':
      return { opacity: 1, x: 0 }
    case 'fade':
      return { opacity: 1 }
    case 'fade-up':
    default:
      return { opacity: 1, y: 0 }
  }
}

/**
 * Anime les sections en entree dans le viewport.
 * Le comportement est personnalise via AdminSettings > Animations.
 */
export default function AnimatedSection({ className = '', children, ...props }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const { sectionKey = '' } = props
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), sectionKey),
    [settings, prefersReducedMotion, sectionKey]
  )

  if (!animationConfig.canAnimate) {
    const sectionProps = { ...props }
    delete sectionProps.sectionKey
    return (
      <section className={className} {...sectionProps}>
        {children}
      </section>
    )
  }

  const motionProps = { ...props }
  delete motionProps.sectionKey

  return (
    <motion.section
      className={className}
      initial={getInitialAnimation(animationConfig.sectionRevealType, animationConfig.sectionDistancePx)}
      whileInView={getTargetAnimation(animationConfig.sectionRevealType)}
      viewport={{ once: animationConfig.sectionOnce, amount: 0.2 }}
      transition={{
        duration: animationConfig.sectionDurationMs / 1000,
        ease: animationConfig.easePreset,
      }}
      {...motionProps}
    >
      {children}
    </motion.section>
  )
}
