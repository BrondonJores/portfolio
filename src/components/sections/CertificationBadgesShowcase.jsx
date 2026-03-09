/* Bandeau infini de badges images (certifications) proche de la fin de page. */
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckBadgeIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Spinner from '../ui/Spinner.jsx'
import { getCertifications } from '../../services/certificationService.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

/**
 * Extrait les badges images exploitables depuis les certifications publiques.
 * @param {Array<object>} certifications Liste brute API.
 * @returns {Array<{id:number|string,url:string,title:string,issuer:string}>} Badges images normalises.
 */
function extractBadgeImages(certifications) {
  if (!Array.isArray(certifications)) {
    return []
  }

  const unique = new Set()
  const items = []

  certifications.forEach((item) => {
    const url = String(item?.badge_image_url || '').trim()
    if (!url) {
      return
    }

    const title = String(item?.title || 'Certification').trim()
    const issuer = String(item?.issuer || '').trim()
    const dedupeKey = `${url}::${title}`
    if (unique.has(dedupeKey)) {
      return
    }

    unique.add(dedupeKey)
    items.push({
      id: item?.id ?? dedupeKey,
      url,
      title,
      issuer,
    })
  })

  return items
}

export default function CertificationBadgesShowcase() {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'section'),
    [settings, prefersReducedMotion]
  )

  const shouldAnimate = animationConfig.canAnimate && badges.length > 1
  const marqueeItems = useMemo(
    () => (shouldAnimate ? [...badges, ...badges] : badges),
    [badges, shouldAnimate]
  )
  const durationSeconds = Math.max(14, badges.length * 3)

  const title = settings.ui_section_badges_showcase_title || 'Badges Verifies'
  const subtitle =
    settings.ui_section_badges_showcase_subtitle ||
    'Un ruban infini de mes badges de certification.'

  useEffect(() => {
    getCertifications()
      .then((response) => {
        const list = Array.isArray(response?.data) ? response.data : []
        setBadges(extractBadgeImages(list))
      })
      .catch(() => setBadges([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <AnimatedSection
        id="badges-showcase"
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        <div className="max-w-6xl mx-auto flex justify-center">
          <Spinner size="lg" />
        </div>
      </AnimatedSection>
    )
  }

  if (badges.length === 0) {
    return null
  }

  return (
    <AnimatedSection
      id="badges-showcase"
      className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto relative z-20">
        <SectionTitle
          title={title}
          subtitle={subtitle}
        />

        <div
          className="relative rounded-2xl border p-4 sm:p-5 overflow-hidden"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-card))',
          }}
        >
          <motion.div
            className="flex items-stretch gap-3 w-max"
            animate={shouldAnimate ? { x: ['0%', '-50%'] } : { x: '0%' }}
            transition={
              shouldAnimate
                ? {
                  duration: durationSeconds,
                  ease: 'linear',
                  repeat: Infinity,
                }
                : undefined
            }
          >
            {marqueeItems.map((badge, index) => (
              <article
                key={`${badge.id}-${index}`}
                className="w-[148px] sm:w-[176px] rounded-xl border p-3 shrink-0"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-accent) 38%, var(--color-border))',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              >
                <div className="h-16 sm:h-20 rounded-lg border flex items-center justify-center p-2 mb-2" style={{ borderColor: 'var(--color-border)' }}>
                  <img
                    src={badge.url}
                    alt={`Badge ${badge.title}`}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {badge.title}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {badge.issuer || 'Certification'}
                </p>
              </article>
            ))}
          </motion.div>

          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-10"
            style={{
              background: 'linear-gradient(to right, var(--color-bg-card), transparent)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10"
            style={{
              background: 'linear-gradient(to left, var(--color-bg-card), transparent)',
            }}
          />
          <div className="absolute top-3 right-3">
            <CheckBadgeIcon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}
