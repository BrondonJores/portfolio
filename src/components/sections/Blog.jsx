/* Section Blog avec apercu des derniers articles */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import AnimatedSceneAsset from '../ui/AnimatedSceneAsset.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { getArticles } from '../../services/articleService.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

export default function Blog() {
  const [articles, setArticles] = useState([])
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'blog'),
    [settings, prefersReducedMotion]
  )
  const canAnimate = animationConfig.canAnimate
  const blogTitle = settings.ui_section_blog_title || 'Blog'
  const blogSubtitle = settings.ui_section_blog_subtitle || 'Mes derniers articles et reflexions'
  const blogViewAllLabel = settings.ui_section_blog_view_all || 'Voir tous les articles'

  useEffect(() => {
    getArticles({ limit: 3 })
      .then((res) => setArticles(res?.data || []))
      .catch(() => setArticles([]))
  }, [])

  /* Section masquee s'il n'y a pas d'articles */
  if (articles.length === 0) return null

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              initial={canAnimate ? { opacity: 0, y: 20 } : false}
              whileInView={canAnimate ? { opacity: 1, y: 0 } : false}
              viewport={{ once: animationConfig.sectionOnce }}
              transition={{
                duration: 0.4 * animationConfig.durationScale,
                delay: i * 0.1 * animationConfig.durationScale,
                ease: animationConfig.easePreset,
              }}
            >
              <Link to={`/blog/${article.slug}`} className="block h-full">
                <Card className="h-full flex flex-col hover:border-[var(--color-accent)] transition-colors overflow-hidden !p-0">
                  {/* Image de couverture */}
                  {article.cover_image ? (
                    <div className="w-full h-40 overflow-hidden flex-shrink-0">
                      <img
                        src={article.cover_image}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                    </div>
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

                  {/* Contenu */}
                  <div className="flex flex-col flex-grow p-5">
                    {!article.cover_image && (
                      <DocumentTextIcon
                        className="h-6 w-6 mb-3 flex-shrink-0"
                        style={{ color: 'var(--color-accent)' }}
                        aria-hidden="true"
                      />
                    )}
                    <h3
                      className="text-base font-bold mb-2 line-clamp-2 flex-grow"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p
                        className="text-sm leading-relaxed mb-3 line-clamp-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {article.excerpt}
                      </p>
                    )}
                    {Array.isArray(article.tags) && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {article.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Lien vers tous les articles */}
        <div className="text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: 'var(--color-accent-light)' }}
          >
            {blogViewAllLabel}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AnimatedSection>
  )
}
