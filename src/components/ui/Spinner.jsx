/* Composant spinner de chargement */

/* Dimensions par taille */
const SIZE_MAP = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

/**
 * Spinner SVG anime pour les etats de chargement.
 * Tailles disponibles : sm, md, lg.
 */
export default function Spinner({ size = 'md', className = '' }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md

  return (
    <svg
      className={`animate-spin ${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Chargement en cours"
      role="status"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="var(--color-accent)"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="var(--color-accent)"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
