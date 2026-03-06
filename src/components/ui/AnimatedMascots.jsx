import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

const HERO_POSITIONS = [
  { top: '14%', left: '8%' },
  { top: '22%', right: '8%' },
  { top: '56%', left: '3%' },
  { top: '64%', right: '5%' },
  { top: '78%', left: '22%' },
  { top: '74%', right: '28%' },
  { top: '34%', left: '46%' },
  { top: '42%', right: '42%' },
]

const SECTION_POSITIONS = [
  { top: '-8%', left: '6%' },
  { top: '-10%', right: '12%' },
  { bottom: '-12%', left: '18%' },
  { bottom: '-10%', right: '16%' },
]

function pickMascotType(styleToken, index) {
  if (styleToken === 'robot' || styleToken === 'blob') {
    return styleToken
  }
  return index % 2 === 0 ? 'robot' : 'blob'
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

export default function AnimatedMascots({ scope = 'hero' }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )

  if (!animationConfig.canAnimate || !animationConfig.mascotsEnabled || animationConfig.mascotCount <= 0) {
    return null
  }

  const positions = scope === 'hero' ? HERO_POSITIONS : SECTION_POSITIONS
  const count = Math.min(animationConfig.mascotCount, positions.length)
  const accent = 'var(--color-accent)'
  const accentLight = 'var(--color-accent-light)'
  const textColor = 'var(--color-text-primary)'

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => {
        const type = pickMascotType(animationConfig.mascotStyle, index)
        const size = Math.max(40, animationConfig.mascotSizePx - index * 4)
        const travel = 8 + index * 2
        const duration = (8 + index * 1.2) / Math.max(0.4, animationConfig.mascotSpeed)

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
            {type === 'robot' ? (
              <RobotMascot accent={accent} accentLight={accentLight} textColor={textColor} />
            ) : (
              <BlobMascot accent={accent} accentLight={accentLight} textColor={textColor} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
