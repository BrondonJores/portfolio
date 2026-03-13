import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext.jsx'
import { detectAnimationAssetMode, sanitizeAnimationAssetUrl } from '../../utils/animationAsset.js'
import { getAnimationConfig } from '../../utils/animationSettings.js'
import { getUiThemePrimitives } from '../../utils/themeSettings.js'
import LoaderAssetPlayer from './LoaderAssetPlayer.jsx'

const BASE_STYLES = [
  'relative isolate inline-flex min-h-[var(--ui-control-height)] items-center justify-center gap-2',
  'overflow-hidden rounded-[var(--ui-radius-xl)] border px-[var(--ui-button-px)] py-[var(--ui-button-py)]',
  'text-[length:var(--ui-button-font-size)] font-medium transition-all duration-200',
  'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
  'focus-visible:ring-offset-[var(--color-bg-primary)]',
].join(' ')

const BUTTON_ASSET_URL_BY_VARIANT = {
  primary: 'buttonAssetPrimaryUrl',
  secondary: 'buttonAssetSecondaryUrl',
  ghost: 'buttonAssetGhostUrl',
}

function resolveButtonAssetUrl(animationConfig, variant) {
  const scopedKey = BUTTON_ASSET_URL_BY_VARIANT[variant] || BUTTON_ASSET_URL_BY_VARIANT.primary
  const scopedUrl = sanitizeAnimationAssetUrl(animationConfig?.[scopedKey])
  const fallbackUrl = sanitizeAnimationAssetUrl(animationConfig?.buttonAssetDefaultUrl)
  if (detectAnimationAssetMode(scopedUrl) === 'lottie') {
    return scopedUrl
  }
  if (detectAnimationAssetMode(fallbackUrl) === 'lottie') {
    return fallbackUrl
  }
  return ''
}

function getHoverScale(variant, uiPrimitives) {
  const baseDelta = Math.max(0.004, (uiPrimitives.hoverScale - 1) * 1.3)
  if (variant === 'ghost') {
    return 1 + Math.min(0.008, baseDelta * 0.5)
  }
  if (variant === 'secondary') {
    return 1 + Math.min(0.014, baseDelta * 0.9)
  }
  return 1 + Math.min(0.02, baseDelta * 1.25)
}

function getSpotlightTint(variant) {
  if (variant === 'ghost') {
    return 'var(--color-accent)'
  }
  if (variant === 'secondary') {
    return 'var(--color-accent-light)'
  }
  return '#ffffff'
}

function getSweepTint(variant) {
  if (variant === 'ghost') {
    return 'color-mix(in srgb, var(--color-accent) 22%, transparent)'
  }
  if (variant === 'secondary') {
    return 'color-mix(in srgb, var(--color-accent-light) 24%, transparent)'
  }
  return 'color-mix(in srgb, white 38%, transparent)'
}

function buildButtonChrome({
  variant,
  uiPrimitives,
  isHovered,
  animationConfig,
  simplifyChrome,
  canRunMicroInteractions,
  canRenderButtonAsset,
  shouldPulse,
}) {
  const surfaceMix = Math.round(uiPrimitives.surfaceOpacity * 100)
  const borderMix = Math.round(uiPrimitives.surfaceBorderAlpha * 100)
  const glowStrength = Math.max(0.28, 0.48 * animationConfig.buttonGlowBoost)
  const sharedStyle = {
    letterSpacing: uiPrimitives.density === 'compact' ? '0.01em' : '0.015em',
    backdropFilter: !simplifyChrome && uiPrimitives.surfaceBlurPx > 0 && variant !== 'primary'
      ? `blur(${uiPrimitives.surfaceBlurPx}px)`
      : 'none',
    WebkitBackdropFilter: !simplifyChrome && uiPrimitives.surfaceBlurPx > 0 && variant !== 'primary'
      ? `blur(${uiPrimitives.surfaceBlurPx}px)`
      : 'none',
  }

  if (variant === 'secondary') {
    if (simplifyChrome) {
      return {
        ...sharedStyle,
        color: 'var(--color-accent)',
        backgroundColor: 'var(--color-bg-card)',
        borderColor: isHovered ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: isHovered
          ? '0 18px 34px -26px var(--color-accent-glow)'
          : '0 12px 24px -24px rgba(0, 0, 0, 0.18)',
        animation: 'none',
      }
    }

    return {
      ...sharedStyle,
      color: isHovered ? 'var(--color-text-primary)' : 'var(--color-accent)',
      backgroundColor: `color-mix(in srgb, var(--color-bg-card) ${surfaceMix}%, transparent)`,
      borderColor: `color-mix(in srgb, var(--color-accent) ${Math.max(34, borderMix)}%, var(--color-border))`,
      boxShadow: isHovered
        ? `0 22px 38px -24px color-mix(in srgb, var(--color-accent-glow) ${Math.round(glowStrength * 100)}%, transparent)`
        : '0 14px 30px -26px color-mix(in srgb, var(--color-border) 18%, transparent)',
      animation: 'none',
    }
  }

  if (variant === 'ghost') {
    if (simplifyChrome) {
      return {
        ...sharedStyle,
        color: isHovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        backgroundColor: 'transparent',
        borderColor: isHovered ? 'var(--color-border)' : 'transparent',
        boxShadow: 'none',
        animation: 'none',
      }
    }

    return {
      ...sharedStyle,
      color: isHovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
      backgroundColor: isHovered
        ? 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)'
        : 'transparent',
      borderColor: isHovered
        ? 'color-mix(in srgb, var(--color-border) 66%, transparent)'
        : 'transparent',
      boxShadow: 'none',
      animation: 'none',
    }
  }

  if (simplifyChrome) {
    return {
      ...sharedStyle,
      color: '#ffffff',
      borderColor: 'var(--color-accent)',
      background: 'var(--color-accent)',
      boxShadow: isHovered
        ? '0 20px 36px -24px var(--color-accent-glow)'
        : '0 14px 28px -24px var(--color-accent-glow)',
      animation: 'none',
    }
  }

  return {
    ...sharedStyle,
    color: '#ffffff',
    borderColor: 'color-mix(in srgb, var(--color-accent-light) 48%, var(--color-accent))',
    background:
      'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent-light) 72%, white))',
    boxShadow: isHovered && canRunMicroInteractions && !canRenderButtonAsset
      ? `0 22px 44px -26px color-mix(in srgb, var(--color-accent-glow) ${Math.round(glowStrength * 100)}%, transparent)`
      : '0 16px 32px -26px color-mix(in srgb, var(--color-accent-glow) 48%, transparent)',
    animation: shouldPulse ? `cta-pulse ${animationConfig.ctaPulseIntervalMs}ms ease-in-out infinite` : 'none',
  }
}

export default function Button({
  variant = 'primary',
  href,
  onClick,
  children,
  className = '',
  disabled = false,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerMove,
  onFocus,
  onBlur,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [ripples, setRipples] = useState([])
  const [assetLoadFailed, setAssetLoadFailed] = useState(false)
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 })
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
  const uiPrimitives = useMemo(() => getUiThemePrimitives(settings), [settings])

  const buttonAssetUrl = useMemo(
    () => resolveButtonAssetUrl(animationConfig, variant),
    [animationConfig, variant]
  )
  const buttonAssetMode = useMemo(
    () => detectAnimationAssetMode(buttonAssetUrl),
    [buttonAssetUrl]
  )

  useEffect(() => {
    setAssetLoadFailed(false)
  }, [buttonAssetUrl])

  const canRenderButtonAsset = animationConfig.buttonAssetEnabled
    && Boolean(buttonAssetUrl)
    && buttonAssetMode === 'lottie'
    && !assetLoadFailed
  const simplifyChrome = animationConfig.compatSimplifyChrome
  const classes = `${BASE_STYLES} ${simplifyChrome ? '' : 'transform-gpu'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`.trim()
  const canRunMicroInteractions = animationConfig.canAnimate
    && animationConfig.buttonMicroEnabled
    && !disabled
  const shouldPulse = variant === 'primary'
    && canRunMicroInteractions
    && animationConfig.ctaPulse
    && !canRenderButtonAsset
  const shouldRenderRipple = canRunMicroInteractions
    && animationConfig.buttonRippleEnabled
    && !canRenderButtonAsset
  const hoverAnimation = canRunMicroInteractions
    ? {
        y: -animationConfig.buttonHoverLiftPx,
        scale: getHoverScale(variant, uiPrimitives),
      }
    : undefined
  const tapAnimation = canRunMicroInteractions
    ? { scale: animationConfig.buttonPressScale }
    : undefined
  const buttonChromeStyle = buildButtonChrome({
    variant,
    uiPrimitives,
    isHovered,
    animationConfig,
    simplifyChrome,
    canRunMicroInteractions,
    canRenderButtonAsset,
    shouldPulse,
  })
  const spotlightStrength = variant === 'ghost'
    ? 18
    : variant === 'secondary'
      ? 22
      : 34

  function updateSpotlightPosition(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) {
      return
    }

    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setSpotlight({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    })
  }

  function handlePointerDownInternal(event) {
    onPointerDown?.(event)
    if (!shouldRenderRipple || event.button !== 0) {
      return
    }

    updateSpotlightPosition(event)

    const rect = event.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.8
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const nextRipple = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x,
      y,
      size,
    }

    setRipples((previous) => [...previous.slice(-2), nextRipple])
  }

  function handlePointerMoveInternal(event) {
    onPointerMove?.(event)
    if (!canRunMicroInteractions) {
      return
    }
    updateSpotlightPosition(event)
  }

  function removeRipple(rippleId) {
    setRipples((previous) => previous.filter((ripple) => ripple.id !== rippleId))
  }

  const sharedMotionProps = {
    className: classes,
    style: buttonChromeStyle,
    whileHover: hoverAnimation,
    whileTap: tapAnimation,
    onMouseEnter: (event) => {
      setIsHovered(true)
      onMouseEnter?.(event)
    },
    onMouseLeave: (event) => {
      setIsHovered(false)
      onMouseLeave?.(event)
    },
    onPointerDown: handlePointerDownInternal,
    onPointerMove: handlePointerMoveInternal,
    onFocus: (event) => {
      setIsHovered(true)
      onFocus?.(event)
    },
    onBlur: (event) => {
      setIsHovered(false)
      onBlur?.(event)
    },
    ...props,
  }

  const ambientSpotlight = (
    <>
      {canRunMicroInteractions && (
        <motion.span
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
          animate={{
            opacity: isHovered ? (variant === 'ghost' ? 0.22 : 0.42) : variant === 'primary' ? 0.16 : 0.08,
            scale: isHovered ? 1 : 0.97,
          }}
          transition={{ duration: 0.26 * animationConfig.durationScale, ease: 'easeOut' }}
          style={{
            background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, color-mix(in srgb, ${getSpotlightTint(variant)} ${spotlightStrength}%, transparent), transparent 64%)`,
          }}
          aria-hidden="true"
        />
      )}
      {canRunMicroInteractions && variant !== 'ghost' && (
        <motion.span
          className="pointer-events-none absolute inset-y-[-28%] left-[-30%] z-0 w-[42%] skew-x-[-18deg] rounded-[40%] blur-2xl"
          animate={{
            x: isHovered ? '230%' : '-48%',
            opacity: isHovered ? 0.42 : 0,
          }}
          transition={{ duration: 0.55 * animationConfig.durationScale, ease: 'easeOut' }}
          style={{
            background: `linear-gradient(120deg, transparent, ${getSweepTint(variant)}, transparent)`,
          }}
          aria-hidden="true"
        />
      )}
    </>
  )

  const content = (
    <>
      {ambientSpotlight}
      {canRenderButtonAsset && (
        <span
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
          style={{ opacity: animationConfig.buttonAssetOpacity }}
          aria-hidden="true"
        >
          <LoaderAssetPlayer
            url={buttonAssetUrl}
            fit={animationConfig.buttonAssetFit}
            onError={() => setAssetLoadFailed(true)}
          />
        </span>
      )}
      {!simplifyChrome && (
        <span
          className="pointer-events-none absolute inset-[1px] z-0 rounded-[inherit]"
          style={{
            border: variant === 'ghost'
              ? 'none'
              : '1px solid color-mix(in srgb, white 16%, transparent)',
            opacity: variant === 'ghost' ? 0 : isHovered ? 0.52 : 0.26,
          }}
          aria-hidden="true"
        />
      )}
      <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
      {shouldRenderRipple && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full"
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                width: `${ripple.size}px`,
                height: `${ripple.size}px`,
                backgroundColor: 'color-mix(in srgb, var(--color-accent-light) 46%, white)',
                opacity: 0.38,
                transform: 'translate(-50%, -50%) scale(0)',
                animation: 'button-ripple-expand 620ms ease-out forwards',
              }}
              onAnimationEnd={() => removeRipple(ripple.id)}
            />
          ))}
        </span>
      )}
    </>
  )

  if (href) {
    const isExternal = /^https?:\/\//.test(href)
    return (
      <motion.a
        href={href}
        {...(isExternal ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
        aria-disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault()
            return
          }
          onClick?.(event)
        }}
        {...sharedMotionProps}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      {...sharedMotionProps}
    >
      {content}
    </motion.button>
  )
}
