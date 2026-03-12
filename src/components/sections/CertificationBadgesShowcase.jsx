/* Bandeau infini de badges images (certifications) proche de la fin de page. */
import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Spinner from '../ui/Spinner.jsx'
import SponsorBadgeRibbon from '../ui/SponsorBadgeRibbon.jsx'
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

export default function CertificationBadgesShowcase({ badges = [], loading = false }) {
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative mt-5">
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
