/* Section Blog avec mise en avant editoriale */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  DocumentTextIcon,
  ArrowRightIcon,
  CalendarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import AnimatedSceneAsset from '../ui/AnimatedSceneAsset.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import SmartImage from '../ui/SmartImage.jsx'
import Spinner from '../ui/Spinner.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'
import { buildSectionContainerVariants, buildSectionItemVariants } from '../../utils/sectionMotionProfiles.js'

/**
 * Formate une date pour affichage francais.
 * @param {string|undefined|null} value Date source.
 * @returns {string} Date formattee.
 */
function formatPublicationDate(value) {
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

/**
 * Coupe un texte long pour les cartes.
 * @param {unknown} value Texte brut.
 * @param {number} maxLength Longueur max.
 * @param {string} fallback Valeur de replis.
 * @returns {string} Texte nettoye.
 */
function getCardExcerpt(value, maxLength, fallback) {
  const raw = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (!raw) {
    return fallback
  }
  if (raw.length <= maxLength) {
    return raw
  }
  return `${raw.slice(0, Math.max(1, maxLength - 3)).trim()}...`
}

export default function Blog({ articles = [], loading = false }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'blog'),
    [settings, prefersReducedMotion]
  )
  const canAnimate = animationConfig.canAnimate
  const containerVariants = useMemo(
    () => buildSectionContainerVariants('blog', animationConfig),
    [animationConfig]
  )
  const itemVariants = useMemo(
    () => buildSectionItemVariants('blog', animationConfig),
    [animationConfig]
  )
  const blogTitle = settings.ui_section_blog_title || 'Blog'
  const blogSubtitle = settings.ui_section_blog_subtitle || 'Mes derniers articles et réflexions'
  const blogViewAllLabel = settings.ui_section_blog_view_all || 'Voir tous les articles'
  const blogFeaturedLabel = settings.ui_section_blog_featured || 'À la une'
  const blogReadLabel = settings.ui_section_blog_read || "Lire l'article"

  if (loading) {
    return (
      <AnimatedSection
        id="blog"
        sectionKey="blog"
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        <div className="max-w-6xl mx-auto flex justify-center">
          <Spinner size="lg" />
        </div>
      </AnimatedSection>
    )
  }

  /* Section masquee s'il n'y a pas d'articles */
  if (articles.length === 0) return null

  const [featuredArticle, ...secondaryArticles] = articles

  return (
    <AnimatedSection
      id="blog"
      sectionKey="blog"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      <AnimatedMascots scope="blog" sceneKey="blog" />
      <AnimatedSceneAsset scope="blog" sceneKey="blog" />

      <div className="max-w-6xl mx-auto relative z-20">
        <SectionTitle
          title={blogTitle}
          subtitle={blogSubtitle}
        />

        <motion.div
          className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-10"
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          whileInView={canAnimate ? 'visible' : false}
          viewport={{ once: animationConfig.sectionOnce }}
        >
          {featuredArticle && (
            <motion.article
              className="xl:col-span-3"
              variants={itemVariants}
              transition={{ duration: 0.48 * animationConfig.durationScale, ease: animationConfig.easePreset }}
            >
              <Link
                to={`/blog/${featuredArticle.slug}`}
                className="block h-full"
                aria-label={`${blogReadLabel} - ${featuredArticle.title}`}
              >
                <Card className="h-full flex flex-col overflow-hidden !p-0">
                  {featuredArticle.cover_image ? (
                    <SmartImage
                      src={featuredArticle.cover_image}
                      alt={featuredArticle.title}
                      className="h-56 w-full flex-shrink-0 md:h-72"
                      imgClassName="h-full w-full object-cover"
                      loading="lazy"
                      width="1600"
                      height="900"
                      sizes="(min-width: 1280px) 720px, (min-width: 768px) 92vw, 100vw"
                      widths={[640, 960, 1280, 1600]}
                      maxWidth={1600}
                      quality="auto:good"
                      fallback={(
                        <DocumentTextIcon
                          className="h-12 w-12"
                          style={{ color: 'var(--color-accent)', opacity: 0.35 }}
                          aria-hidden="true"
                        />
                      )}
                      overlay={(
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--color-bg-secondary) 90%, transparent) 100%)',
                          }}
                        />
                      )}
                    />
                  ) : (
                    <div
                      className="w-full h-56 md:h-72 flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          'linear-gradient(120deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 32%, transparent))',
                      }}
                    >
                      <DocumentTextIcon
                        className="h-12 w-12"
                        style={{ color: 'var(--color-accent)', opacity: 0.35 }}
                        aria-hidden="true"
                      />
                    </div>
                  )}

                  <div className="p-6 md:p-7 flex flex-col gap-4 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          color: 'var(--color-accent-light)',
                          backgroundColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                        }}
                      >
                        <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {blogFeaturedLabel}
                      </span>
                      {featuredArticle.published_at && (
                        <span
                          className="inline-flex items-center gap-1 text-xs"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          <time dateTime={featuredArticle.published_at}>
                            {formatPublicationDate(featuredArticle.published_at)}
                          </time>
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl md:text-3xl font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                      {featuredArticle.title}
                    </h3>

                    <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {getCardExcerpt(
                        featuredArticle.excerpt,
                        210,
                        'Analyse, retour d’expérience et stratégie concrète autour du développement web.'
                      )}
                    </p>

                    {Array.isArray(featuredArticle.tags) && featuredArticle.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {featuredArticle.tags.slice(0, 4).map((tag) => (
                          <Badge key={`${featuredArticle.id}-${tag}`}>{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div
                      className="inline-flex items-center gap-2 text-sm font-medium mt-2"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {blogReadLabel}
                      <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.article>
          )}

          <motion.ul
            className="xl:col-span-2 grid grid-cols-1 gap-6"
            variants={containerVariants}
            initial={canAnimate ? 'hidden' : false}
            whileInView={canAnimate ? 'visible' : false}
            viewport={{ once: animationConfig.sectionOnce }}
          >
            {secondaryArticles.map((article) => (
              <motion.li
                key={article.id}
                variants={itemVariants}
                transition={{ duration: 0.44 * animationConfig.durationScale, ease: animationConfig.easePreset }}
              >
                <Link to={`/blog/${article.slug}`} className="block h-full group" aria-label={`${blogReadLabel} - ${article.title}`}>
                  <Card className="h-full flex flex-col hover:border-[var(--color-accent)] transition-colors overflow-hidden !p-0">
                    {article.cover_image ? (
                      <SmartImage
                        src={article.cover_image}
                        alt={article.title}
                        className="h-40 w-full flex-shrink-0"
                        imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        width="1200"
                        height="675"
                        sizes="(min-width: 1280px) 420px, (min-width: 768px) 50vw, 100vw"
                        widths={[480, 720, 960, 1200]}
                        maxWidth={1200}
                        quality="auto:good"
                        fallback={(
                          <DocumentTextIcon
                            className="h-8 w-8"
                            style={{ color: 'var(--color-accent)', opacity: 0.3 }}
                            aria-hidden="true"
                          />
                        )}
                      />
                    ) : (
                      <div
                        className="w-full h-40 flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                      >
                        <DocumentTextIcon
                          className="h-8 w-8"
                          style={{ color: 'var(--color-accent)', opacity: 0.3 }}
                          aria-hidden="true"
                        />
                      </div>
                    )}

                    <div className="flex flex-col flex-grow p-5">
                      {article.published_at && (
                        <div
                          className="flex items-center gap-1.5 text-xs mb-3"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          <time dateTime={article.published_at}>
                            {formatPublicationDate(article.published_at)}
                          </time>
                        </div>
                      )}

                      <h3
                        className="text-lg font-semibold mb-2 line-clamp-2"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {article.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed mb-4 line-clamp-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {getCardExcerpt(
                          article.excerpt,
                          130,
                          'Un article pratique pour gagner en clarté et en exécution.'
                        )}
                      </p>
                      {Array.isArray(article.tags) && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {article.tags.slice(0, 3).map((tag) => (
                            <Badge key={`${article.id}-${tag}`}>{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <span
                        className="inline-flex items-center gap-1 text-sm font-medium mt-auto"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {blogReadLabel}
                        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Lien vers tous les articles */}
        <div className="text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: 'var(--color-accent-light)' }}
            aria-label={blogViewAllLabel}
          >
            {blogViewAllLabel}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AnimatedSection>
  )
}
