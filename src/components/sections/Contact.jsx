/* Section Contact avec formulaire et informations */
import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EnvelopeIcon, MapPinIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Button from '../ui/Button.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import AnimatedSceneAsset from '../ui/AnimatedSceneAsset.jsx'
import RecaptchaNotice from '../ui/RecaptchaNotice.jsx'
import { useContactForm } from '../../hooks/useContactForm.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'
import { buildSectionContainerVariants, buildSectionItemVariants } from '../../utils/sectionMotionProfiles.js'

/* Style commun des inputs */
const inputStyle = {
  backgroundColor: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function Contact() {
  const { fields, handleChange, handleSubmit, status } = useContactForm()
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'contact'),
    [settings, prefersReducedMotion]
  )
  const canAnimate = animationConfig.canAnimate
  const containerVariants = useMemo(
    () => buildSectionContainerVariants('contact', animationConfig),
    [animationConfig]
  )
  const itemVariants = useMemo(
    () => buildSectionItemVariants('contact', animationConfig),
    [animationConfig]
  )

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
    "Je suis disponible pour des missions freelance, des opportunites d'emploi ou simplement pour discuter de vos projets. N'hesitez pas a me contacter."
  const formNameLabel = settings.ui_contact_form_name_label || 'Nom'
  const formEmailLabel = settings.ui_contact_form_email_label || 'Email'
  const formMessageLabel = settings.ui_contact_form_message_label || 'Message'
  const formNamePlaceholder = settings.ui_contact_form_name_placeholder || 'Votre nom'
  const formEmailPlaceholder = settings.ui_contact_form_email_placeholder || 'votre@email.com'
  const formMessagePlaceholder = settings.ui_contact_form_message_placeholder || 'Decrivez votre projet ou votre demande...'
  const formSuccessMessage = settings.ui_contact_form_success || 'Votre message a ete envoye avec succes.'
  const formSubmitLabel = settings.ui_contact_form_submit || 'Envoyer le message'
  const formSubmittingLabel = settings.ui_contact_form_submitting || 'Envoi en cours...'

  return (
    <AnimatedSection
      id="contact"
      sectionKey="contact"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      <AnimatedMascots scope="contact" sceneKey="contact" />
      <AnimatedSceneAsset scope="contact" sceneKey="contact" />
      <div className="max-w-6xl mx-auto relative z-20">
        <SectionTitle
          title={sectionTitle}
          subtitle={sectionSubtitle}
        />

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          whileInView={canAnimate ? 'visible' : false}
          viewport={{ once: animationConfig.sectionOnce }}
        >
          {/* Colonne gauche : informations de contact */}
          <motion.div variants={itemVariants}>
            <p
              className="text-base leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {contactIntro}
            </p>

            {/* Informations de contact */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <EnvelopeIcon
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {contactEmail}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPinIcon
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {contactLocation}
                </span>
              </div>
            </div>

            {/* Liens sociaux */}
            <div className="flex gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-sm font-medium transition-colors duration-200 underline underline-offset-4"
                  style={{ color: 'var(--color-accent-light)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-accent-light)'
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>

          {/* Colonne droite : formulaire de contact */}
          <motion.form onSubmit={handleSubmit} noValidate variants={itemVariants}>
            <div className="space-y-4">
              {/* Champ nom */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {formNameLabel}
                </label>
                <input
                  id="name"
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
              </motion.div>

              {/* Champ email */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {formEmailLabel}
                </label>
                <input
                  id="email"
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
              </motion.div>

              {/* Champ message */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {formMessageLabel}
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={fields.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
                  style={inputStyle}
                  placeholder={formMessagePlaceholder}
                />
              </motion.div>

              {/* Message de succes */}
              {status.success && (
                <p
                  className="text-sm font-medium py-2 px-3 rounded-lg"
                  style={{
                    color: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                  }}
                  role="status"
                >
                  {formSuccessMessage}
                </p>
              )}

              {/* Message d'erreur */}
              {status.error && (
                <p
                  className="text-sm font-medium py-2 px-3 rounded-lg"
                  style={{
                    color: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  }}
                  role="alert"
                >
                  {status.error}
                </p>
              )}

              <RecaptchaNotice />

              {/* Bouton de soumission */}
              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={status.loading}
                  className="w-full justify-center"
                  aria-label={formSubmitLabel}
                >
                  <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                  {status.loading ? formSubmittingLabel : formSubmitLabel}
                </Button>
              </motion.div>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </AnimatedSection>
  )
}
