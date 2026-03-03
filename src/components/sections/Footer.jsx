/* Pied de page minimal */

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="py-8 px-4 border-t text-center"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p
        className="text-sm mb-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &copy; {year} BrondonJores. Tous droits reserves.
      </p>
      <p
        className="text-xs"
        style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}
      >
        Construit avec React, Tailwind CSS et Heroicons
      </p>
    </footer>
  )
}
