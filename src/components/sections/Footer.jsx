/* Pied de page enrichi et pilote par les reglages admin */
import { Link } from 'react-router-dom'
import { ArrowTopRightOnSquareIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline'
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
      className="relative overflow-hidden border-t"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 12% -12%, color-mix(in srgb, var(--color-accent-glow) 34%, transparent), transparent 48%), radial-gradient(circle at 88% 112%, color-mix(in srgb, var(--color-accent-glow) 26%, transparent), transparent 52%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-11">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-5">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-accent)' }}
            >
              {siteName}
            </p>
            <p
              className="mt-3 max-w-md text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {siteTagline}
            </p>
          </div>

          <div className="xl:col-span-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-accent)' }}
            >
              Navigation
            </p>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm transition-colors duration-200"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.color = 'var(--color-text-primary)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.color = 'var(--color-text-secondary)'
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="xl:col-span-4">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-accent)' }}
            >
              Contact
            </p>

            <div className="mt-3 space-y-3">
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-sm transition-colors duration-200"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = 'var(--color-text-primary)'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = 'var(--color-text-secondary)'
                  }}
                >
                  <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{contactEmail}</span>
                </a>
              )}

              {contactLocation && (
                <p className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{contactLocation}</span>
                </p>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors duration-200"
                    style={{
                      color: 'var(--color-text-secondary)',
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 78%, transparent)',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.color = 'var(--color-text-primary)'
                      event.currentTarget.style.borderColor = 'var(--color-accent)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.color = 'var(--color-text-secondary)'
                      event.currentTarget.style.borderColor = 'var(--color-border)'
                    }}
                  >
                    <span>{social.label}</span>
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-7 pt-4 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {footerText}
          </p>
          <p className="text-xs sm:text-right" style={{ color: 'var(--color-text-secondary)', opacity: 0.78 }}>
            {footerCredits}
          </p>
        </div>
      </div>
    </footer>
  )
}
