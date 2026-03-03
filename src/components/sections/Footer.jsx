/* Pied de page minimal */
import { useSettings } from '../../context/SettingsContext.jsx'

export default function Footer() {
  const year = new Date().getFullYear()
  const { settings } = useSettings()

  const footerText = settings.footer_text || `© ${year} BrondonJores. Tous droits reserves.`
  const footerCredits = settings.footer_credits || 'Construit avec React, Tailwind CSS et Heroicons'

  return (
    <footer
      className="py-8 px-4 border-t text-center"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p
        className="text-sm mb-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {footerText}
      </p>
      <p
        className="text-xs"
        style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}
      >
        {footerCredits}
      </p>
    </footer>
  )
}
