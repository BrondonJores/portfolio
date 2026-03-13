/* Page de contact complete avec temoignages */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import { useContactForm } from '../hooks/useContactForm.jsx'
import { getTestimonials } from '../services/testimonialService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'

const inputStyle = {
  backgroundColor: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

function buildChannelDescription(label) {
  if (label === 'GitHub') {
    return 'Voir le code, la rigueur et les choix techniques.'
  }
  if (label === 'LinkedIn') {
    return 'Parcours, collaborations et contexte professionnel.'
  }
  if (label === 'Twitter') {
    return 'Veille, opinions produit et signaux du moment.'
  }
  return 'Continuer la conversation sur ce canal.'
}

export default function ContactPage() {
  const { fields, handleChange, handleSubmit, status } = useContactForm()
  const { settings } = useSettings()
  const [testimonials, setTestimonials] = useState([])
  const pageTitle = buildPageTitle(settings, 'Contact')

  const socialLinks = useMemo(() => ([
    settings.github_url && { label: 'GitHub', href: settings.github_url },
    settings.linkedin_url && { label: 'LinkedIn', href: settings.linkedin_url },
    settings.twitter_url && { label: 'Twitter', href: settings.twitter_url },
  ].filter(Boolean)), [settings.github_url, settings.linkedin_url, settings.twitter_url])

  const contactEmail = settings.contact_email || 'contact@brondonjores.dev'
  const contactLocation = settings.contact_location || 'France'
  const sectionTitle = settings.ui_section_contact_title || 'Contact'
  const sectionSubtitle = settings.ui_section_contact_subtitle || 'Discutons de votre prochain projet'
  const contactIntro =
    settings.ui_contact_intro ||
    "Je suis disponible pour des missions freelance, des opportunites d'emploi ou simplement pour discuter de vos projets."
  const formNameLabel = settings.ui_contact_form_name_label || 'Nom'
  const formEmailLabel = settings.ui_contact_form_email_label || 'Email'
  const formMessageLabel = settings.ui_contact_form_message_label || 'Message'
  const formNamePlaceholder = settings.ui_contact_form_name_placeholder || 'Votre nom'
  const formEmailPlaceholder = settings.ui_contact_form_email_placeholder || 'votre@email.com'
  const formMessagePlaceholder = settings.ui_contact_form_message_placeholder || 'Decrivez votre projet...'
  const formSuccessMessage = settings.ui_contact_form_success || 'Votre message a ete envoye avec succes.'
  const formSubmitLabel = settings.ui_contact_form_submit || 'Envoyer le message'
  const formSubmittingLabel = settings.ui_contact_form_submitting || 'Envoi en cours...'
  const testimonialsTitle = settings.ui_contact_testimonials_title || 'Temoignages'

  useEffect(() => {
    getTestimonials()
      .then((res) => setTestimonials(res?.data || []))
      .catch(() => setTestimonials([]))
  }, [])

  const responseSignals = [
    {
      key: 'email',
      label: 'Canal principal',
      value: contactEmail,
      helper: 'Le plus direct pour lancer un projet ou une discussion.',
      icon: EnvelopeIcon,
    },
    {
      key: 'location',
      label: 'Base',
      value: contactLocation,
      helper: 'Disponible a distance, avec des collaborations asynchrones fluides.',
      icon: MapPinIcon,
    },
    {
      key: 'network',
      label: 'Presence',
      value: socialLinks.length > 0 ? `${socialLinks.length} canaux actifs` : 'Contact direct',
      helper: socialLinks.length > 0 ? 'Choisis le canal qui correspond a ton contexte.' : 'On peut passer uniquement par email.',
      icon: SparklesIcon,
    },
  ]

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="min-h-screen pb-16 pt-28" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <section className="mb-10 grid gap-8 xl:grid-cols-[minmax(0,1.06fr)_320px] xl:items-end">
            <div>
              <p
                className="mb-4 text-[11px] uppercase tracking-[0.22em]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Ouvrir une discussion
              </p>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                    color: 'var(--color-accent-light)',
                  }}
                >
                  <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                  Conversation qualifiee
                </span>
              </div>

              <h1
                className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {sectionTitle}
              </h1>

              <p
                className="mt-4 max-w-3xl text-lg font-medium leading-relaxed"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {sectionSubtitle}
              </p>

              <p
                className="mt-6 max-w-3xl text-base leading-relaxed md:text-lg"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {contactIntro}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="primary" href={`mailto:${contactEmail}`}>
                  <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                  {contactEmail}
                </Button>
                {socialLinks[0] && (
                  <Button variant="secondary" href={socialLinks[0].href}>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                    {socialLinks[0].label}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {responseSignals.map((signal) => {
                const Icon = signal.icon
                return (
                  <Card key={signal.key} className="h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          {signal.label}
                        </p>
                        <p className="mt-3 text-lg font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                          {signal.value}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                          {signal.helper}
                        </p>
                      </div>
                      <span
                        className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-accent) 34%, var(--color-border))',
                          backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 14%, transparent)',
                        }}
                      >
                        <Icon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:gap-10">
            <div className="grid gap-4">
              <div
                className="overflow-hidden rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                  background:
                    'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 18%, transparent))',
                  boxShadow: '0 28px 64px -44px color-mix(in srgb, var(--color-accent-glow) 28%, transparent)',
                }}
              >
                <div className="mb-6 flex items-center gap-3">
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem]"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)' }}
                  >
                    <PaperAirplaneIcon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Brief rapide
                    </p>
                    <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Decris le contexte, je m'occupe du reste.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="cp-name"
                        className="mb-1.5 block text-sm font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formNameLabel}
                      </label>
                      <input
                        id="cp-name"
                        name="name"
                        type="text"
                        value={fields.name}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                        placeholder={formNamePlaceholder}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cp-email"
                        className="mb-1.5 block text-sm font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formEmailLabel}
                      </label>
                      <input
                        id="cp-email"
                        name="email"
                        type="email"
                        value={fields.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                        placeholder={formEmailPlaceholder}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cp-message"
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formMessageLabel}
                    </label>
                    <textarea
                      id="cp-message"
                      name="message"
                      value={fields.message}
                      onChange={handleChange}
                      required
                      rows={7}
                      className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      style={inputStyle}
                      placeholder={formMessagePlaceholder}
                    />
                  </div>

                  {status.success && (
                    <p
                      className="rounded-xl px-4 py-3 text-sm font-medium"
                      style={{ color: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)' }}
                      role="status"
                    >
                      {formSuccessMessage}
                    </p>
                  )}
                  {status.error && (
                    <p
                      className="rounded-xl px-4 py-3 text-sm font-medium"
                      style={{ color: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}
                      role="alert"
                    >
                      {status.error}
                    </p>
                  )}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-md text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      Un message clair avec ton besoin, ton timing et ton contexte suffit pour lancer une discussion utile.
                    </p>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={status.loading}
                      className="justify-center sm:min-w-[220px]"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                      {status.loading ? formSubmittingLabel : formSubmitLabel}
                    </Button>
                  </div>
                </form>
              </div>

              {testimonials.length > 0 && (
                <section>
                  <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                        Confiance
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {testimonialsTitle}
                      </h2>
                    </div>
                    <p className="max-w-md text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      Quelques retours choisis pour montrer la qualite de collaboration et le niveau d'execution.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {testimonials.map((testimonial) => (
                      <Card key={testimonial.id} className="h-full">
                        <p
                          className="text-sm italic leading-relaxed"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          &ldquo;{testimonial.content}&rdquo;
                        </p>
                        <div className="mt-5 border-t pt-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 62%, transparent)' }}>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {testimonial.author_name}
                          </p>
                          {testimonial.author_role && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {testimonial.author_role}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="grid gap-4">
              <Card>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)' }}
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Cadence
                    </p>
                    <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Une discussion utile avant toute promesse.
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 66%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)' }}>
                    <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Etape 1
                    </p>
                    <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Tu partages le besoin, le timing et les contraintes.
                    </p>
                  </div>
                  <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 66%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)' }}>
                    <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Etape 2
                    </p>
                    <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Je reviens avec un angle, une priorisation et la meilleure forme de collaboration.
                    </p>
                  </div>
                  <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 66%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)' }}>
                    <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Etape 3
                    </p>
                    <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      On cadre le prochain pas concret: audit, mission, prototype ou echange exploratoire.
                    </p>
                  </div>
                </div>
              </Card>

              {socialLinks.length > 0 && (
                <Card>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Autres canaux
                  </p>
                  <div className="mt-4 space-y-3">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border p-4 transition-colors"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {link.label}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                              {buildChannelDescription(link.label)}
                            </p>
                          </div>
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                        </div>
                      </a>
                    ))}
                  </div>
                </Card>
              )}
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
