/* Section Contact avec formulaire et informations */
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowTopRightOnSquareIcon, EnvelopeIcon, MapPinIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline'
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
import {
  buildContactIntentMessage,
  CONTACT_BRIEF_CHECKLIST,
  CONTACT_INTENT_PRESETS,
  CONTACT_REASSURANCE_POINTS,
} from '../../utils/contactConversion.js'

/* Style commun des inputs */
const inputStyle = {
  backgroundColor: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function Contact() {
  const { fields, handleChange, handleSubmit, applyFieldValues, status } = useContactForm()
  const { settings } = useSettings()
  const [selectedIntentId, setSelectedIntentId] = useState('')
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
  const contactAvailability = settings.contact_availability || 'Disponible pour cadrer un projet'
  const sectionTitle = settings.ui_section_contact_title || 'Contact'
  const sectionSubtitle = settings.ui_section_contact_subtitle || 'Discutons de votre prochain projet'
  const contactIntro =
    settings.ui_contact_intro ||
    "Je suis disponible pour des missions freelance, des opportunités d’emploi ou simplement pour discuter de vos projets. N’hésitez pas à me contacter."
  const formNameLabel = settings.ui_contact_form_name_label || 'Nom'
  const formEmailLabel = settings.ui_contact_form_email_label || 'Email'
  const formMessageLabel = settings.ui_contact_form_message_label || 'Message'
  const formNamePlaceholder = settings.ui_contact_form_name_placeholder || 'Votre nom'
  const formEmailPlaceholder = settings.ui_contact_form_email_placeholder || 'votre@email.com'
  const formMessagePlaceholder = settings.ui_contact_form_message_placeholder || 'Décrivez votre projet ou votre demande...'
  const formSuccessMessage = settings.ui_contact_form_success || 'Votre message a été envoyé avec succès.'
  const formSubmitLabel = settings.ui_contact_form_submit || 'Envoyer le message'
  const formSubmittingLabel = settings.ui_contact_form_submitting || 'Envoi en cours...'
  const activeIntent = CONTACT_INTENT_PRESETS.find((preset) => preset.id === selectedIntentId) || null

  const handleIntentSelect = (preset) => {
    setSelectedIntentId(preset.id)
    applyFieldValues({
      message: buildContactIntentMessage(preset),
    })
  }

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
          className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12"
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          whileInView={canAnimate ? 'visible' : false}
          viewport={{ once: animationConfig.sectionOnce }}
        >
          {/* Colonne gauche : informations de contact */}
          <motion.div variants={itemVariants} className="order-2 lg:order-1">
            <p
              className="mb-6 text-sm leading-relaxed sm:mb-8 sm:text-base"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {contactIntro}
            </p>

            <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 sm:hidden">
              {CONTACT_INTENT_PRESETS.map((preset) => {
                const isActive = activeIntent?.id === preset.id

                return (
                  <button
                    key={`mobile-${preset.id}`}
                    type="button"
                    onClick={() => handleIntentSelect(preset)}
                    className="min-w-[11.5rem] rounded-[var(--ui-radius-xl)] border px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={{
                      borderColor: isActive
                        ? 'color-mix(in srgb, var(--color-accent) 56%, var(--color-border))'
                        : 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--color-accent-glow) 16%, transparent)'
                        : 'color-mix(in srgb, var(--color-bg-card) 72%, transparent)',
                    }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      {preset.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      {preset.title}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mb-8 hidden gap-3 sm:grid sm:grid-cols-3">
              {CONTACT_INTENT_PRESETS.map((preset) => {
                const isActive = activeIntent?.id === preset.id

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleIntentSelect(preset)}
                    className="rounded-[var(--ui-radius-xl)] border px-4 py-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={{
                      borderColor: isActive
                        ? 'color-mix(in srgb, var(--color-accent) 56%, var(--color-border))'
                        : 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--color-accent-glow) 16%, transparent)'
                        : 'color-mix(in srgb, var(--color-bg-card) 72%, transparent)',
                    }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      {preset.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      {preset.title}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {preset.helper}
                    </p>
                  </button>
                )
              })}
            </div>

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
              <div className="flex items-center gap-3">
                <SparklesIcon
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {contactAvailability}
                </span>
              </div>
            </div>

            {/* Liens sociaux */}
            <div className="flex flex-wrap gap-4">
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

            <div className="mt-6 grid gap-3 sm:mt-8">
              {CONTACT_REASSURANCE_POINTS.map((point) => (
                <div
                  key={point.key}
                  className="rounded-[var(--ui-radius-xl)] border px-4 py-4"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    {point.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {point.detail}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Colonne droite : formulaire de contact */}
          <motion.form onSubmit={handleSubmit} noValidate variants={itemVariants} className="order-1 lg:order-2">
            <div
              className="space-y-4 rounded-[var(--ui-radius-2xl)] border p-4 sm:p-5"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                background:
                  'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 88%, transparent), color-mix(in srgb, var(--color-accent-glow) 14%, transparent))',
              }}
            >
              {activeIntent && (
                <div
                  className="rounded-[var(--ui-radius-xl)] border px-4 py-4"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-accent) 46%, var(--color-border))',
                    backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 16%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                        Brief actif
                      </p>
                      <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {activeIntent.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {activeIntent.description}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
                      style={{
                        color: 'var(--color-accent-light)',
                        borderColor: 'color-mix(in srgb, var(--color-accent) 44%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                      }}
                    >
                      {activeIntent.label}
                    </span>
                  </div>
                </div>
              )}

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
              <motion.div variants={itemVariants} className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 sm:hidden">
                  {CONTACT_BRIEF_CHECKLIST.slice(0, 3).map((item) => (
                    <span
                      key={`mobile-${item}`}
                      className="rounded-full border px-3 py-1.5 text-xs"
                      style={{
                        color: 'var(--color-text-secondary)',
                        borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="hidden flex-wrap gap-2 sm:flex">
                  {CONTACT_BRIEF_CHECKLIST.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border px-3 py-1.5 text-xs"
                      style={{
                        color: 'var(--color-text-secondary)',
                        borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-sm leading-relaxed sm:hidden" style={{ color: 'var(--color-text-secondary)' }}>
                    Besoin, timing, contexte. Trois infos suffisent pour lancer la discussion.
                  </p>
                  <p className="hidden max-w-md text-sm leading-relaxed sm:block" style={{ color: 'var(--color-text-secondary)' }}>
                    Un brief simple suffit. Si tu bloques, choisis un format ci-contre et je pré-remplis la base pour toi.
                  </p>
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={status.loading}
                      className="w-full justify-center sm:min-w-[220px]"
                      aria-label={formSubmitLabel}
                    >
                      <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                      {status.loading ? formSubmittingLabel : formSubmitLabel}
                    </Button>
                    <Button
                      variant="ghost"
                      href={`mailto:${contactEmail}`}
                      className="w-full justify-center sm:w-auto"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                      Email direct
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </AnimatedSection>
  )
}
