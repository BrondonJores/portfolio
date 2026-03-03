/* Composant badge pour l'affichage des tags */

/* Styles par variante */
const VARIANT_STYLES = {
  default: {
    color: 'var(--color-accent-light)',
    borderColor: 'var(--color-accent)',
    backgroundColor: 'var(--color-accent-glow)',
  },
  solid: {
    color: '#fff',
    backgroundColor: 'var(--color-accent)',
    borderColor: 'transparent',
  },
}

/**
 * Badge reutilisable pour afficher des tags ou etiquettes.
 * Variantes : default (fond transparent + bordure), solid (fond accent).
 */
export default function Badge({ children, variant = 'default', className = '' }) {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default

  return (
    <span
      className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}
