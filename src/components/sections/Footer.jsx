/* Pied de page classique pilote par les reglages admin */
import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'

function normalizeText(value) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

export default function Footer() {
  const year = new Date().getFullYear()
  const { settings } = useSettings()

  const siteName = normalizeText(settings.site_name) || normalizeText(settings.hero_name) || 'Portfolio'
  const siteTagline = normalizeText(settings.tagline) || normalizeText(settings.hero_title) || 'Portfolio personnel'
  const footerText = normalizeText(settings.footer_text) || `(c) ${year} ${siteName}. Tous droits reserves.`
  const footerCredits = normalizeText(settings.footer_credits) || 'Construit avec React, Tailwind CSS et Heroicons'
  const contactEmail = normalizeText(settings.contact_email)
  const contactLocation = normalizeText(settings.contact_location)

  const quickLinks = [
    { to: '/', label: settings.ui_nav_label_home || 'Accueil' },
    { to: '/projets', label: settings.ui_nav_label_projects || 'Projets' },
    { to: '/blog', label: settings.ui_nav_label_blog || 'Blog' },
    { to: '/competences', label: settings.ui_nav_label_skills || 'Competences' },
    { to: '/contact', label: settings.ui_nav_label_contact || 'Contact' },
  ]

  const socialLinks = [
    { label: 'GitHub', href: normalizeText(settings.github_url) },
    { label: 'LinkedIn', href: normalizeText(settings.linkedin_url) },
    { label: 'X', href: normalizeText(settings.twitter_url) },
    { label: 'YouTube', href: normalizeText(settings.youtube_url) },
    { label: 'Instagram', href: normalizeText(settings.instagram_url) },
  ].filter((item) => Boolean(item.href))

  return (
    <footer
      className="border-t"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {siteName}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {siteTagline}
            </p>
            {(contactEmail || contactLocation) && (
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {[contactEmail, contactLocation].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>

          <nav aria-label="Navigation pied de page">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm transition-opacity duration-200 hover:opacity-75"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-opacity duration-200 hover:opacity-75"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {social.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div
          className="mt-6 pt-4 border-t flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {footerText}
          </p>
          <p className="text-xs md:text-right" style={{ color: 'var(--color-text-secondary)', opacity: 0.78 }}>
            {footerCredits}
          </p>
        </div>
      </div>
    </footer>
  )
}
