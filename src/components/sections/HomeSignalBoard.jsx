import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import Card from '../ui/Card.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'
import { buildSectionContainerVariants, buildSectionItemVariants } from '../../utils/sectionMotionProfiles.js'

function getTextSnippet(value, maxLength, fallback) {
  const normalized = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) {
    return fallback
  }
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trim()}...`
}

function formatDate(value) {
  if (!value) {
    return ''
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return parsed.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function HomeSignalBoard({
  projects = [],
  articles = [],
  certifications = [],
  badgeImages = [],
  skillGroups = [],
}) {
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

  const featuredProject = projects[0] || null
  const latestArticle = articles[0] || null
  const certificationCount = certifications.length
  const badgeCount = badgeImages.length
  const skillCount = skillGroups.reduce(
    (total, group) => total + (Array.isArray(group?.items) ? group.items.length : 0),
    0
  )

  const boardCards = [
    {
      key: 'spotlight',
      title: 'Travail en vitrine',
      eyebrow: 'Signal principal',
      description: featuredProject
        ? getTextSnippet(
            featuredProject.description,
            170,
            'Des réalisations conçues pour être lisibles, robustes et crédibles.'
          )
        : 'Des réalisations conçues pour être lisibles, robustes et crédibles.',
      value: featuredProject?.title || 'Sélection projets',
      helper: settings.ui_section_projects_view_all || 'Voir tous mes projets',
      href: '/projets',
      Icon: FolderOpenIcon,
      wide: true,
    },
    {
      key: 'writing',
      title: 'Notes & retours terrain',
      eyebrow: 'Journal',
      description: latestArticle
        ? getTextSnippet(latestArticle.excerpt, 118, 'Des articles pour partager la méthode et les choix techniques.')
        : 'Des articles pour partager la méthode et les choix techniques.',
      value: latestArticle?.title || 'Derniers articles',
      helper: latestArticle?.published_at ? formatDate(latestArticle.published_at) : (settings.ui_section_blog_view_all || 'Voir tous les articles'),
      href: '/blog',
      Icon: DocumentTextIcon,
      wide: false,
    },
    {
      key: 'proof',
      title: 'Preuves officielles',
      eyebrow: 'Validation',
      description: `${certificationCount} certifications et ${badgeCount} badges visibles sur la home.`,
      value: `${certificationCount || 0} certifs`,
      helper: settings.ui_section_certifications_view_all || 'Voir toutes les certifications',
      href: '/certifications',
      Icon: CheckBadgeIcon,
      wide: false,
    },
  ]

  return (
    <section className="relative z-30 -mt-12 px-4 pb-12 sm:-mt-16 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        variants={containerVariants}
        initial={canAnimate ? 'hidden' : false}
        whileInView={canAnimate ? 'visible' : false}
        viewport={{ once: animationConfig.sectionOnce }}
      >
        {boardCards.map(({ key, title, eyebrow, description, value, helper, href, Icon, wide }) => (
          <motion.div
            key={key}
            className={wide ? 'xl:col-span-2' : ''}
            variants={itemVariants}
            transition={{ duration: 0.44 * animationConfig.durationScale, ease: animationConfig.easePreset }}
          >
            <Link to={href} className="block h-full group">
              <Card className="h-full !p-0">
                <div className="flex h-full flex-col gap-5 p-5 md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p
                        className="text-[11px] uppercase tracking-[0.18em]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {eyebrow}
                      </p>
                      <h3
                        className="mt-2 text-lg font-semibold md:text-xl"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {title}
                      </h3>
                    </div>
                    <span
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-accent) 40%, var(--color-border))',
                        backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>

                  <div>
                    <p
                      className="text-xl font-semibold leading-tight md:text-2xl"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {value}
                    </p>
                    <p
                      className="mt-3 text-sm leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {description}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {helper}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-medium transition-transform duration-200 group-hover:translate-x-1"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      Explorer
                      <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
