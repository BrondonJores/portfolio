/* Section publique certifications avec cards premium et slideshow de badges. */
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

/**
 * Carrousel horizontal infini de badges.
 * @param {{badges: string[], canAnimate: boolean}} props Props carrousel.
 * @returns {JSX.Element | null} Bloc badges.
 */
function BadgeCarousel({ badges, canAnimate }) {
  if (badges.length === 0) {
    return null
  }

  const shouldAnimate = canAnimate && badges.length > 1
  const loopBadges = shouldAnimate ? [...badges, ...badges] : badges
  const duration = Math.max(8, badges.length * 2.1)

  return (
    <div
      className="rounded-xl border px-3 py-3"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-bg-primary))',
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
        Badges
      </p>

      <div className="relative overflow-hidden rounded-lg">
        <motion.div
          className="flex items-center gap-2 w-max pr-2"
          animate={shouldAnimate ? { x: ['0%', '-50%'] } : { x: '0%' }}
          transition={
            shouldAnimate
              ? {
                duration,
                ease: 'linear',
                repeat: Infinity,
              }
              : undefined
          }
        >
          {loopBadges.map((badge, index) => (
            <span
              key={`${badge}-${index}`}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border whitespace-nowrap"
              style={{
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent-light)',
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
              }}
            >
              {badge}
            </span>
          ))}
        </motion.div>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-10"
          style={{
            background:
              'linear-gradient(to right, color-mix(in srgb, var(--color-bg-primary) 92%, transparent), transparent)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10"
          style={{
            background:
              'linear-gradient(to left, color-mix(in srgb, var(--color-bg-primary) 92%, transparent), transparent)',
          }}
        />
      </div>
    </div>
  )
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
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
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
              <div
                className="rounded-[1.05rem] p-[1px]"
                style={{
                  background:
                    'linear-gradient(130deg, color-mix(in srgb, var(--color-accent) 58%, transparent), color-mix(in srgb, var(--color-accent-light) 20%, transparent), transparent 72%)',
                }}
              >
                <Card className="h-full flex flex-col !p-0 overflow-hidden">
                  <div className="relative h-44 overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={`Certification ${item.title}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background:
                            'radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-accent) 35%, transparent), transparent 60%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--color-accent-light) 26%, transparent), transparent 55%), var(--color-bg-primary)',
                        }}
                      >
                        <AcademicCapIcon className="h-14 w-14" style={{ color: 'var(--color-accent)' }} />
                      </div>
                    )}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, color-mix(in srgb, var(--color-bg-card) 95%, transparent), transparent 55%)',
                      }}
                    />

                    <div className="absolute top-3 right-3">
                      {item.badge_image_url ? (
                        <img
                          src={item.badge_image_url}
                          alt={`Badge ${item.title}`}
                          className="w-14 h-14 object-cover rounded-xl border backdrop-blur-sm"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border))',
                            backgroundColor: 'rgba(8, 15, 30, 0.35)',
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-11 h-11 rounded-xl border backdrop-blur-sm"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border))',
                            backgroundColor: 'rgba(8, 15, 30, 0.35)',
                          }}
                        >
                          <CheckBadgeIcon className="h-6 w-6" style={{ color: 'var(--color-accent-light)' }} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                        {item.title}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.issuer}
                      </p>
                    </div>

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

                    <BadgeCarousel
                      badges={item.badges}
                      canAnimate={canAnimate && !prefersReducedMotion}
                    />

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
                  </div>
                </Card>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AnimatedSection>
  )
}
