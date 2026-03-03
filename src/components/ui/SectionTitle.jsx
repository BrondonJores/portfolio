/* Composant titre de section avec accent visuel */

/**
 * Affiche un titre h2 et un sous-titre optionnel avec accent indigo.
 * Accepte les props title et subtitle.
 */
export default function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-12">
      <h2
        className="text-4xl font-bold mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {/* Accent underline indigo */}
      <div
        className="h-1 w-16 rounded mb-4"
        style={{ backgroundColor: 'var(--color-accent)' }}
      />
      {subtitle && (
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
