import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

const MASCOT_POSITION_PRESETS = {
  hero: [
    { top: '14%', left: '8%' },
    { top: '22%', right: '8%' },
    { top: '56%', left: '3%' },
    { top: '64%', right: '5%' },
    { top: '78%', left: '22%' },
    { top: '74%', right: '28%' },
    { top: '34%', left: '46%' },
    { top: '42%', right: '42%' },
  ],
  about: [
    { top: '8%', left: '3%' },
    { top: '12%', right: '5%' },
    { bottom: '8%', left: '10%' },
    { bottom: '6%', right: '6%' },
  ],
  skills: [
    { top: '10%', left: '4%' },
    { top: '10%', right: '4%' },
    { bottom: '6%', left: '8%' },
    { bottom: '6%', right: '8%' },
  ],
  projects: [
    { top: '8%', left: '2%' },
    { top: '8%', right: '2%' },
    { bottom: '10%', left: '4%' },
    { bottom: '10%', right: '4%' },
  ],
  blog: [
    { top: '9%', left: '3%' },
    { top: '9%', right: '3%' },
    { bottom: '12%', left: '7%' },
    { bottom: '12%', right: '7%' },
  ],
  contact: [
    { top: '8%', left: '6%' },
    { top: '12%', right: '10%' },
    { bottom: '6%', left: '14%' },
    { bottom: '8%', right: '8%' },
  ],
  section: [
    { top: '-8%', left: '6%' },
    { top: '-10%', right: '12%' },
    { bottom: '-12%', left: '18%' },
    { bottom: '-10%', right: '16%' },
  ],
}

const SCOPE_MAX_COUNT = {
  hero: 6,
  about: 4,
  skills: 3,
  projects: 3,
  blog: 3,
  contact: 4,
  section: 3,
}

const SCOPE_SIZE_FACTOR = {
  hero: 1,
  about: 0.9,
  skills: 0.76,
  projects: 0.74,
  blog: 0.74,
  contact: 0.88,
  section: 0.82,
}

const BUBBLE_SCOPE_SET = new Set(['hero', 'about', 'contact'])

function getScopePositions(scope) {
  return MASCOT_POSITION_PRESETS[scope] || MASCOT_POSITION_PRESETS.section
}

function pickMascotType(styleToken, index) {
  if (styleToken === 'robot' || styleToken === 'blob' || styleToken === 'human') {
    return styleToken
  }
  const mixedSet = ['robot', 'blob', 'human']
  return mixedSet[index % mixedSet.length]
}

function RobotMascot({ accent, accentLight, textColor }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <rect x="22" y="26" width="76" height="70" rx="18" fill="color-mix(in srgb, var(--color-bg-card) 88%, white)" stroke={accent} strokeWidth="3" />
      <rect x="35" y="42" width="50" height="30" rx="12" fill="color-mix(in srgb, var(--color-bg-secondary) 80%, black)" />
      <circle cx="50" cy="57" r="5.5" fill={accentLight} />
      <circle cx="70" cy="57" r="5.5" fill={accentLight} />
      <rect x="50" y="14" width="20" height="12" rx="5" fill={accent} />
      <circle cx="60" cy="12" r="6" fill={accentLight} />
      <rect x="46" y="76" width="28" height="6" rx="3" fill={textColor} opacity="0.5" />
    </svg>
  )
}

function BlobMascot({ accent, accentLight, textColor }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <path
        d="M64.5 16.5c17.7 2.7 32.3 17.3 36.6 35 4.2 17.3-2.6 37-17.4 48.1-14.4 10.7-36.6 13.2-52.3 4.5-16-8.8-25.1-29-21.2-47.1 3.8-18 20.3-33.6 37.8-38.8 4.9-1.4 10.3-2.2 16.5-1.7Z"
        fill="color-mix(in srgb, var(--color-accent-glow) 55%, var(--color-bg-card))"
        stroke={accent}
        strokeWidth="2.8"
      />
      <circle cx="46" cy="58" r="6" fill={accentLight} />
      <circle cx="71" cy="56" r="6" fill={accentLight} />
      <path d="M43 76c9 9 23 9 33 0" stroke={textColor} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.65" />
    </svg>
  )
}

function HumanMascot({ accent, accentLight, textColor, pace = 1 }) {
  const swingDuration = 1.1 / Math.max(0.55, pace)

  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="w-full h-full"
      aria-hidden="true"
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 1.2 / Math.max(0.5, pace), repeat: Infinity, ease: 'easeInOut' }}
    >
      <circle cx="60" cy="24" r="11" fill="color-mix(in srgb, var(--color-bg-card) 60%, #ffe2c2)" stroke={accent} strokeWidth="2.3" />
      <rect x="43" y="37" width="34" height="30" rx="11" fill="color-mix(in srgb, var(--color-bg-card) 82%, white)" stroke={accent} strokeWidth="2.4" />
      <rect x="49" y="66" width="22" height="7" rx="3.5" fill={accentLight} opacity="0.72" />

      <motion.g
        style={{ transformOrigin: '48px 43px' }}
        animate={{ rotate: [-12, 14, -12] }}
        transition={{ duration: swingDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="42" y="43" width="9" height="30" rx="4.5" fill="color-mix(in srgb, var(--color-bg-card) 78%, white)" stroke={accent} strokeWidth="1.4" />
      </motion.g>

      <rect x="69" y="43" width="9" height="28" rx="4.5" fill="color-mix(in srgb, var(--color-bg-card) 78%, white)" stroke={accent} strokeWidth="1.4" />
      <rect x="50" y="72" width="9" height="32" rx="4.5" fill="color-mix(in srgb, var(--color-bg-secondary) 65%, black)" />
      <rect x="61" y="72" width="9" height="32" rx="4.5" fill="color-mix(in srgb, var(--color-bg-secondary) 65%, black)" />
      <rect x="46" y="104" width="16" height="5" rx="2.5" fill={accent} />
      <rect x="58" y="104" width="16" height="5" rx="2.5" fill={accent} />
      <path d="M52 28c4 3 12 3 16 0" stroke={textColor} strokeWidth="2.2" strokeLinecap="round" opacity="0.58" />
    </motion.svg>
  )
}

export default function AnimatedMascots({ scope = 'hero', sceneKey = '' }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef(null)
  const isInView = useInView(containerRef, {
    margin: '20% 0px -20% 0px',
    amount: 0.15,
  })

  const resolvedSceneKey = sceneKey || (scope === 'hero' ? 'hero' : 'contact')
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), resolvedSceneKey),
    [settings, prefersReducedMotion, resolvedSceneKey]
  )
  const [bubbleCursor, setBubbleCursor] = useState(0)

  useEffect(() => {
    if (!animationConfig.canAnimate || !animationConfig.mascotBubblesEnabled) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setBubbleCursor((prev) => prev + 1)
    }, animationConfig.mascotBubbleIntervalMs)

    return () => window.clearInterval(timer)
  }, [animationConfig.canAnimate, animationConfig.mascotBubblesEnabled, animationConfig.mascotBubbleIntervalMs])

  if (!animationConfig.canAnimate || !animationConfig.mascotsEnabled || animationConfig.mascotCount <= 0) {
    return null
  }

  const positions = getScopePositions(scope)
  const scopeCap = SCOPE_MAX_COUNT[scope] || SCOPE_MAX_COUNT.section
  const count = Math.min(animationConfig.mascotCount, positions.length, scopeCap)
  const accent = 'var(--color-accent)'
  const accentLight = 'var(--color-accent-light)'
  const textColor = 'var(--color-text-primary)'
  const canRenderScope = scope === 'hero' || isInView
  const sizeFactor = SCOPE_SIZE_FACTOR[scope] || SCOPE_SIZE_FACTOR.section
  const supportsBubbles = BUBBLE_SCOPE_SET.has(scope)
  const bubbleCount = animationConfig.mascotBubblesEnabled && supportsBubbles
    ? Math.min(count, animationConfig.mascotBubbleMaxVisible)
    : 0

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
      {canRenderScope && Array.from({ length: count }).map((_, index) => {
        const type = pickMascotType(animationConfig.mascotStyle, index)
        const size = Math.max(36, (animationConfig.mascotSizePx - index * 4) * sizeFactor)
        const travel = Math.max(4, (8 + index * 2) * sizeFactor)
        const duration = (8 + index * 1.2) / Math.max(0.4, animationConfig.mascotSpeed)
        const bubbleMessage = bubbleCount > index
          ? animationConfig.mascotBubbleMessages[(bubbleCursor + index) % animationConfig.mascotBubbleMessages.length]
          : null

        return (
          <motion.div
            key={`${scope}-mascot-${index}`}
            className="absolute"
            style={{
              ...positions[index],
              width: `${size}px`,
              height: `${size}px`,
              opacity: animationConfig.mascotOpacity,
              filter: 'drop-shadow(0 10px 18px var(--color-accent-glow))',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: animationConfig.mascotOpacity,
              y: [0, -travel, 0],
              x: [0, (index % 2 === 0 ? 4 : -4) * animationConfig.intensity, 0],
              rotate: [index % 2 === 0 ? -3 : 3, index % 2 === 0 ? 3 : -3, index % 2 === 0 ? -3 : 3],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.22,
            }}
          >
            {bubbleMessage && (
              <motion.div
                className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-full border text-[10px] font-medium whitespace-nowrap"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 92%, white)',
                  color: 'var(--color-text-secondary)',
                }}
                animate={{ opacity: [0.72, 1, 0.72], y: [0, -2, 0] }}
                transition={{
                  duration: Math.max(1.2, animationConfig.mascotBubbleIntervalMs / 1500),
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {bubbleMessage}
              </motion.div>
            )}

            {type === 'robot' && (
              <RobotMascot accent={accent} accentLight={accentLight} textColor={textColor} />
            )}
            {type === 'blob' && (
              <BlobMascot accent={accent} accentLight={accentLight} textColor={textColor} />
            )}
            {type === 'human' && (
              <HumanMascot
                accent={accent}
                accentLight={accentLight}
                textColor={textColor}
                pace={animationConfig.mascotSpeed}
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
