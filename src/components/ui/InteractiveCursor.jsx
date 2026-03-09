/* Curseur interactif optionnel pour renforcer les micro-interactions. */
import { useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

const INTERACTIVE_TARGET_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  '[role="button"]',
  '[data-cursor-hover="true"]',
].join(',')

/**
 * Verifie si le device autorise un curseur personnalise.
 * @returns {boolean} true si pointeur fin detecte.
 */
function supportsInteractiveCursor() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(pointer: fine)').matches
}

/**
 * Curseur custom avec anneau + coeur, desactive automatiquement sur mobile.
 * @returns {JSX.Element|null} Overlay curseur ou null.
 */
export default function InteractiveCursor() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )

  const [deviceSupported, setDeviceSupported] = useState(false)
  const [visible, setVisible] = useState(false)
  const [isInteractiveTarget, setIsInteractiveTarget] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const cursorX = useMotionValue(-120)
  const cursorY = useMotionValue(-120)

  const stiffness = Math.round(540 - (animationConfig.cursorSmoothness * 1100))
  const damping = Math.round(22 + (animationConfig.cursorSmoothness * 36))
  const springX = useSpring(cursorX, { stiffness: Math.max(120, stiffness), damping })
  const springY = useSpring(cursorY, { stiffness: Math.max(120, stiffness), damping })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const check = () => setDeviceSupported(supportsInteractiveCursor())
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const shouldHideNativeCursor = animationConfig.canAnimate
      && animationConfig.cursorEnabled
      && deviceSupported

    if (!shouldHideNativeCursor || typeof document === 'undefined') {
      return undefined
    }

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'none'

    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [animationConfig.canAnimate, animationConfig.cursorEnabled, deviceSupported])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    if (!animationConfig.canAnimate || !animationConfig.cursorEnabled || !deviceSupported) {
      return undefined
    }

    const handlePointerMove = (event) => {
      cursorX.set(event.clientX)
      cursorY.set(event.clientY)
      setVisible(true)

      const target = event.target
      if (!(target instanceof Element)) {
        setIsInteractiveTarget(false)
        return
      }

      setIsInteractiveTarget(Boolean(target.closest(INTERACTIVE_TARGET_SELECTOR)))
    }

    const handlePointerLeave = () => {
      setVisible(false)
      setIsInteractiveTarget(false)
      setIsPressed(false)
    }
    const handlePointerOut = (event) => {
      if (event.relatedTarget == null) {
        handlePointerLeave()
      }
    }

    const handlePointerDown = () => setIsPressed(true)
    const handlePointerUp = () => setIsPressed(false)
    const handleWindowBlur = () => handlePointerLeave()

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerout', handlePointerOut)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [
    animationConfig.canAnimate,
    animationConfig.cursorEnabled,
    cursorX,
    cursorY,
    deviceSupported,
  ])

  if (!animationConfig.canAnimate || !animationConfig.cursorEnabled || !deviceSupported) {
    return null
  }

  const ringScale = isPressed ? 0.9 : isInteractiveTarget ? 1.35 : 1
  const dotScale = isPressed ? 0.78 : isInteractiveTarget ? 1.15 : 1

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[95] rounded-full border"
        style={{
          width: `${animationConfig.cursorRingSizePx}px`,
          height: `${animationConfig.cursorRingSizePx}px`,
          borderColor: 'var(--color-accent)',
          boxShadow: '0 0 18px var(--color-accent-glow)',
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: ringScale,
          opacity: visible ? animationConfig.cursorIdleOpacity : 0,
        }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[96] rounded-full"
        style={{
          width: `${animationConfig.cursorSizePx}px`,
          height: `${animationConfig.cursorSizePx}px`,
          backgroundColor: 'var(--color-accent)',
          boxShadow: '0 0 14px var(--color-accent-glow)',
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: dotScale,
          opacity: visible ? 0.95 : 0,
        }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        aria-hidden="true"
      />
    </>
  )
}
