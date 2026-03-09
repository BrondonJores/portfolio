/* Section publique certifications avec cards medias (image, badge, PDF). */
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  LinkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'
import Badge from '../ui/Badge.jsx'
import { getCertifications } from '../../services/certificationService.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'
import { buildSectionContainerVariants, buildSectionItemVariants } from '../../utils/sectionMotionProfiles.js'

/**
 * Normalise une liste de badges.
 * @param {unknown} value Source badges.
 * @returns {string[]} Liste nettoyee.
 */
function normalizeBadges(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 24)
}

/**
 * Formate une date ISO en texte local.
 * @param {string | null | undefined} value Date brute.
 * @returns {string} Date lisible.
 */
function formatDate(value) {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Certifications() {
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'section'),
    [settings, prefersReducedMotion]
  )
  const canAnimate = animationConfig.canAnimate
  const containerVariants = useMemo(
    () => buildSectionContainerVariants('section', animationConfig),
    [animationConfig]
  )
  const itemVariants = useMemo(
    () => buildSectionItemVariants('section', animationConfig),
    [animationConfig]
  )

  const title = settings.ui_section_certifications_title || 'Certifications'
  const subtitle =
    settings.ui_section_certifications_subtitle ||
    'Mes certifications, badges et preuves officielles.'
  const viewCredentialLabel = settings.ui_certification_view_credential || 'Verifier'
  const viewPdfLabel = settings.ui_certification_view_pdf || 'Voir PDF'

  useEffect(() => {
    getCertifications()
      .then((response) => {
        const list = Array.isArray(response?.data) ? response.data : []
        setCertifications(
          list.map((item) => ({
            ...item,
            badges: normalizeBadges(item.badges),
          }))
        )
      })
      .catch(() => setCertifications([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <AnimatedSection id="certifications" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Spinner size="lg" />
        </div>
      </AnimatedSection>
    )
  }

  if (certifications.length === 0) {
    return null
  }

  return (
    <AnimatedSection
      id="certifications"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="max-w-6xl mx-auto relative z-20">
        <div className="flex items-center gap-3 mb-2">
          <AcademicCapIcon className="h-7 w-7" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
          <SectionTitle title={title} subtitle={subtitle} />
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          whileInView={canAnimate ? 'visible' : false}
          viewport={{ once: animationConfig.sectionOnce }}
        >
          {certifications.map((item) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              transition={{
                duration: 0.45 * animationConfig.durationScale,
                ease: animationConfig.easePreset,
              }}
            >
              <Card className="h-full flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                      {item.title}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.issuer}
                    </p>
                  </div>
                  {item.badge_image_url ? (
                    <img
                      src={item.badge_image_url}
                      alt={`Badge ${item.title}`}
                      className="w-12 h-12 object-cover rounded-lg border flex-shrink-0"
                      style={{ borderColor: 'var(--color-border)' }}
                      loading="lazy"
                    />
                  ) : (
                    <CheckBadgeIcon className="h-8 w-8 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                  )}
                </div>

                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={`Certification ${item.title}`}
                    className="w-full h-40 object-cover rounded-lg border"
                    style={{ borderColor: 'var(--color-border)' }}
                    loading="lazy"
                  />
                )}

                <div className="space-y-1.5 text-sm">
                  {item.issued_at && (
                    <p className="inline-flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <CalendarDaysIcon className="h-4 w-4" />
                      Obtenue le {formatDate(item.issued_at)}
                    </p>
                  )}
                  {item.expires_at && (
                    <p className="inline-flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <CalendarDaysIcon className="h-4 w-4" />
                      Expire le {formatDate(item.expires_at)}
                    </p>
                  )}
                  {item.credential_id && (
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      ID: {item.credential_id}
                    </p>
                  )}
                </div>

                {item.description && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.description}
                  </p>
                )}

                {item.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.badges.map((badge) => (
                      <Badge key={`${item.id}-${badge}`}>{badge}</Badge>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-2 pt-2">
                  {item.credential_url && (
                    <Button variant="secondary" href={item.credential_url}>
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      {viewCredentialLabel}
                    </Button>
                  )}
                  {item.pdf_url && (
                    <Button variant="ghost" href={item.pdf_url}>
                      <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
                      {viewPdfLabel}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AnimatedSection>
  )
}
