/* Section publique certifications avec cards premium et slideshow de badges. */
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AcademicCapIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CloudIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CpuChipIcon,
  CheckBadgeIcon,
  LinkIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ServerStackIcon,
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
 * Retourne une icone adaptee a un badge texte.
 * @param {string} badge Label badge.
 * @returns {import('react').ComponentType<{className?: string}>} Composant icone.
 */
function resolveBadgeIcon(badge) {
  const normalized = String(badge || '').toLowerCase()

  if (/(aws|azure|gcp|cloud)/.test(normalized)) return CloudIcon
  if (/(security|securite|iso|audit|soc)/.test(normalized)) return ShieldCheckIcon
  if (/(devops|docker|kubernetes|k8s|cicd|ci\/cd)/.test(normalized)) return ServerStackIcon
  if (/(react|vue|angular|frontend|ui|css|javascript|js|typescript|ts)/.test(normalized)) return CodeBracketIcon
  if (/(node|backend|api|java|spring|dotnet|c#|php|go|python)/.test(normalized)) return CpuChipIcon
  if (/(sql|data|analytics|bi|power ?bi|tableau)/.test(normalized)) return ChartBarIcon
  if (/(test|qa|quality)/.test(normalized)) return BeakerIcon
  if (/(linux|bash|shell|terminal)/.test(normalized)) return CommandLineIcon

  return SparklesIcon
}

/**
 * Decoupe une liste en pages.
 * @template T
 * @param {T[]} items Liste source.
 * @param {number} size Taille de page.
 * @returns {T[][]} Pages.
 */
function chunkItems(items, size) {
  const safeSize = Math.max(1, Number(size) || 1)
  const pages = []
  for (let index = 0; index < items.length; index += safeSize) {
    pages.push(items.slice(index, index + safeSize))
  }
  return pages
}

/**
 * Calcule le nombre d'elements visibles selon la largeur ecran.
 * @param {number} width Largeur viewport.
 * @returns {number} Nombre de badges par page.
 */
function getItemsPerPage(width) {
  if (width >= 1280) return 3
  if (width >= 768) return 2
  return 1
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
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activePage, setActivePage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window === 'undefined') {
      return 2
    }
    return getItemsPerPage(window.innerWidth)
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleResize = () => setItemsPerPage(getItemsPerPage(window.innerWidth))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const pages = useMemo(() => chunkItems(badges, itemsPerPage), [badges, itemsPerPage])
  const pageCount = pages.length

  useEffect(() => {
    setActivePage((previous) => Math.min(previous, Math.max(0, pageCount - 1)))
  }, [pageCount])

  const shouldAutoplay = canAnimate && pageCount > 1 && !isHovered && !isDragging

  useEffect(() => {
    if (!shouldAutoplay) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setActivePage((previous) => (previous + 1) % pageCount)
    }, 2600)

    return () => window.clearInterval(timer)
  }, [shouldAutoplay, pageCount])

  /**
   * Passe a la page suivante.
   * @returns {void}
   */
  const goNext = () => {
    if (pageCount <= 1) return
    setActivePage((previous) => (previous + 1) % pageCount)
  }

  /**
   * Passe a la page precedente.
   * @returns {void}
   */
  const goPrevious = () => {
    if (pageCount <= 1) return
    setActivePage((previous) => (previous - 1 + pageCount) % pageCount)
  }

  return (
    <div
      className="rounded-xl border px-3 py-3"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-bg-primary))',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
        Badges
      </p>

      <div className="relative overflow-hidden rounded-lg">
        <motion.div
          className="flex"
          animate={{ x: `-${activePage * 100}%` }}
          transition={
            isDragging
              ? { duration: 0 }
              : { type: 'spring', stiffness: 280, damping: 24, mass: 0.85 }
          }
          drag={pageCount > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.09}
          dragTransition={{ bounceStiffness: 420, bounceDamping: 26 }}
          whileDrag={pageCount > 1 ? { scale: 0.992 } : undefined}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(_event, info) => {
            const swipeThreshold = 55
            if (info.offset.x <= -swipeThreshold) {
              goNext()
            } else if (info.offset.x >= swipeThreshold) {
              goPrevious()
            }
            setIsDragging(false)
          }}
          style={{ cursor: pageCount > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {pages.map((pageBadges, pageIndex) => (
            <div
              key={`badge-page-${pageIndex}`}
              className="w-full shrink-0"
            >
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${Math.max(1, pageBadges.length)}, minmax(0, 1fr))` }}
              >
                {pageBadges.map((badge) => {
                  const Icon = resolveBadgeIcon(badge)
                  return (
                    <span
                      key={`${badge}-${pageIndex}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border min-w-0"
                      style={{
                        borderColor: 'var(--color-accent)',
                        color: 'var(--color-accent-light)',
                        backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                      }}
                      title={badge}
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 24%, transparent)' }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{badge}</span>
                    </span>
                  )
                })}
              </div>
            </div>
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

      {pageCount > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {pages.map((_page, pageIndex) => (
            <button
              key={`badge-dot-${pageIndex}`}
              type="button"
              onClick={() => setActivePage(pageIndex)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: pageIndex === activePage ? 18 : 8,
                backgroundColor: pageIndex === activePage ? 'var(--color-accent)' : 'var(--color-border)',
              }}
              aria-label={`Afficher la page badges ${pageIndex + 1}`}
            />
          ))}
        </div>
      )}
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
