/* Pied de page editoriale pilote par les reglages admin */
import { Link } from 'react-router-dom'
import {
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import Button from '../ui/Button.jsx'
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
      className="mt-20 border-t"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-border) 78%, transparent)',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-primary) 30%, transparent), color-mix(in srgb, var(--color-bg-secondary) 94%, transparent))',
      }}
    >
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <section
          className="overflow-hidden rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 16%, transparent))',
            boxShadow: '0 28px 64px -46px color-mix(in srgb, var(--color-accent-glow) 24%, transparent)',
          }}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_auto] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                Continuons
              </p>
              <h2
                className="mt-3 max-w-2xl text-2xl font-semibold leading-tight md:text-3xl"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {siteName}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                {siteTagline}
              </p>
              {(contactEmail || contactLocation) && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {contactEmail && (
                    <span
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                      style={{
                        color: 'var(--color-text-secondary)',
                        borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
                      }}
                    >
                      <EnvelopeIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                      {contactEmail}
                    </span>
                  )}
                  {contactLocation && (
                    <span
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                      style={{
                        color: 'var(--color-text-secondary)',
                        borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
                      }}
                    >
                      <MapPinIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                      {contactLocation}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              {contactEmail && (
                <Button variant="primary" href={`mailto:${contactEmail}`}>
                  <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                  Ecrire
                </Button>
              )}
              {socialLinks[0] && (
                <Button variant="secondary" href={socialLinks[0].href}>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                  {socialLinks[0].label}
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 border-t pt-8 md:grid-cols-3" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
              Signature
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {footerText}
            </p>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)', opacity: 0.82 }}>
              {footerCredits}
            </p>
          </div>

          <nav aria-label="Navigation pied de page">
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
              Navigation
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
              Reseaux
            </p>
            {socialLinks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
                    style={{
                      color: 'var(--color-text-primary)',
                      borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                    }}
                  >
                    {social.label}
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Les points de contact directs sont centralises sur la page contact.
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
