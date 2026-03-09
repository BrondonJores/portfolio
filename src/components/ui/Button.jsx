/* Composant bouton extensible avec animations configurables */
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext.jsx'
import { detectAnimationAssetMode, sanitizeAnimationAssetUrl } from '../../utils/animationAsset.js'
import { getAnimationConfig } from '../../utils/animationSettings.js'
import LoaderAssetPlayer from './LoaderAssetPlayer.jsx'

const VARIANT_STYLES = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-light)] focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]',
  secondary:
    'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]',
  ghost:
    'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border)]',
}

const BASE_STYLES =
  'relative isolate inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none overflow-hidden transform-gpu'

const BUTTON_ASSET_URL_BY_VARIANT = {
  primary: 'buttonAssetPrimaryUrl',
  secondary: 'buttonAssetSecondaryUrl',
  ghost: 'buttonAssetGhostUrl',
}

/**
 * Resolve l'URL d'asset button selon la variante, avec fallback global.
 * @param {Record<string, unknown>} animationConfig Configuration animation courante.
 * @param {'primary'|'secondary'|'ghost'} variant Variante bouton.
 * @returns {string} URL nettoyee ou chaine vide.
 */
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

/**
 * Rend un element <a> si href est fourni, sinon un <button>.
 * Le pulse des CTA principaux est parametre depuis AdminSettings > Animations.
 */
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
  const classes = `${BASE_STYLES} ${VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`
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
  const glowRadius = 22 * animationConfig.buttonGlowBoost
  const glowStyle = variant === 'primary'
    ? {
      boxShadow: isHovered && canRunMicroInteractions && !canRenderButtonAsset
        ? `0 0 ${glowRadius}px var(--color-accent-glow)`
        : 'none',
      transition: 'box-shadow 0.2s ease',
      animation: shouldPulse ? `cta-pulse ${animationConfig.ctaPulseIntervalMs}ms ease-in-out infinite` : 'none',
    }
    : {}
  const hoverAnimation = canRunMicroInteractions
    ? { y: -animationConfig.buttonHoverLiftPx }
    : undefined
  const tapAnimation = canRunMicroInteractions
    ? { scale: animationConfig.buttonPressScale }
    : undefined

  /**
   * Ajoute une onde au point d'interaction pour renforcer le feedback visuel.
   * @param {import('react').PointerEvent<HTMLElement>} event Evenement pointeur.
   * @returns {void}
   */
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

  /**
   * Supprime une onde terminee.
   * @param {string} rippleId Identifiant de l'onde.
   * @returns {void}
   */
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
        style={glowStyle}
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
      style={glowStyle}
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
