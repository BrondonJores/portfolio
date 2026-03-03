/* Composant bouton extensible via la prop variant (principe Open/Closed) */
import { useState } from 'react'

/* Styles par variante */
const VARIANT_STYLES = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-light)] focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]',
  secondary:
    'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]',
  ghost:
    'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border)]',
}

const BASE_STYLES =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none'

/**
 * Bouton extensible via la prop variant.
 * Rend un element <a> si href est fourni, sinon un <button>.
 * Principe de substitution de Liskov : les deux remplissent le meme contrat.
 */
export default function Button({
  variant = 'primary',
  href,
  onClick,
  children,
  className = '',
  disabled = false,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false)
  const classes = `${BASE_STYLES} ${VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary} ${className}`
  const glowStyle =
    variant === 'primary'
      ? { boxShadow: isHovered ? '0 0 20px var(--color-accent-glow)' : 'none', transition: 'box-shadow 0.2s ease' }
      : {}

  /* Rendu d'un lien : externe (nouvelle fenetre) ou ancre interne */
  if (href) {
    const isExternal = /^https?:\/\//.test(href)
    return (
      <a
        href={href}
        {...(isExternal
          ? { rel: 'noopener noreferrer', target: '_blank' }
          : {})}
        className={classes}
        aria-disabled={disabled}
        style={glowStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      onClick={onClick}
      className={classes}
      disabled={disabled}
      style={glowStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
}
