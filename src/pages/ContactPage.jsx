/* Page de contact complete avec temoignages */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { EnvelopeIcon, MapPinIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../components/ui/AnimatedSection.jsx'
import SectionTitle from '../components/ui/SectionTitle.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import { useContactForm } from '../hooks/useContactForm.jsx'
import { getTestimonials } from '../services/testimonialService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'

/* Style commun des inputs */
const inputStyle = {
  backgroundColor: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function ContactPage() {
  const { fields, handleChange, handleSubmit, status } = useContactForm()
  const { settings } = useSettings()
  const [testimonials, setTestimonials] = useState([])
  const pageTitle = buildPageTitle(settings, 'Contact')

  const socialLinks = [
    settings.github_url && { label: 'GitHub', href: settings.github_url },
    settings.linkedin_url && { label: 'LinkedIn', href: settings.linkedin_url },
    settings.twitter_url && { label: 'Twitter', href: settings.twitter_url },
  ].filter(Boolean)

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

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title={sectionTitle}
            subtitle={sectionSubtitle}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Informations de contact */}
            <div>
              <p
                className="text-base leading-relaxed mb-8"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {contactIntro}
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <EnvelopeIcon
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: 'var(--color-accent)' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {contactEmail}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPinIcon
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: 'var(--color-accent)' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {contactLocation}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-sm font-medium transition-colors duration-200 underline underline-offset-4"
                    style={{ color: 'var(--color-accent-light)' }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Formulaire de contact */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="cp-name"
                    className="block text-sm font-medium mb-1.5"
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
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    style={inputStyle}
                    placeholder={formNamePlaceholder}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-email"
                    className="block text-sm font-medium mb-1.5"
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
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    style={inputStyle}
                    placeholder={formEmailPlaceholder}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-message"
                    className="block text-sm font-medium mb-1.5"
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
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
                    style={inputStyle}
                    placeholder={formMessagePlaceholder}
                  />
                </div>

                {status.success && (
                  <p
                    className="text-sm font-medium py-2 px-3 rounded-lg"
                    style={{ color: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)' }}
                    role="status"
                  >
                    {formSuccessMessage}
                  </p>
                )}
                {status.error && (
                  <p
                    className="text-sm font-medium py-2 px-3 rounded-lg"
                    style={{ color: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}
                    role="alert"
                  >
                    {status.error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={status.loading}
                  className="w-full justify-center"
                >
                  <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                  {status.loading ? formSubmittingLabel : formSubmitLabel}
                </Button>
              </div>
            </form>
          </div>

          {/* Section temoignages */}
          {testimonials.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <ChatBubbleLeftRightIcon
                  className="h-6 w-6"
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                <h2
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {testimonialsTitle}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <Card key={t.id}>
                    <p
                      className="text-sm leading-relaxed mb-4 italic"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      &ldquo;{t.content}&rdquo;
                    </p>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {t.author_name}
                      </p>
                      {t.author_role && (
                        <p
                          className="text-xs"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {t.author_role}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
