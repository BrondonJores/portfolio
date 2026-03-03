/* Section Blog avec apercu des derniers articles */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { getArticles } from '../../services/articleService.js'

export default function Blog() {
  const [articles, setArticles] = useState([])

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
      className="py-24 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        <SectionTitle
          title="Blog"
          subtitle="Mes derniers articles et reflexions"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
            >
              <Link to={`/blog/${article.slug}`} className="block h-full">
                <Card className="h-full flex flex-col hover:border-[var(--color-accent)] transition-colors">
                  <DocumentTextIcon
                    className="h-6 w-6 mb-3 flex-shrink-0"
                    style={{ color: 'var(--color-accent)' }}
                    aria-hidden="true"
                  />
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
            Voir tous les articles
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AnimatedSection>
  )
}
