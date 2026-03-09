/* Bandeau infini de badges images (certifications) proche de la fin de page. */
import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Spinner from '../ui/Spinner.jsx'
import SponsorBadgeRibbon from '../ui/SponsorBadgeRibbon.jsx'
import { getCertifications } from '../../services/certificationService.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

/**
 * Contraint un nombre dans une plage.
 * @param {number} value Valeur source.
 * @param {number} min Borne basse.
 * @param {number} max Borne haute.
 * @returns {number} Valeur bornee.
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Extrait les badges images exploitables depuis les certifications publiques.
 * @param {Array<object>} certifications Liste brute API.
 * @returns {Array<{id:number|string,url:string,title:string}>} Badges images normalises.
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
    const dedupeKey = `${url}::${title}`
    if (unique.has(dedupeKey)) {
      return
    }

    unique.add(dedupeKey)
    items.push({
      id: item?.id ?? dedupeKey,
      url,
      title,
    })
  })

  return items
}

/**
 * Parse un facteur de vitesse depuis les settings.
 * @param {unknown} value Valeur brute.
 * @returns {number} Facteur [0.5, 2.5], 1 = normal.
 */
function parseSpeedMultiplier(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 1
  }
  return clamp(parsed, 0.5, 2.5)
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
  const speedMultiplier = parseSpeedMultiplier(
    settings.anim_badges_showcase_speed ?? settings.ui_section_badges_showcase_speed
  )
  const baseDuration = Math.max(18, badges.length * 2.1)
  const rowDuration = clamp(baseDuration / speedMultiplier, 10, 85)

  const title = settings.ui_section_badges_showcase_title || 'Badges Verifies'
  const subtitle =
    settings.ui_section_badges_showcase_subtitle ||
    'Mes badges'

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
        className="py-20 relative overflow-hidden"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
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
      className="py-20 relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <SectionTitle
          title={title}
          subtitle={subtitle}
        />
      </div>

      <div
        className="relative mt-5"
        style={{
          width: '100vw',
          marginLeft: 'calc(50% - 50vw)',
          marginRight: 'calc(50% - 50vw)',
        }}
      >
        <SponsorBadgeRibbon
          badges={badges}
          shouldAnimate={shouldAnimate}
          durationSeconds={rowDuration}
          minVisibleItems={22}
        />
      </div>
    </AnimatedSection>
  )
}
