/* Bandeau infini de badges images (certifications) proche de la fin de page. */
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Spinner from '../ui/Spinner.jsx'
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
 * Decoupe les badges en deux lignes pour un rendu "double piste".
 * @param {Array<object>} badges Liste badges.
 * @returns {[Array<object>, Array<object>]} Deux lignes de badges.
 */
function splitBadgesIntoRows(badges) {
  const firstRow = []
  const secondRow = []

  badges.forEach((badge, index) => {
    if (index % 2 === 0) {
      firstRow.push(badge)
    } else {
      secondRow.push(badge)
    }
  })

  if (firstRow.length === 0 && secondRow.length > 0) {
    firstRow.push(...secondRow)
  }

  if (secondRow.length === 0 && firstRow.length > 0) {
    secondRow.push(...firstRow)
  }

  return [firstRow, secondRow]
}

/**
 * Prepare les items d'une piste marquee.
 * @param {Array<object>} source Liste source.
 * @param {boolean} shouldAnimate Etat animation.
 * @returns {Array<object>} Liste exploitable en piste.
 */
function buildMarqueeItems(source, shouldAnimate) {
  if (!Array.isArray(source) || source.length === 0) {
    return []
  }

  const padded = source.length < 4 ? [...source, ...source] : source
  return shouldAnimate ? [...padded, ...padded] : padded
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

/**
 * Rendu d'une ligne marquee de badges.
 * @param {{
 *   badges: Array<{id:number|string,url:string,title:string}>,
 *   shouldAnimate: boolean,
 *   durationSeconds: number,
 *   reverse?: boolean
 * }} props Props piste.
 * @returns {JSX.Element} Ligne marquee.
 */
function BadgeMarqueeRow({ badges, shouldAnimate, durationSeconds, reverse = false }) {
  const marqueeItems = useMemo(
    () => buildMarqueeItems(badges, shouldAnimate),
    [badges, shouldAnimate]
  )

  if (marqueeItems.length === 0) {
    return null
  }

  const animatedX = reverse ? ['-50%', '0%'] : ['0%', '-50%']

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div
        className="flex items-stretch gap-3 w-max"
        animate={shouldAnimate ? { x: animatedX } : { x: '0%' }}
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
            key={`${badge.id}-${reverse ? 'r' : 'f'}-${index}`}
            className="w-[90px] h-[90px] sm:w-[108px] sm:h-[108px] shrink-0 flex items-center justify-center"
          >
            <img
              src={badge.url}
              alt={`Badge ${badge.title}`}
              className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]"
              loading="lazy"
            />
          </article>
        ))}
      </motion.div>
    </div>
  )
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
  const [firstRowBadges, secondRowBadges] = useMemo(
    () => splitBadgesIntoRows(badges),
    [badges]
  )
  const baseDuration = Math.max(14, badges.length * 3)
  const rowOneDuration = clamp(baseDuration / speedMultiplier, 8, 90)
  const rowTwoDuration = clamp((baseDuration * 1.2) / speedMultiplier, 9, 110)

  const title = settings.ui_section_badges_showcase_title || 'Badges Verifies'
  const subtitle =
    settings.ui_section_badges_showcase_subtitle ||
    'Double ruban infini de mes badges de certification.'

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
          className="relative overflow-hidden py-1"
        >
          <div className="space-y-3">
            <BadgeMarqueeRow
              badges={firstRowBadges}
              shouldAnimate={shouldAnimate}
              durationSeconds={rowOneDuration}
            />
            <BadgeMarqueeRow
              badges={secondRowBadges}
              shouldAnimate={shouldAnimate}
              durationSeconds={rowTwoDuration}
              reverse
            />
          </div>

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
    </AnimatedSection>
  )
}
