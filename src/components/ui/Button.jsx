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
  'focus-visible:ring-offset-[var(--color-bg-primary)] transform-gpu',
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

function buildButtonChrome({
  variant,
  uiPrimitives,
  isHovered,
  animationConfig,
  canRunMicroInteractions,
  canRenderButtonAsset,
  shouldPulse,
}) {
  const surfaceMix = Math.round(uiPrimitives.surfaceOpacity * 100)
  const borderMix = Math.round(uiPrimitives.surfaceBorderAlpha * 100)
  const glowStrength = Math.max(0.28, 0.48 * animationConfig.buttonGlowBoost)
  const sharedStyle = {
    letterSpacing: uiPrimitives.density === 'compact' ? '0.01em' : '0.015em',
    backdropFilter: uiPrimitives.surfaceBlurPx > 0 && variant !== 'primary'
      ? `blur(${uiPrimitives.surfaceBlurPx}px)`
      : 'none',
    WebkitBackdropFilter: uiPrimitives.surfaceBlurPx > 0 && variant !== 'primary'
      ? `blur(${uiPrimitives.surfaceBlurPx}px)`
      : 'none',
  }

  if (variant === 'secondary') {
    return {
      ...sharedStyle,
      color: isHovered ? 'var(--color-text-primary)' : 'var(--color-accent)',
      backgroundColor: `color-mix(in srgb, var(--color-bg-card) ${surfaceMix}%, transparent)`,
      borderColor: `color-mix(in srgb, var(--color-accent) ${Math.max(34, borderMix)}%, var(--color-border))`,
      boxShadow: isHovered
        ? `0 18px 36px -24px color-mix(in srgb, var(--color-accent-glow) ${Math.round(glowStrength * 100)}%, transparent)`
        : `0 14px 30px -26px color-mix(in srgb, var(--color-border) 18%, transparent)`,
      animation: 'none',
    }
  }

  if (variant === 'ghost') {
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

  return {
    ...sharedStyle,
    color: '#ffffff',
    borderColor: 'color-mix(in srgb, var(--color-accent-light) 48%, var(--color-accent))',
    background:
      'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent-light) 72%, white))',
    boxShadow: isHovered && canRunMicroInteractions && !canRenderButtonAsset
      ? `0 20px 44px -26px color-mix(in srgb, var(--color-accent-glow) ${Math.round(glowStrength * 100)}%, transparent)`
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
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [ripples, setRipples] = useState([])
  const [assetLoadFailed, setAssetLoadFailed] = useState(false)
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
  const classes = `${BASE_STYLES} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`
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
    ? { y: -animationConfig.buttonHoverLiftPx }
    : undefined
  const tapAnimation = canRunMicroInteractions
    ? { scale: animationConfig.buttonPressScale }
    : undefined
  const buttonChromeStyle = buildButtonChrome({
    variant,
    uiPrimitives,
    isHovered,
    animationConfig,
    canRunMicroInteractions,
    canRenderButtonAsset,
    shouldPulse,
  })

  function handlePointerDownInternal(event) {
    onPointerDown?.(event)
    if (!shouldRenderRipple || event.button !== 0) {
      return
    }

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

  function removeRipple(rippleId) {
    setRipples((previous) => previous.filter((ripple) => ripple.id !== rippleId))
  }

  if (href) {
    const isExternal = /^https?:\/\//.test(href)
    return (
      <motion.a
        href={href}
        {...(isExternal ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
        className={classes}
        aria-disabled={disabled}
        style={buttonChromeStyle}
        whileHover={hoverAnimation}
        whileTap={tapAnimation}
        onMouseEnter={(event) => {
          setIsHovered(true)
          onMouseEnter?.(event)
        }}
        onMouseLeave={(event) => {
          setIsHovered(false)
          onMouseLeave?.(event)
        }}
        onPointerDown={handlePointerDownInternal}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault()
            return
          }
          onClick?.(event)
        }}
        {...props}
      >
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
      </motion.a>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      className={classes}
      disabled={disabled}
      style={buttonChromeStyle}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
      onMouseEnter={(event) => {
        setIsHovered(true)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setIsHovered(false)
        onMouseLeave?.(event)
      }}
      onPointerDown={handlePointerDownInternal}
      {...props}
    >
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
    </motion.button>
  )
}
